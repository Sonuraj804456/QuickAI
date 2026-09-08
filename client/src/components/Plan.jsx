import React, { useState } from "react";
import { Check, Sparkles, Gem, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import axios from "axios";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Plan = () => {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();
  const [loading, setLoading] = useState(false);

  const isPremium = user?.publicMetadata?.plan === "premium";

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    if (isPremium) {
      // User is already premium, open portal if available
      try {
        setLoading(true);
        const token = await getToken();
        const { data } = await axios.post(
          "/api/payment/create-portal-session",
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (data.success && data.url) {
          window.location.href = data.url;
        } else {
          toast.success("You are already on the Premium Plan!");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.post(
        "/api/payment/create-checkout-session",
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || "Failed to initiate payment");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const freeFeatures = [
    "10 free AI generations",
    "AI Article Writer (Short, Medium, Long)",
    "Blog Title Generator (8 categories)",
    "Community Gallery Browse",
    "Standard processing speed"
  ];

  const premiumFeatures = [
    "Unlimited AI Article Generations",
    "Unlimited Blog Title Generator",
    "AI Image Generation (Text-to-Image)",
    "AI Background Removal",
    "AI Object Eraser / Removal",
    "AI Resume Reviewer (PDF Analysis)",
    "Publish creations to Community",
    "Priority AI processing speed"
  ];

  return (
    <div id="pricing" className="max-w-5xl mx-auto z-20 my-28 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Simple, Transparent Pricing
        </div>
        <h2 className="text-slate-800 text-3xl sm:text-5xl font-bold tracking-tight">
          Choose Your Plan
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto mt-4 text-base sm:text-lg">
          Start for free and scale up when you need advanced image editing, resume analysis, and unlimited AI generations.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Free Starter</h3>
              <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                Free Forever
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Essential AI tools to explore text creation and explore the community.
            </p>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-extrabold text-slate-900">$0</span>
              <span className="text-gray-500 text-sm font-medium">/ month</span>
            </div>

            <div className="space-y-3.5 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Included Features:</p>
              {freeFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!isPremium && isSignedIn}
            onClick={() => (!isSignedIn ? openSignIn() : null)}
            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
              !isPremium && isSignedIn
                ? "bg-gray-100 text-gray-500 cursor-default"
                : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
            }`}
          >
            {!isSignedIn ? "Get Started Free" : !isPremium ? "Current Active Plan" : "Downgrade to Free"}
          </button>
        </div>

        {/* Premium Plan */}
        <div className="relative bg-gradient-to-b from-white to-indigo-50/40 rounded-2xl border-2 border-indigo-500 p-8 flex flex-col justify-between shadow-xl shadow-indigo-100/50">
          {/* Badge */}
          <div className="absolute -top-3.5 right-8 bg-gradient-to-r from-[#5044E5] to-[#8E37EB] text-white text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
            <Gem className="w-3 h-3" />
            Most Popular
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Premium Pro
              </h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Full superpower access: image generators, background erasers, and resume reviewers.
            </p>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-extrabold text-slate-900">$19</span>
              <span className="text-gray-500 text-sm font-medium">/ month</span>
            </div>

            <div className="space-y-3.5 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Everything in Free, plus:</p>
              {premiumFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 font-bold" />
                  </div>
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleUpgrade}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#5044E5] to-[#8E37EB] hover:opacity-95 active:scale-[0.99] transition shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            ) : isPremium ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                Manage Subscription
              </>
            ) : (
              <>
                Upgrade to Premium
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Plan;
