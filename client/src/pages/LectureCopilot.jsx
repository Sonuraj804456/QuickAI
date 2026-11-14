import React, { useState, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Video,
  Sparkles,
  Play,
  Copy,
  Check,
  Download,
  BookOpen,
  Headphones,
  Zap,
  HelpCircle,
  MessageSquare,
  Send,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { toast } from "react-hot-toast";
import Markdown from "react-markdown";
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const sampleLectures = [
  {
    title: "Andrej Karpathy: Intro to Large Language Models",
    url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
    desc: "1-hour deep technical lecture on training LLMs, tokenization, pre-training, fine-tuning, and security."
  },
  {
    title: "3Blue1Brown: Neural Networks Chapter 1",
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
    desc: "Visual intuitive foundation of artificial neural networks and multi-layer perceptrons."
  },
  {
    title: "Stanford CS229: Machine Learning by Andrew Ng",
    url: "https://www.youtube.com/watch?v=jGwO_UgTS7I",
    desc: "Foundational university lecture on supervised learning, linear regression, and gradient descent."
  }
];

const modeOptions = [
  {
    id: "study-guide",
    title: "Study Guide & Syllabus",
    icon: BookOpen,
    desc: "Detailed academic notes, theoretical foundations, key formulas, and exam review questions."
  },
  {
    id: "podcast-deepdive",
    title: "Podcast Deep-Dive",
    icon: Headphones,
    desc: "Guest thesis, controversial debates, memorable quotes, and practical action items."
  },
  {
    id: "tldr-brief",
    title: "5-Min TL;DR Brief",
    icon: Zap,
    desc: "High-velocity summary with 7 essential bullet points and core takeaways."
  },
  {
    id: "quiz-mode",
    title: "Active Recall Quiz",
    icon: HelpCircle,
    desc: "Interactive conceptual test with hidden expandable answers for rapid revision."
  }
];

const LectureCopilot = () => {
  const { getToken } = useAuth();

  // Input states
  const [activeTab, setActiveTab] = useState("url"); // 'url' | 'rawText'
  const [videoUrl, setVideoUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState("study-guide");
  const [customFocus, setCustomFocus] = useState("");
  const [loading, setLoading] = useState(false);

  // Result states
  const [metadata, setMetadata] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [transcriptSnippet, setTranscriptSnippet] = useState("");
  const [viewTab, setViewTab] = useState("notes"); // 'notes' | 'chat' | 'transcript'
  const [copied, setCopied] = useState(false);

  // Chat copilot states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef(null);

  // Extract YouTube ID for embed
  const extractId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  const currentVideoId = metadata?.videoId || extractId(videoUrl);

  const handleAnalyze = async (e) => {
    e?.preventDefault();

    if (activeTab === "url" && !videoUrl.trim()) {
      return toast.error("Please enter a YouTube video URL.");
    }
    if (activeTab === "rawText" && rawText.trim().length < 50) {
      return toast.error("Please paste at least 50 characters of lecture or podcast transcript.");
    }

    try {
      setLoading(true);
      setAnalysis("");
      setMetadata(null);
      setChatMessages([]);

      const token = await getToken();
      const { data } = await axios.post(
        "/api/ai/lecture-copilot/analyze",
        {
          url: activeTab === "url" ? videoUrl.trim() : "",
          rawText: activeTab === "rawText" ? rawText.trim() : "",
          mode,
          customInstructions: customFocus.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (data.success) {
        setMetadata(data.metadata);
        setAnalysis(data.analysis);
        setTranscriptSnippet(data.transcriptSnippet || "");
        setViewTab("notes");
        toast.success("Lecture analyzed successfully!");

        // Add welcome message in chat copilot
        setChatMessages([
          {
            role: "assistant",
            content: `Hello! I'm your interactive copilot for **"${data.metadata?.title || "this lecture"}"**. Ask me anything about specific timestamps, theoretical concepts, or speakers' arguments discussed in the video!`
          }
        ]);
      } else {
        toast.error(data.message || "Failed to analyze video.");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNotes = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    toast.success("Markdown notes copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadNotes = () => {
    if (!analysis) return;
    const blob = new Blob([analysis], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(metadata?.title || "lecture-notes").replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Notes downloaded as Markdown!");
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userQ = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatMessages, { role: "user", content: userQ }];
    setChatMessages(newHistory);
    setChatLoading(true);

    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/ai/lecture-copilot/chat",
        {
          transcriptText: transcriptSnippet || analysis,
          videoTitle: metadata?.title || "Lecture",
          question: userQ,
          history: newHistory.slice(-4)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (data.success) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer }
        ]);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        toast.error(data.message || "Chat failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50 text-slate-800">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-6 bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-2">
              <Video className="w-3.5 h-3.5 text-red-200" />
              <span>AI Multimodal Study Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              YouTube Lecture & Podcast Copilot
            </h1>
            <p className="mt-1 text-sm sm:text-base text-rose-100 max-w-2xl">
              Transform 2-hour university lectures, technical podcasts, and keynotes into timestamped dossiers, active recall flashcards, and an interactive Q&A copilot.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-xl text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Automatic YouTube Caption & oEmbed Pipeline</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Configuration */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
          {/* Input Method Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === "url"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Video className="w-4 h-4 text-red-500" />
              YouTube Video URL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rawText")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === "rawText"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              Direct Transcript / Notes
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            {activeTab === "url" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  YouTube Video Link
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                    required
                  />
                  <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Works with all public YouTube videos that have closed captions or auto-generated transcripts.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Paste Transcript or Podcast Notes
                </label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste lecture transcript with timestamps, audio show notes, or speaker text..."
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-y"
                  required
                />
              </div>
            )}

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Copilot Output Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {modeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMode(opt.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        isSelected
                          ? "bg-red-50/70 border-red-500 shadow-sm"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          className={`w-4 h-4 ${
                            isSelected ? "text-red-600" : "text-slate-500"
                          }`}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            isSelected ? "text-red-900" : "text-slate-700"
                          }`}
                        >
                          {opt.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Focus */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Specific Learning Focus (Optional)
              </label>
              <input
                type="text"
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="e.g. Focus on backpropagation formulas, or guest's debate on AGI"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Video & Audio Knowledge...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Copilot Study Dossier</span>
                </>
              )}
            </button>
          </form>

          {/* Sample Presets */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Try Curated Masterclass Lectures:
            </p>
            <div className="space-y-1.5">
              {sampleLectures.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveTab("url");
                    setVideoUrl(item.url);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all flex items-start gap-2.5 group"
                >
                  <Play className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-medium text-slate-800 line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Video Embed, Dossier & Copilot Chat */}
        <div className="lg:col-span-7 space-y-5">
          {/* Embedded Video Player (if video URL/ID available) */}
          {currentVideoId && (
            <div className="bg-black rounded-2xl overflow-hidden shadow-md aspect-video border border-slate-800">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1`}
                title={metadata?.title || "YouTube Video Player"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Video Metadata Card */}
          {metadata && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {metadata.title}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>By {metadata.author}</span>
                    {metadata.videoId && (
                      <a
                        href={`https://www.youtube.com/watch?v=${metadata.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        YouTube Link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                </div>
              </div>

              {analysis && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyNotes}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Copy Markdown"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button
                    onClick={handleDownloadNotes}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Download Markdown file"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Result Content Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50/50">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewTab("notes")}
                  className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewTab === "notes"
                      ? "border-red-600 text-red-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Synthesized Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab("chat")}
                  className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewTab === "chat"
                      ? "border-red-600 text-red-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Ask Copilot Q&A</span>
                  {chatMessages.length > 1 && (
                    <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {chatMessages.length - 1}
                    </span>
                  )}
                </button>
              </div>

              {analysis && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Verified with Gemini 3.8 Intelligence
                </span>
              )}
            </div>

            {/* Tab 1: Dossier View */}
            {viewTab === "notes" && (
              <div className="p-6">
                {analysis ? (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed prose-headings:text-slate-900 prose-headings:font-bold prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-1.5 prose-h2:mt-6 prose-a:text-red-600 prose-blockquote:border-red-500 prose-blockquote:bg-red-50/50 prose-blockquote:p-3 prose-blockquote:rounded-r-lg prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:text-red-700 prose-code:bg-red-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <Markdown>{analysis}</Markdown>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Video className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      No Lecture Analyzed Yet
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Paste a YouTube URL or select one of the curated masterclasses on the left to extract timestamped study notes and active recall flashcards.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Interactive Copilot Chat */}
            {viewTab === "chat" && (
              <div className="flex flex-col h-[520px]">
                {/* Chat Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-red-600 to-indigo-600 text-white rounded-br-xs"
                            : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60"
                        }`}
                      >
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 text-slate-600 rounded-2xl p-3 text-xs flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <span>Searching lecture transcript context...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendChatMessage}
                  className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      analysis
                        ? "Ask anything about this lecture (e.g. 'What was discussed at 14:00?')..."
                        : "Analyze a video first to ask specific questions..."
                    }
                    disabled={!analysis || chatLoading}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none disabled:bg-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || !analysis || chatLoading}
                    className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureCopilot;
