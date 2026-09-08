import React, { useEffect, useState } from "react";
import { Gem, Sparkles, ExternalLink } from "lucide-react";
import { Protect, useAuth, useUser } from "@clerk/clerk-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CreationItem from "../components/CreationItem";
import axios from "axios";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Dashboard = () => {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { getToken } = useAuth();
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const isPremium = user?.publicMetadata?.plan === "premium";

  const getDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get("/api/user/get-user-creations", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setCreations(data.creations);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData();

    // Check payment redirect parameters
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("🎉 Payment successful! Welcome to QuickAI Premium.", {
        duration: 5000
      });
      searchParams.delete("payment");
      searchParams.delete("session_id");
      setSearchParams(searchParams);
    } else if (paymentStatus === "cancel") {
      toast("Payment was cancelled. You can upgrade whenever you are ready.", {
        icon: "ℹ️",
        duration: 4000
      });
      searchParams.delete("payment");
      setSearchParams(searchParams);
    }
  }, []);

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
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
        toast.error(data.message || "Unable to open customer portal");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-scroll p-6">
      <div className="flex justify-start gap-4 flex-wrap">
        {/* Total Creations Card */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-slate-600">
            <p className="text-sm font-medium">Total Creations</p>
            <h2 className="text-2xl font-bold mt-1 text-slate-800">{creations.length}</h2>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3588F2] to-[#0BB0D7] text-white flex justify-center items-center shadow-md shadow-blue-100">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Active Plan Card */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-slate-600">
            <p className="text-sm font-medium">Active Plan</p>
            <h2 className="text-2xl font-bold mt-1 text-slate-800 flex items-center gap-2">
              {isPremium ? (
                <span className="text-indigo-600">Premium</span>
              ) : (
                <Protect plan="premium" fallback="Free">
                  <span className="text-indigo-600">Premium</span>
                </Protect>
              )}
            </h2>

            {isPremium ? (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
              >
                {portalLoading ? "Opening..." : "Manage Billing"}
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/#pricing")}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition"
              >
                Upgrade Plan →
              </button>
            )}
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF61C5] to-[#9E53EE] text-white flex justify-center items-center shadow-md shadow-purple-100">
            <Gem className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-3/4">
          <div className="animate-spin rounded-full h-11 w-11 border-3 border-purple-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-700 font-semibold text-lg">Recent Creations</p>
            <span className="text-xs text-gray-400">{creations.length} total</span>
          </div>
          {creations.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No creations yet. Choose an AI tool from the sidebar to get started!</p>
            </div>
          ) : (
            creations.map((item) => (
              <CreationItem key={item.id} item={item} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
