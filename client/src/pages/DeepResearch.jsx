import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Globe,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Compass,
  ArrowRight,
  Search,
  BookOpen,
  Layers,
  Cpu
} from "lucide-react";
import { toast } from "react-hot-toast";
import Markdown from "react-markdown";
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const sampleTopics = [
  "Competitor analysis of Stripe vs Adyen in 2026",
  "MathCo AI Analyst recruitment, business model, and tech stack",
  "State of Agentic AI frameworks: LangChain vs CrewAI vs AutoGen",
  "Latest breakthroughs in AI code generation and developer productivity"
];

const DeepResearch = () => {
  const { getToken } = useAuth();

  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [sources, setSources] = useState([]);
  const [steps, setSteps] = useState([]);
  const [copied, setCopied] = useState(false);

  const handleLaunchResearch = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      return toast.error("Please enter a research topic or company name.");
    }

    try {
      setLoading(true);
      setReport("");
      setSources([]);
      setSteps([
        `Initializing LangChain Autonomous Agent for "${topic}"...`,
        "Formulating real-time search queries & fact-checking plan..."
      ]);

      const token = await getToken();
      const { data } = await axios.post(
        "/api/ai/deep-research",
        {
          topic: topic.trim(),
          depth
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (data.success) {
        setReport(data.report);
        setSources(data.sources || []);
        setSteps(data.steps || []);
        toast.success("Research report synthesized successfully!");
      } else {
        toast.error(data.message || "Failed to conduct deep research.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Report copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-6 text-slate-700 bg-[#F8FAFC]">
      {/* Left Input & Parameters Form */}
      <div className="w-full lg:w-[420px] flex flex-col gap-4">
        <form
          onSubmit={handleLaunchResearch}
          className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Deep Research Agent</h1>
              <p className="text-xs text-gray-500">Autonomous ReAct Agent powered by LangChain</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Research Objective / Topic
            </label>
            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., In-depth competitor intelligence on Stripe vs Adyen, their 2026 financials, and crypto roadmap..."
              className="w-full p-3 mt-1.5 outline-none text-sm rounded-xl border border-gray-300 focus:border-indigo-500 transition resize-none"
              required
            />
          </div>

          {/* Depth Mode Selector */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Research Depth
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setDepth("standard")}
                className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer flex flex-col items-center text-center ${
                  depth === "standard"
                    ? "bg-indigo-50/80 border-indigo-400 text-indigo-700 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="font-semibold text-slate-800">Standard Brief</span>
                <span className="text-[10px] text-gray-400 mt-0.5">2-Turn Fast Search (~8s)</span>
              </button>

              <button
                type="button"
                onClick={() => setDepth("comprehensive")}
                className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer flex flex-col items-center text-center ${
                  depth === "comprehensive"
                    ? "bg-indigo-50/80 border-indigo-400 text-indigo-700 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="font-semibold text-slate-800">Comprehensive</span>
                <span className="text-[10px] text-gray-400 mt-0.5">3-Turn Deep Scan (~15s)</span>
              </button>
            </div>
          </div>

          {/* Suggested Prompts */}
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Sample Inquiries
            </p>
            <div className="flex flex-col gap-1.5">
              {sampleTopics.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(item)}
                  className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-indigo-50/60 hover:text-indigo-700 text-gray-600 border border-gray-100 transition truncate cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 text-white p-3 mt-5 text-sm font-semibold rounded-xl cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Agent Searching & Reasoning...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4" />
                <span>Launch Autonomous Research</span>
              </>
            )}
          </button>
        </form>

        {/* Live Agent Execution Steps Card */}
        {steps.length > 0 && (
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>LangChain Agent Execution Trace</span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              {steps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                  <p className="leading-snug">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Output Dossier */}
      <div className="flex-1 min-w-[320px] bg-white rounded-2xl border border-gray-200 p-6 flex flex-col min-h-[580px] shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-800">Synthesized Intelligence Dossier</h2>
              <p className="text-xs text-gray-500">Live internet research verified across multi-agent tool loops</p>
            </div>
          </div>

          {report && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Report"}</span>
            </button>
          )}
        </div>

        {!report ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3">
              <Compass className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">No Research Report Generated</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Enter any company, competitor, or technology inquiry on the left. The LangChain agent will autonomously query the live internet, read articles, and construct an executive intelligence briefing.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex-1 flex flex-col">
            {/* Markdown Report Body */}
            <div className="prose prose-sm max-w-none text-slate-700 overflow-y-scroll max-h-[600px] pr-2 leading-relaxed reset-tw">
              <Markdown>{report}</Markdown>
            </div>

            {/* Grounded Sources Cards */}
            {sources && sources.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Verified Citations & Sources ({sources.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-indigo-50/50 hover:border-indigo-200 transition flex items-start justify-between gap-2 group cursor-pointer"
                    >
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition">
                          {src.title}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{src.url}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepResearch;
