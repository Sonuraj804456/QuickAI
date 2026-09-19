import { FileText, Sparkles, Target, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import Markdown from "react-markdown";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const ReviewResume = () => {
  const [input, setInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!input) {
      return toast.error("Please select a PDF resume to upload.");
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("resume", input);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription.trim());
      }

      const { data } = await axios.post("/api/ai/resume-review", formData, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
          "Content-Type": "multipart/form-data"
        }
      });

      if (data.success) {
        setContent(data.content);
        toast.success(
          jobDescription.trim()
            ? "ATS Match Analysis generated!"
            : "Resume Review completed!"
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-6 text-slate-700">
      {/* Left Col: Upload & Configuration Form */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-lg p-5 bg-white rounded-xl border border-gray-200 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#00DA83]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              AI Resume Reviewer & ATS Matcher
            </h1>
            <p className="text-xs text-gray-500">
              Semantic analysis against target job requirements
            </p>
          </div>
        </div>

        {/* Upload Resume */}
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
          1. Upload Resume (PDF)
        </p>
        <input
          onChange={(e) => setInput(e.target.files[0])}
          accept="application/pdf"
          type="file"
          className="w-full p-2.5 px-3 mt-1.5 outline-none text-xs rounded-lg border border-gray-300 text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          required
        />
        <p className="text-[11px] text-gray-400 mt-1">Supports PDF format up to 5MB.</p>

        {/* Target Job Description (RAG feature) */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Target Job Description (Optional)</span>
            </label>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              RAG ATS Match
            </span>
          </div>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={5}
            placeholder="Paste target job requirements, skills, and qualifications here for ATS compatibility scoring and keyword gap analysis..."
            className="w-full p-2.5 px-3 outline-none text-xs rounded-lg border border-gray-300 text-slate-700 focus:border-indigo-500 transition resize-none placeholder:text-gray-400"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            If provided, AI calculates an ATS Match Score and missing keywords for this exact job.
          </p>
        </div>

        {/* Submit Button */}
        <button
          disabled={loading}
          type="submit"
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#00DA83] to-[#009BB3] text-white px-4 py-3 mt-5 text-sm font-semibold rounded-xl hover:opacity-95 active:scale-[0.99] transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              <span>Analyzing Resume...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>
                {jobDescription.trim() ? "Run ATS Match & Review" : "Review Resume"}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Right Col: Analysis Results */}
      <div className="flex-1 min-w-[320px] max-w-2xl p-5 bg-white rounded-xl flex flex-col border border-gray-200 min-h-[480px] max-h-[700px] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#00DA83]" />
            <h2 className="text-base font-bold text-slate-800">
              Evaluation & Recommendations
            </h2>
          </div>
          {content && (
            <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Analysis Ready
            </span>
          )}
        </div>

        {!content ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-xs flex flex-col items-center gap-3 text-gray-400 text-center max-w-xs">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-300" />
              </div>
              <p className="font-medium text-gray-500">No Review Generated Yet</p>
              <p className="text-[11px] text-gray-400">
                Upload your resume and optionally add a target job description to receive an ATS compatibility evaluation.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex-1 overflow-y-scroll text-sm text-slate-700 pr-1">
            <div className="reset-tw">
              <Markdown>{content}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewResume;
