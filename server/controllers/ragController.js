import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import OpenAI from "openai";
import sql from "../configs/db.js";
import { chunkText, getEmbedding } from "../services/ragService.js";

const AI = {
  get chat() {
    return new OpenAI({
      apiKey: process.env.Gemini_API_Key,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    }).chat;
  }
};

/**
 * Upload and index a PDF document into vector embeddings
 */
export const uploadDocument = async (req, res) => {
  let tempFilePath = null;
  try {
    const { userId } = req.auth();
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No document file uploaded." });
    }

    tempFilePath = file.path;

    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "File size exceeds 10MB limit." });
    }

    // Extract text from PDF
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdf(dataBuffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "No readable text found in this PDF. It may be scanned or empty."
      });
    }

    // Chunk text with overlap
    const chunks = chunkText(pdfData.text, 350, 70);

    if (chunks.length === 0) {
      return res.status(400).json({ success: false, message: "Failed to chunk document content." });
    }

    let document = null;
    try {
      // Create document record
      const [newDoc] = await sql`
        INSERT INTO documents (user_id, file_name, file_size, total_chunks)
        VALUES (${userId}, ${file.originalname}, ${file.size}, ${chunks.length})
        RETURNING id, file_name, file_size, total_chunks, created_at;
      `;
      document = newDoc;

      // Generate vector embeddings and store each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await getEmbedding(chunk);

        await sql`
          INSERT INTO document_chunks (document_id, user_id, chunk_index, content, embedding)
          VALUES (${document.id}, ${userId}, ${i + 1}, ${chunk}, ${JSON.stringify(embedding)}::vector);
        `;
      }
    } catch (insertErr) {
      if (document?.id) {
        await sql`DELETE FROM documents WHERE id = ${document.id};`;
      }
      throw insertErr;
    }

    res.json({
      success: true,
      message: `"${file.originalname}" indexed successfully with ${chunks.length} chunks!`,
      document
    });
  } catch (error) {
    console.error("Error uploading document for RAG:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.warn("Failed to delete temp file:", cleanupErr.message);
      }
    }
  }
};

/**
 * Fetch all documents uploaded by the user
 */
export const getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.auth();

    const documents = await sql`
      SELECT id, file_name, file_size, total_chunks, created_at
      FROM documents
      WHERE user_id = ${userId}
      ORDER BY created_at DESC;
    `;

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error("Error fetching user documents:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Query an indexed document using RAG (Vector Search + Gemini Answer Generation)
 */
export const queryDocument = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { documentId, question } = req.body;

    if (!documentId || !question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "documentId and question are required."
      });
    }

    // Ensure document belongs to user
    const [doc] = await sql`
      SELECT id, file_name FROM documents WHERE id = ${documentId} AND user_id = ${userId};
    `;

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found or unauthorized access."
      });
    }

    // 1. Generate Query Embedding (falls back to local vector if API is down)
    const queryVector = await getEmbedding(question);

    // 2. Vector Cosine Similarity Search in PostgreSQL
    const relevantChunks = await sql`
      SELECT id, chunk_index, content,
             1 - (embedding <=> ${JSON.stringify(queryVector)}::vector) AS similarity
      FROM document_chunks
      WHERE user_id = ${userId} AND document_id = ${documentId}
      ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector ASC
      LIMIT 4;
    `;

    if (relevantChunks.length === 0) {
      return res.json({
        success: true,
        answer: "No indexed content found for this document.",
        sources: []
      });
    }

    // 3. Construct Augmented Context
    const contextText = relevantChunks
      .map((c) => `[Source Excerpt #${c.chunk_index}]:\n${c.content}`)
      .join("\n\n---\n\n");

    const prompt = `You are QuickAI Document Assistant, an expert research and analysis copilot.
Your task is to answer the user's question with high precision, depth, and clean formatting based on the provided document excerpts.

Instructions:
- Provide a direct, well-structured response using Markdown (use bold text, categorized bullet points, and numbered steps where relevant).
- If the question asks for skills, requirements, roles, or summaries, extract and categorize them comprehensively from the document context.
- Ground your answer strictly in the context excerpts below. Do not make up facts not supported by the document.
- Cite relevant source excerpts (e.g., [Source Excerpt #1]) to support key points.

Document: "${doc.file_name}"
Context Excerpts:
${contextText}

User Question:
${question}

Detailed Answer:`;

    // 4. Generate Answer via Gemini
    let answer = "";
    try {
      let completion;
      try {
        completion = await AI.chat.completions.create({
          model: "gemini-3.6-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        });
      } catch (err36) {
        console.warn("gemini-3.6-flash failed, trying gemini-3-flash-preview:", err36.message);
        completion = await AI.chat.completions.create({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        });
      }
      answer = completion.choices[0]?.message?.content || "No response generated.";
    } catch (aiErr) {
      console.warn("Gemini chat completion failed, returning retrieved vector chunks:", aiErr.message);
      answer = `### 📄 Retrieved Document Excerpt (Vector Search Match):\n\n${relevantChunks[0]?.content}\n\n---\n*Note: To enable AI natural-language answers and synthesis, please add your fresh free key to \`Gemini_API_Key\` in \`server/.env\` from [Google AI Studio](https://aistudio.google.com/app/apikey).*`;
    }

    res.json({
      success: true,
      answer,
      sources: relevantChunks.map((c) => ({
        chunkIndex: c.chunk_index,
        similarity: (Number(c.similarity) * 100).toFixed(1),
        excerpt: c.content.slice(0, 200) + "..."
      }))
    });
  } catch (error) {
    console.error("Error querying document with RAG:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a document and cascade delete its chunks
 */
export const deleteDocument = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;

    const [deleted] = await sql`
      DELETE FROM documents
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, file_name;
    `;

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    res.json({
      success: true,
      message: `Document "${deleted.file_name}" deleted successfully.`
    });
  } catch (error) {
    console.error("Error deleting document:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
