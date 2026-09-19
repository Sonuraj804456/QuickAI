import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
  Layers,
  ChevronDown,
  ChevronUp,
  BookOpen
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import Markdown from "react-markdown";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const ChatPdf = () => {
  const { getToken } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, asking]);

  // Fetch documents on load
  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const token = await getToken();
      const { data } = await axios.get("/api/rag/documents", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setDocuments(data.documents);
        if (data.documents.length > 0 && !activeDoc) {
          setActiveDoc(data.documents[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // When active doc changes, reset conversation with a greeting
  useEffect(() => {
    if (activeDoc) {
      setMessages([
        {
          role: "assistant",
          content: `Hello! I have indexed **"${activeDoc.file_name}"** into ${activeDoc.total_chunks} semantic vector chunks. Ask me anything about its contents!`,
          sources: []
        }
      ]);
    }
  }, [activeDoc]);

  // Handle PDF Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      return toast.error("Please select a valid PDF file.");
    }

    if (file.size > 10 * 1024 * 1024) {
      return toast.error("File exceeds 10MB maximum limit.");
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const token = await getToken();
      const { data } = await axios.post("/api/rag/upload-document", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      if (data.success) {
        toast.success(data.message);
        await fetchDocuments();
        setActiveDoc(data.document);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Handle Document Delete
  const handleDeleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document and its embeddings?")) return;

    try {
      const token = await getToken();
      const { data } = await axios.delete(`/api/rag/document/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success("Document deleted");
        const remaining = documents.filter((d) => d.id !== id);
        setDocuments(remaining);
        if (activeDoc?.id === id) {
          setActiveDoc(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // Handle Question Query (RAG)
  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || asking) return;

    if (!activeDoc) {
      return toast.error("Please upload or select a document first.");
    }

    const userQuestion = inputQuery.trim();
    setInputQuery("");

    // Add user message
    const newMessages = [...messages, { role: "user", content: userQuestion }];
    setMessages(newMessages);

    try {
      setAsking(true);
      const token = await getToken();
      const { data } = await axios.post(
        "/api/rag/query",
        {
          documentId: activeDoc.id,
          question: userQuestion
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (data.success) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: data.answer,
            sources: data.sources || []
          }
        ]);
      } else {
        toast.error(data.message);
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `⚠️ **Error:** ${data.message}`
          }
        ]);
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      toast.error(errMsg);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `⚠️ **Query Error:** ${errMsg}\n\n*Tip: If you haven't restarted the backend server yet, please restart it in your terminal (\`Ctrl+C\` then \`npm run server\` in \`server/\`).*`
        }
      ]);
    } finally {
      setAsking(false);
    }
  };

  const toggleSource = (index) => {
    setExpandedSources((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#F4F7FB] overflow-hidden">
      {/* Left Sidebar: Documents & Upload */}
      <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-800 text-base">RAG Knowledge Base</h2>
          </div>

          {/* Upload Button */}
          <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-sm font-medium cursor-pointer transition">
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? "Indexing Vectors..." : "Upload New PDF"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
          <p className="text-[11px] text-gray-400 text-center mt-1.5">Max 10MB PDF documents</p>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-scroll p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-2 mb-1">
            Indexed Documents ({documents.length})
          </p>

          {loadingDocs ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 border border-dashed rounded-lg">
              No documents yet. Upload a PDF to start chatting!
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDoc(doc)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between border ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-400 shadow-xs"
                      : "bg-white border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Layers className="w-2.5 h-2.5" />
                          {doc.total_chunks} chunks
                        </span>
                        <span>•</span>
                        <span>{(doc.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Interactive Q&A Chat */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {activeDoc ? activeDoc.file_name : "Chat with PDF"}
                {activeDoc && (
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    pgvector active
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500">
                {activeDoc
                  ? `Retrieval-Augmented Generation across ${activeDoc.total_chunks} embeddings`
                  : "Upload or choose a document from the left to begin"}
              </p>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-scroll p-6 space-y-4">
          {!activeDoc ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-700">No Document Selected</h3>
              <p className="text-xs max-w-sm mt-1 text-gray-500">
                Upload a document or select one from the left sidebar to ask questions grounded in your document.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-xs shadow-xs"
                      : "bg-white text-slate-800 border border-gray-200 rounded-tl-xs shadow-xs"
                  }`}
                >
                  <div className={msg.role === "user" ? "text-white" : "reset-tw"}>
                    <Markdown>{msg.content}</Markdown>
                  </div>

                  {/* Retrieved Sources Section */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => toggleSource(idx)}
                        className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition cursor-pointer"
                      >
                        <Layers className="w-3 h-3" />
                        <span>{msg.sources.length} Grounded Context Sources</span>
                        {expandedSources[idx] ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {expandedSources[idx] && (
                        <div className="mt-2 space-y-2">
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-slate-600"
                            >
                              <div className="flex items-center justify-between font-semibold text-[10px] text-gray-500 mb-1">
                                <span>Chunk #{src.chunkIndex}</span>
                                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {src.similarity}% similarity
                                </span>
                              </div>
                              <p className="text-[11px] italic text-slate-600 line-clamp-3">
                                "{src.excerpt}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {asking && (
            <div className="flex gap-3 max-w-2xl mr-auto">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-gray-200 text-xs text-gray-500 flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></span>
                Searching vectors and synthesizing answer...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="bg-white border-t border-gray-200 p-4 shrink-0">
          <form onSubmit={handleSendQuery} className="max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={!activeDoc || asking}
              placeholder={
                activeDoc
                  ? `Ask anything about "${activeDoc.file_name}"...`
                  : "Upload a document above to ask questions..."
              }
              className="flex-1 p-3 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:border-indigo-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!activeDoc || !inputQuery.trim() || asking}
              className="p-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPdf;
