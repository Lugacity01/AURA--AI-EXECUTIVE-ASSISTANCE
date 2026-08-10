"use client";

import { useState, useEffect } from "react";
import { Plus, Megaphone, Calendar, Users, Activity, ExternalLink, Trash2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    fetchCampaigns();
    
    // Auto-refresh the campaigns list every 10 seconds to update status (e.g., SENDING -> COMPLETED)
    const interval = setInterval(() => {
      fetchCampaigns(true); // pass a silent flag to avoid loading spinners on background refresh
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCampaigns(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setCampaignToDelete(id);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!campaignToDelete) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignToDelete));
        showToast("Campaign deleted successfully");
      } else {
        showToast("Failed to delete campaign");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteModalOpen(false);
      setCampaignToDelete(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#0F0F12] rounded-xl border border-white/[0.05]">
      {/* Toast Notice */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl bg-indigo-950/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <h1 className="text-xl md:text-2xl font-medium text-white flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-indigo-500" />
          Campaigns
        </h1>
        <Link 
          href="/dashboard/campaigns/new"
          className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </Link>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8">
        {/* Quick Analytics Row */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8 pb-4 sm:pb-0 snap-x">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 min-w-[240px] sm:min-w-0 snap-center shrink-0">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Active Campaigns</p>
              <h3 className="text-2xl font-semibold text-white">
                {campaigns.filter(c => c.status === "SENDING" || c.status === "DRAFT").length}
              </h3>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 min-w-[240px] sm:min-w-0 snap-center shrink-0">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Total Reached</p>
              <h3 className="text-2xl font-semibold text-white">
                {campaigns.reduce((sum, c) => sum + (c.emailsSent || 0), 0)}
              </h3>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 min-w-[240px] sm:min-w-0 snap-center shrink-0">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Avg Open Rate</p>
              <h3 className="text-2xl font-semibold text-white">0%</h3>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 min-w-[240px] sm:min-w-0 snap-center shrink-0">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Scheduled</p>
              <h3 className="text-2xl font-semibold text-white">
                {campaigns.filter(c => c.status === "SCHEDULED").length}
              </h3>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <h2 className="text-lg font-medium text-white mb-4">Recent Campaigns</h2>
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-20 bg-white/5 rounded-xl border border-white/10" />
            <div className="h-20 bg-white/5 rounded-xl border border-white/10" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Megaphone className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No campaigns yet</h3>
            <p className="text-zinc-400 max-w-md mb-8">
              Start engaging your contacts at scale. AI Campaigns will automatically personalize every message using your relationship context.
            </p>
            <Link 
              href="/dashboard/campaigns/new"
              className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Start your first campaign
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-zinc-400">
                <thead className="bg-white/5 border-b border-white/10 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Campaign</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Recipients</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{campaign.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-white/10 text-white px-2.5 py-1 rounded-md text-xs">
                        {campaign.campaignType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${campaign.status === 'COMPLETED' ? 'bg-emerald-500' : campaign.status === 'SENDING' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`} />
                        {campaign.status === 'SENDING' && campaign.totalRecipients > 0 ? 
                          `SENDING (${Math.round((((campaign.emailsSent || 0) + (campaign.failedRecipients || 0)) / campaign.totalRecipients) * 100)}%)` 
                          : campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {campaign.totalRecipients || 0}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      <Link 
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="text-indigo-400 hover:text-indigo-300 transition text-xs font-medium uppercase tracking-wider flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button 
                        onClick={() => confirmDelete(campaign.id)}
                        className="text-zinc-500 hover:text-red-400 transition"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-medium text-white mb-2">Delete Campaign</h3>
            <p className="text-zinc-400 mb-6">Are you sure you want to delete this campaign? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setCampaignToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-full transition"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-full text-sm font-medium hover:bg-red-500/20 transition"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
