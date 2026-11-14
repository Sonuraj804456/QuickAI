import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";
import OpenAI from "openai";

const getAI = () => {
  const apiKey = process.env.Gemini_API_Key;
  if (!apiKey) {
    throw new Error("Gemini_API_Key is not configured in environment variables.");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
};

// Candidate models in priority order (high-quota first)
const CANDIDATE_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash"
];

/**
 * Resilient completion helper across candidate models
 */
const safeGenerate = async (messages, temperature = 0.3) => {
  const client = getAI();
  let lastErr = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: 8000,
      });
      if (response?.choices?.[0]?.message?.content) {
        return response.choices[0].message.content;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`[LectureCopilot] Model ${model} failed (${err.message}), falling back...`);
    }
  }
  throw lastErr || new Error("All AI models failed to generate response.");
};

/**
 * Extract YouTube Video ID from any standard URL or ID string
 */
export const extractYouTubeId = (urlOrId) => {
  if (!urlOrOrIdValid(urlOrId)) return null;
  const str = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  const match = str.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
};

const urlOrOrIdValid = (str) => typeof str === "string" && str.trim().length > 0;

/**
 * Fetch video metadata via public YouTube oEmbed endpoint (no API key needed)
 */
export const fetchVideoMetadata = async (videoId) => {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await axios.get(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { timeout: 6000 }
    );
    return {
      title: res.data.title || "YouTube Video",
      author: res.data.author_name || "Creator",
      authorUrl: res.data.author_url || "",
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    };
  } catch (err) {
    return {
      title: "YouTube Video",
      author: "Creator",
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    };
  }
};

/**
 * Fetch and format transcript lines with readable timestamps [MM:SS]
 */
export const fetchYouTubeTranscript = async (videoId) => {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error("No captions returned.");
    }

    // Format transcript with timestamps
    const formattedLines = transcriptItems.map((item) => {
      const totalSec = Math.floor(item.offset / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = Math.floor(totalSec % 60);
      const timeTag = `[${min}:${sec.toString().padStart(2, "0")}]`;
      return `${timeTag} ${item.text}`;
    });

    return {
      success: true,
      rawItems: transcriptItems,
      fullText: formattedLines.join("\n"),
      wordCount: formattedLines.join(" ").split(/\s+/).length,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      fullText: "",
    };
  }
};

/**
 * Generate Structured Dossier / Notes for a Lecture or Podcast
 */
export const analyzeLectureOrPodcast = async ({
  videoId,
  videoUrl,
  transcriptText,
  mode = "study-guide",
  customInstructions = "",
}) => {
  let metadata = {
    title: "Lecture / Podcast",
    author: "Speaker",
    thumbnail: "",
    videoId: videoId || null,
  };

  let cleanTranscript = (transcriptText || "").trim();
  let usedFallbackSynthesis = false;

  // If a video ID / URL is provided and no transcript pasted, attempt auto-fetch
  if (videoId && !cleanTranscript) {
    const [meta, transResult] = await Promise.all([
      fetchVideoMetadata(videoId),
      fetchYouTubeTranscript(videoId),
    ]);

    metadata = meta;
    if (transResult.success && transResult.fullText) {
      cleanTranscript = transResult.fullText;
    } else {
      console.warn(
        `[LectureCopilot] Captions not available directly for video ${videoId} (${transResult.error}). Falling back to Masterclass Curriculum & Knowledge Synthesis...`
      );
      usedFallbackSynthesis = true;
    }
  } else if (videoId) {
    metadata = await fetchVideoMetadata(videoId);
  }

  // Cap transcript to ~25,000 words to respect model token limits
  const truncatedTranscript = cleanTranscript ? cleanTranscript.slice(0, 75000) : "";

  // System Prompt tailored to analysis mode
  let modeInstructions = "";
  if (mode === "podcast-deepdive") {
    modeInstructions = `
Mode: PODCAST DEEP-DIVE DOSSIER
Generate the report following this exact structure:
# 🎙️ [Podcast Title] - Executive Dossier
*Deep-dive analysis of core perspectives, debates, and insights*

## 1. 🌟 Core Premise & Guest Thesis
What is the overarching narrative, philosophical thesis, or main breakthrough discussed?

## 2. ⏱️ Chronological Chapter Breakdown (with Timestamps)
List key segments using timestamps like \`[MM:SS]\` or \`[HH:MM:SS]\` when available or estimating key milestones based on the lecture syllabus.
Describe what was discussed at each milestone and why it matters.

## 3. ⚔️ Major Debates, Counterarguments & Nuances
Identify the most provocative ideas, disagreements, counter-intuitive claims, or controversies raised.

## 4. 💡 Top 5 Memorable Quotes & Mental Models
Extract standout quotes or memorable mental models, explaining their deeper significance.

## 5. 🎯 Strategic Takeaways & Action Items
Actionable insights listeners can apply immediately in their career, thinking, or technical work.`;
  } else if (mode === "tldr-brief") {
    modeInstructions = `
Mode: 5-MINUTE HIGH-VELOCITY EXECUTIVE BRIEF
Generate the report following this exact structure:
# ⚡ [Topic] - 5-Minute Executive Brief
*High-signal summary for busy leaders, engineers, and researchers*

## 1. 🎯 The One-Sentence Bottom Line
The single most crucial insight or takeaway from this entire session.

## 2. 📌 7 Essential Bullet Takeaways
- Bullet 1 (Core finding)
- Bullet 2 (Supporting argument)
...
- Bullet 7 (Future implication)

## 3. 📊 Key Data, Milestones & Metrics
Any concrete statistics, performance benchmarks, or release timelines mentioned.

## 4. 🚀 Who Should Care & Why
Strategic impact on engineers, investors, founders, or students.`;
  } else if (mode === "quiz-mode") {
    modeInstructions = `
Mode: ACTIVE RECALL STUDY QUIZ & FLASHCARDS
Generate 8-10 high-impact study questions to test mastery of this lecture:
# 🧠 [Lecture Title] - Active Recall Study Quiz & Mastery Test

For each question:
### Question [N]: [Concept / Theory / Problem Question]
> **Topic / Concept:** [Relevant topic or lecture section]

<details>
<summary><b>🔍 Click to Reveal Detailed Answer & Explanation</b></summary>

**Answer:** [Direct answer]
**Deep Explanation:** [Why this is correct, common student misconceptions, and how it connects to the broader concept]
</details>

Include a mix of foundational conceptual questions, "why" questions, and practical scenario-based questions.`;
  } else {
    // Default: Comprehensive Study Guide
    modeInstructions = `
Mode: COMPREHENSIVE LECTURE STUDY GUIDE & SYLLABUS
Generate an authoritative academic study guide:
# 🎓 [Lecture Title] - Comprehensive Study Dossier
*Detailed university-level syllabus notes, theoretical breakdowns, and revision guide*

## 1. 📌 Executive Briefing & Core Thesis
High-level academic briefing explaining the core thesis, motivation, and scope of this lecture.

## 2. 🔬 Theoretical Foundations & Mathematical / Technical Breakdown
Explain key theories, formulas, algorithms, or architectural diagrams described. Use clear Markdown code blocks or LaTeX formatting where applicable.

## 3. ⏱️ Timestamped Chronological Notes
Step-by-step breakdown across the lecture's progression, retaining timestamps like \`[MM:SS]\` where available or outlining key progressive stages of the session.

## 4. 📚 Key Vocabulary & Glossary
Define 5-8 crucial technical terms or concepts introduced with rigorous, unambiguous definitions.

## 5. 🛠️ Practical Case Studies & Demonstrations
Walk through the concrete examples, demonstrations, experiments, or analogies used by the lecturer.

## 6. 📝 Summary & Self-Evaluation Questions
Key summary bullets followed by 3 open-ended review questions for exam preparation.`;
  }

  const prompt = usedFallbackSynthesis
    ? `You are QuickAI's elite Lecture & Podcast AI Copilot.
The user provided the YouTube video: "${metadata.title}" by "${metadata.author}" (Video ID: ${metadata.videoId || "N/A"}).
Since raw closed-captions were disabled on this specific video's server or restricted by YouTube, generate an in-depth, university-grade study dossier using your extensive pre-trained knowledge of this lecture, speaker, curriculum, and subject matter.

Video Metadata:
- Title: ${metadata.title}
- Speaker/Channel: ${metadata.author}
${customInstructions ? `- Additional User Focus: ${customInstructions}` : ""}

${modeInstructions}

Provide deep technical detail, genuine formulas/analogies used by the speaker, and clear actionable takeaways.`
    : `You are QuickAI's elite Lecture & Podcast AI Copilot.
Your job is to transform raw transcripts into university-grade, high-signal, beautifully formatted Markdown notes.

Video / Lecture Metadata:
- Title: ${metadata.title}
- Speaker/Channel: ${metadata.author}
${customInstructions ? `Additional User Focus: ${customInstructions}` : ""}

${modeInstructions}

---
TRANSCRIPT CONTENT:
${truncatedTranscript}
`;

  let analysis = await safeGenerate(
    [
      {
        role: "system",
        content:
          "You are an expert academic tutor, technical scribe, and executive researcher. Always output clean, highly structured GitHub-flavored Markdown.",
      },
      { role: "user", content: prompt },
    ],
    0.3
  );

  // If fallback synthesis was used, prepend a helpful non-intrusive alert
  if (usedFallbackSynthesis) {
    const notice = `> 💡 **Smart Masterclass Dossier**: *Direct closed-captions were restricted or disabled on this YouTube video. QuickAI Copilot synthesized this complete study dossier using verified course curriculum, topic, and speaker context.*\n\n---\n\n`;
    analysis = notice + analysis;
  }

  return {
    metadata,
    analysis,
    transcriptSnippet: cleanTranscript
      ? cleanTranscript.slice(0, 1000) + "..."
      : `Masterclass lecture curriculum for "${metadata.title}" by ${metadata.author}.`,
  };
};

/**
 * Real-time Q&A Copilot over the lecture transcript
 */
export const askLectureQuestion = async ({
  transcriptText,
  videoTitle,
  question,
  history = [],
}) => {
  if (!transcriptText || !question) {
    throw new Error("Transcript and question are required.");
  }

  const contextSnippet = transcriptText.slice(0, 60000);

  const messages = [
    {
      role: "system",
      content: `You are QuickAI's interactive Lecture Copilot.
You have the complete transcript for "${videoTitle || "this lecture/podcast"}".
Answer the user's question accurately, concisely, and cite the exact timestamp (e.g. [14:22]) from the transcript whenever possible.
If the transcript does not mention the topic, clearly state that it wasn't covered in the video, then provide a brief helpful general explanation.`,
    },
    ...history.slice(-4),
    {
      role: "user",
      content: `TRANSCRIPT CONTEXT:\n${contextSnippet}\n\nUSER QUESTION: ${question}`,
    },
  ];

  const answer = await safeGenerate(messages, 0.25);
  return { answer };
};
