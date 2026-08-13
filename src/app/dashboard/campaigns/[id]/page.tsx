"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Megaphone, CheckCircle2, Clock, Users, Activity, ExternalLink, Play, Plus, ChevronRight, X, AlertCircle, UserPlus, Pencil, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CampaignDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Follow-up modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [followUpType, setFollowUpType] = useState("REMINDER");
  const [recipientFilter, setRecipientFilter] = useState("PENDING_RESPONSE");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeMeetLink, setIncludeMeetLink] = useState(true);
  
  // Preview State
  const [hasPreview, setHasPreview] = useState(false);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isIntelligentMode, setIsIntelligentMode] = useState(true);

  // Add Recipients Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [useAiForNew, setUseAiForNew] = useState(true);
  const [isAddingRecipients, setIsAddingRecipients] = useState(false);

  const [previewRecipient, setPreviewRecipient] = useState<any>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isSavingRecipient, setIsSavingRecipient] = useState(false);
  const [recipientToRemove, setRecipientToRemove] = useState<string | null>(null);
  const [isRemovingRecipient, setIsRemovingRecipient] = useState(false);

  // Master Draft Editor State
  const [isMasterDraftModalOpen, setIsMasterDraftModalOpen] = useState(false);
  const [masterDraftText, setMasterDraftText] = useState("");
  const [masterDraftUseAi, setMasterDraftUseAi] = useState(true);
  const [isSavingMasterDraft, setIsSavingMasterDraft] = useState(false);

  // Stuck state tracking
  const lastProgressRef = useRef<number>(-1);
  const stuckCountRef = useRef<number>(0);
  const hasShownStuckToastRef = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fetchCampaignDetails = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const [campRes, fupRes] = await Promise.all([
        fetch(`/api/campaigns/${id}?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/campaigns/${id}/follow-ups?t=${timestamp}`, { cache: 'no-store' })
      ]);
      
      if (!campRes.ok) throw new Error("Failed to fetch campaign");
      
      const data = await campRes.json();
      
      // Check for stalled progress
      if (data.status === 'SENDING' && data.totalRecipients > 0) {
        const currentProgress = (data.emailsSent || 0) + (data.failedRecipients || 0);
        
        if (lastProgressRef.current !== -1 && currentProgress === lastProgressRef.current && currentProgress < data.totalRecipients) {
          stuckCountRef.current += 1;
          // If stuck for ~20 seconds (10 polls of 2s each)
          if (stuckCountRef.current >= 10 && !hasShownStuckToastRef.current) {
            showToast("The sending process seems stalled. Try clicking 'Force Resume' to restart it.");
            hasShownStuckToastRef.current = true;
          }
        } else if (currentProgress !== lastProgressRef.current) {
          // Progress moved! Reset counters
          stuckCountRef.current = 0;
          hasShownStuckToastRef.current = false;
          lastProgressRef.current = currentProgress;
        }
      } else {
        // Not sending, reset tracking
        lastProgressRef.current = -1;
        stuckCountRef.current = 0;
        hasShownStuckToastRef.current = false;
      }
      
      setCampaign(data);

      if (fupRes.ok) {
        const followUpsData = await fupRes.json();
        setFollowUps(followUpsData);
      }
      
      const contactsRes = await fetch("/api/contacts?limit=100", { cache: 'no-store' });
      if (contactsRes.ok) {
        const cData = await contactsRes.json();
        setContacts(cData.contacts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaignDetails();
  }, [fetchCampaignDetails]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (campaign?.status === 'SENDING' || campaign?.status === 'GENERATING') {
      interval = setInterval(() => {
        fetchCampaignDetails();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [campaign?.status, fetchCampaignDetails]);

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/follow-up/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpType,
          additionalInstructions: instructions
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate preview");
      }

      const { subject, body } = await res.json();
      setPreviewSubject(subject);
      setPreviewBody(body);
      setHasPreview(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFollowUp = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpType,
          recipientFilter,
          additionalInstructions: instructions,
          masterSubject: (!isIntelligentMode && hasPreview) ? previewSubject : undefined,
          masterBody: (!isIntelligentMode && hasPreview) ? previewBody : undefined,
          includeMeetLink: campaign.campaignType === 'MEETING' ? includeMeetLink : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create follow-up");
      }

      // Automatically close modal and refresh
      setIsModalOpen(false);
      setInstructions("");
      setHasPreview(false);
      setIsGenerating(false);
      
      // Refresh the timeline data to show the generating/scheduled follow-up
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const handleSaveMasterDraft = async () => {
    if (!masterDraftText.trim()) return;
    setIsSavingMasterDraft(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: masterDraftText,
          useAi: masterDraftUseAi
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate campaign");
      }
      
      showToast("Draft updated and regeneration started!");
      setIsMasterDraftModalOpen(false);
      fetchCampaignDetails();
    } catch (err: any) {
      showToast("Error updating draft: " + err.message);
    } finally {
      setIsSavingMasterDraft(false);
    }
  };

  const handleSendNow = async () => {
    setIsSending(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // empty body means immediate send
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start campaign");
      }
      showToast("Campaign has been dispatched to the queue!");
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.message);
      showToast("Error starting campaign");
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsSending(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${id}/retry`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to retry campaign");
      }
      showToast("Failed recipients have been requeued!");
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.message);
      showToast("Error retrying failed recipients");
    } finally {
      setIsSending(false);
    }
  };

  const handleForceResume = async () => {
    setIsSending(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${id}/resume`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resume campaign");
      }
      showToast("Background process restarted!");
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.message);
      showToast("Error resuming campaign");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveRecipient = async () => {
    if (!previewRecipient) return;
    setIsSavingRecipient(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/recipients/${previewRecipient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizedSubject: editSubject,
          personalizedBody: editBody,
          approvalStatus: previewRecipient.approvalStatus,
        })
      });
      if (!res.ok) throw new Error("Failed to save draft");
      showToast("Draft updated successfully!");
      setPreviewRecipient(null);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.message);
      showToast("Error saving draft");
    } finally {
      setIsSavingRecipient(false);
    }
  };

  const handleAddRecipients = async () => {
    if (selectedContactIds.length === 0) return;
    setIsAddingRecipients(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/recipients/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContactIds,
          useAi: useAiForNew
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add recipients");
      }
      const data = await res.json();
      showToast(data.message);
      setIsAddModalOpen(false);
      setSelectedContactIds([]);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.message);
      showToast("Error adding recipients");
    } finally {
      setIsAddingRecipients(false);
    }
  };

  const confirmRemoveRecipient = async () => {
    if (!recipientToRemove) return;
    setIsRemovingRecipient(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/recipients/${recipientToRemove}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to remove recipient");
      showToast("Recipient removed.");
      setRecipientToRemove(null);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.message);
      showToast("Error removing recipient");
    } finally {
      setIsRemovingRecipient(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#0F0F12] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col h-full bg-[#0F0F12] items-center justify-center text-zinc-400">
        Campaign not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0F0F12]">
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
      <div className="border-b border-white/10 px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
        <div className="flex items-start md:items-center gap-4">
          <Link href="/dashboard/campaigns" className="text-zinc-400 hover:text-white transition mt-1 md:mt-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-medium text-white flex flex-wrap items-center gap-2 md:gap-3">
              {campaign.title}
              <span className={`text-xs px-2.5 py-1 rounded-md uppercase tracking-wider font-semibold ${
                campaign.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                campaign.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-400' :
                campaign.status === 'SENDING' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {campaign.status === 'SENDING' && campaign.totalRecipients > 0 ? 
                  `SENDING (${Math.round((((campaign.emailsSent || 0) + (campaign.failedRecipients || 0)) / campaign.totalRecipients) * 100)}%)` 
                  : campaign.status}
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Created on {new Date(campaign.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        {campaign.status === 'DRAFT' && (
          <button 
            onClick={() => router.push(`/dashboard/campaigns/new?id=${campaign.id}`)}
            className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Play className="w-4 h-4" /> Continue Editing
          </button>
        )}
        {campaign.status === 'COMPLETED' && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {campaign.recipients?.some((r: any) => r.sendStatus === 'FAILED') && (
              <button 
                onClick={handleRetryFailed}
                disabled={isSending}
                className="bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-2 rounded-full text-sm font-medium hover:bg-red-500/20 transition flex items-center gap-2 shadow-lg shadow-red-500/10 disabled:opacity-50"
              >
                {isSending ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>}
                Retry Failed
              </button>
            )}
            {(!campaign.recipients?.length || campaign.recipients.some((r: any) => r.sendStatus !== 'SENT')) && (
              <button 
                onClick={() => {
                  setMasterDraftText(campaign?.template?.basePrompt || campaign?.description || "");
                  setIsMasterDraftModalOpen(true);
                }}
                className="bg-white/5 border border-white/10 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
              >
                <Pencil className="w-4 h-4 text-indigo-400" /> Edit Master Draft
              </button>
            )}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white/5 border border-white/10 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" /> Add Recipients
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Create Follow-up
            </button>
          </div>
        )}
        {campaign.status === 'SENDING' && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleForceResume}
              disabled={isSending}
              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-5 py-2 rounded-full text-sm font-medium hover:bg-amber-500/20 transition flex items-center gap-2 shadow-lg shadow-amber-500/10 disabled:opacity-50"
            >
              {isSending ? <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
              Force Resume
            </button>
          </div>
        )}
        {campaign.status === 'READY' && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {(!campaign.recipients?.length || campaign.recipients.some((r: any) => r.sendStatus !== 'SENT')) && (
              <button 
                onClick={() => {
                  setMasterDraftText(campaign?.template?.basePrompt || campaign?.description || "");
                  setIsMasterDraftModalOpen(true);
                }}
                className="bg-white/5 border border-white/10 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
              >
                <Pencil className="w-4 h-4 text-indigo-400" /> Edit Master Draft
              </button>
            )}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white/5 border border-white/10 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" /> Add Recipients
            </button>
            <button 
              onClick={handleSendNow}
              disabled={isSending}
              className="bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
              {isSending ? "Starting..." : "Send Campaign Now"}
            </button>
          </div>
        )}
      </div>

      <div className="p-4 md:p-8 flex flex-col gap-8">
        
        {/* Campaign Timeline */}
        {followUps.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-white mb-4">Campaign Timeline</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden p-6">
              <div className="flex flex-col gap-4">
                
                {/* Original Campaign */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      Initial Campaign 
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider">Completed</span>
                    </h4>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      {new Date(campaign.createdAt).toLocaleDateString()} • {campaign.totalRecipients} recipients
                    </p>
                  </div>
                </div>

                {/* Follow-ups */}
                {followUps.map((fu, idx) => (
                  <div key={fu.id} className="flex items-center gap-4 relative">
                    {/* Line connecting */}
                    <div className="absolute left-4 top-[-24px] bottom-6 w-px bg-white/10" />
                    
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 flex items-center justify-center shrink-0 z-10">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    <div className="flex-1 bg-white/5 hover:bg-white/[0.07] transition cursor-pointer border border-white/10 rounded-xl p-4 flex items-center justify-between" onClick={() => router.push(`/dashboard/campaigns/${fu.id}`)}>
                      <div>
                        <h4 className="text-white font-medium flex items-center gap-2">
                          {fu.title}
                          <span className={`text-xs px-2 py-0.5 rounded uppercase tracking-wider ${
                            fu.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                            fu.status === 'DRAFT' || fu.status === 'READY' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>{fu.status}</span>
                        </h4>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          {fu.followUpType} • {fu.totalRecipients} recipients
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics row */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 pb-4 sm:pb-0 snap-x">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 min-w-[200px] sm:min-w-0 snap-center shrink-0">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Total Recipients</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.totalRecipients || 0}</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 min-w-[200px] sm:min-w-0 snap-center shrink-0">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Emails Sent</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.emailsSent || 0}</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 min-w-[200px] sm:min-w-0 snap-center shrink-0">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Opened</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.opened || 0}</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 min-w-[200px] sm:min-w-0 snap-center shrink-0">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Replied</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.replied || 0}</h3>
          </div>
        </div>

        {/* Recipients Table */}
        <div>
          <h2 className="text-lg font-medium text-white mb-4">Recipient List</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-zinc-400">
                <thead className="bg-white/5 border-b border-white/10 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Contact Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Phone</th>
                    <th className="px-6 py-4 font-medium">Approval Status</th>
                    <th className="px-6 py-4 font-medium">Send Status</th>
                    <th className="px-6 py-4 font-medium text-right">View Draft</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(!campaign.recipients || campaign.recipients.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                        No recipients added to this campaign yet.
                      </td>
                    </tr>
                  ) : (
                    campaign.recipients.map((recipient: any) => (
                      <tr key={recipient.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4 text-white font-medium">{recipient.contact?.name || "Unknown"}</td>
                        <td className="px-6 py-4">{recipient.contact?.email || "-"}</td>
                        <td className="px-6 py-4">{recipient.contact?.phone || "-"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs ${
                            recipient.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                            recipient.approvalStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-white/10 text-zinc-300'
                          }`}>
                            {recipient.approvalStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs ${
                            recipient.sendStatus === 'SENT' ? 'bg-indigo-500/10 text-indigo-400' :
                            recipient.sendStatus === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                            'bg-white/10 text-zinc-300'
                          }`}>
                            {recipient.sendStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-4">
                            {(recipient.sendStatus !== 'SENT' && recipient.sendStatus !== 'FAILED') && (
                              <button 
                                onClick={() => setRecipientToRemove(recipient.id)}
                                className="text-red-400 hover:text-red-300 bg-red-500/10 p-2 rounded-lg transition flex items-center gap-1"
                                title="Undo / Remove"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setPreviewRecipient(recipient);
                                setEditSubject(recipient.personalizedSubject || "");
                                setEditBody(recipient.personalizedBody || "");
                              }}
                              className="text-indigo-400 hover:text-indigo-300 transition text-xs font-medium uppercase tracking-wider flex items-center gap-1"
                            >
                              Preview / Edit <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-white/5">
              {(!campaign.recipients || campaign.recipients.length === 0) ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No recipients added to this campaign yet.
                </div>
              ) : (
                campaign.recipients.map((recipient: any) => (
                  <div key={recipient.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col min-w-0">
                        <p className="text-white font-medium truncate">{recipient.contact?.name || "Unknown"}</p>
                        <p className="text-sm text-zinc-400 truncate">{recipient.contact?.email || recipient.contact?.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(recipient.sendStatus !== 'SENT' && recipient.sendStatus !== 'FAILED') && (
                          <button 
                            onClick={() => setRecipientToRemove(recipient.id)}
                            className="text-red-400 bg-red-500/10 p-2 rounded-lg hover:bg-red-500/20 transition flex items-center gap-2 text-xs font-medium uppercase tracking-wider"
                            title="Undo / Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setPreviewRecipient(recipient);
                            setEditSubject(recipient.personalizedSubject || "");
                            setEditBody(recipient.personalizedBody || "");
                          }}
                          className="text-indigo-400 bg-indigo-500/10 p-2 rounded-lg hover:bg-indigo-500/20 transition flex items-center gap-2 text-xs font-medium uppercase tracking-wider"
                          title="Preview / Edit"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        recipient.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        recipient.approvalStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-white/10 text-zinc-300 border border-white/10'
                      }`}>
                        {recipient.approvalStatus}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        recipient.sendStatus === 'SENT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        recipient.sendStatus === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-white/10 text-zinc-400 border border-white/10'
                      }`}>
                        {recipient.sendStatus === 'SENT' ? 'Sent' : recipient.sendStatus === 'FAILED' ? 'Failed' : 'Queued'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Follow-up Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Create Follow-up</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6 overflow-y-auto">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Follow-up Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['REMINDER', 'FOLLOW_UP', 'CUSTOM'].map(type => (
                    <button
                      key={type}
                      onClick={() => { setFollowUpType(type); setHasPreview(false); }}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${
                        followUpType === type 
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Recipients</label>
                <select 
                  className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value)}
                >
                  <option value="ALL">All Recipients</option>
                  <option value="PENDING_RESPONSE">Pending Response (No Reply)</option>
                  {/* Custom selection would require a multi-select, keeping it simple for now */}
                </select>
                <p className="text-xs text-zinc-500 mt-2">
                  {recipientFilter === 'PENDING_RESPONSE' 
                    ? "Only targets recipients who were sent the initial email but haven't replied."
                    : "Targets everyone from the original campaign."}
                </p>
              </div>

              {campaign?.campaignType === 'MEETING' && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex gap-4 items-start cursor-pointer hover:bg-indigo-500/10 transition" onClick={() => setIncludeMeetLink(!includeMeetLink)}>
                  <div className="pt-0.5">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${includeMeetLink ? "bg-indigo-500 border-indigo-500" : "border-zinc-500"}`}>
                      {includeMeetLink && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">Re-attach Google Meet Link</h4>
                    <p className="text-xs text-indigo-300/70 mt-1">
                      If enabled, the Google Meet link from the original campaign will automatically be appended to the bottom of this follow-up email.
                    </p>
                  </div>
                </div>
              )}

              {hasPreview ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Generated Subject</label>
                    <input 
                      type="text"
                      className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                      value={previewSubject}
                      onChange={(e) => setPreviewSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Generated Body</label>
                    <textarea 
                      className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 h-48"
                      value={previewBody}
                      onChange={(e) => setPreviewBody(e.target.value)}
                    />
                      <p className="text-xs text-zinc-500 mt-2">
                        You can edit this draft before sending. Note that [Name] will be replaced dynamically.
                      </p>
                    </div>

                    <div className="mt-2 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex gap-4 items-start cursor-pointer hover:bg-indigo-500/10 transition" onClick={() => setIsIntelligentMode(!isIntelligentMode)}>
                      <div className="pt-0.5">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isIntelligentMode ? "bg-indigo-500 border-indigo-500" : "border-zinc-500"}`}>
                          {isIntelligentMode && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">AI Intelligent Follow-up Mode</h4>
                        <p className="text-xs text-indigo-300/70 mt-1">
                          If enabled, the text above is just a sample. The AI will write a completely unique follow-up for EVERY individual person by reading the specific email that was originally sent to them.
                        </p>
                      </div>
                    </div>
                  </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Additional AI Instructions</label>
                  <textarea 
                    className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none h-32"
                    placeholder="e.g. Mention that seats are limited. Keep the tone friendly. Reference the previous invitation."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-[#0F0F12] flex items-center justify-end gap-3">
              <button 
                onClick={() => { setIsModalOpen(false); setHasPreview(false); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition"
                disabled={isGenerating}
              >
                Cancel
              </button>
              
              {!hasPreview ? (
                <button 
                  onClick={handleGeneratePreview}
                  disabled={isGenerating}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Draft <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleCreateFollowUp}
                  disabled={isGenerating}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Add Recipients Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Add More Recipients
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6 overflow-y-auto">
              <p className="text-sm text-zinc-400">
                Adding new recipients to this campaign will generate emails for them and place the campaign back into the READY state. The email will <b>only</b> be sent to these new recipients.
              </p>

              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-zinc-300">Select Contacts</label>
                  <span className="text-xs text-zinc-500">{selectedContactIds.length} selected</span>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-black/20">
                  {contacts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">No contacts found in your database.</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {contacts.map(c => (
                        <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-zinc-700 bg-black/50 text-emerald-500 focus:ring-emerald-500/20"
                            checked={selectedContactIds.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedContactIds(prev => [...prev, c.id]);
                              else setSelectedContactIds(prev => prev.filter(id => id !== c.id));
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{c.name}</span>
                            <span className="text-xs text-zinc-500">{c.email}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex gap-4 items-start cursor-pointer hover:bg-indigo-500/10 transition" onClick={() => setUseAiForNew(!useAiForNew)}>
                <div className="pt-0.5">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${useAiForNew ? "bg-indigo-500 border-indigo-500" : "border-zinc-500"}`}>
                    {useAiForNew && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">AI Personalization (Recommended)</h4>
                  <p className="text-xs text-indigo-300/70 mt-1">
                    If checked, the AI will generate fresh, hyper-personalized emails for these new recipients based on your original campaign prompt. If unchecked, it will generate a standardized generic draft.
                  </p>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-[#0F0F12] flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition"
                disabled={isAddingRecipients}
              >
                Cancel
              </button>
              
              <button 
                onClick={handleAddRecipients}
                disabled={isAddingRecipients || selectedContactIds.length === 0}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {isAddingRecipients ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    Add & Generate Emails
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Preview Modal */}
      {previewRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Email to {previewRecipient.contact?.name || "Recipient"}</h2>
              <button onClick={() => setPreviewRecipient(null)} className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Subject</label>
                {previewRecipient.sendStatus === 'SENT' ? (
                  <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white">
                    {previewRecipient.personalizedSubject || "No subject generated yet."}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                  />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Body</label>
                {previewRecipient.sendStatus === 'SENT' ? (
                  <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white whitespace-pre-wrap min-h-[150px]">
                    {previewRecipient.personalizedBody || "No body generated yet."}
                  </div>
                ) : (
                  <textarea
                    className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 h-48 resize-none"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-[#0F0F12] flex items-center justify-end gap-3">
              <button 
                onClick={() => setPreviewRecipient(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition border border-white/10"
              >
                {previewRecipient.sendStatus === 'SENT' ? "Close" : "Cancel"}
              </button>
              
              {previewRecipient.sendStatus !== 'SENT' && (
                <button 
                  onClick={handleSaveRecipient}
                  disabled={isSavingRecipient}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  {isSavingRecipient ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Master Draft Modal */}
      {isMasterDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMasterDraftModalOpen(false)}></div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl w-full relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-medium text-white mb-2">Edit Master Draft</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Update the base prompt/draft for this campaign. Saving will instantly regenerate all unsent emails (including those you have already approved). Sent emails will not be affected.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Master Draft / Base Prompt</label>
                <textarea 
                  value={masterDraftText}
                  onChange={e => setMasterDraftText(e.target.value)}
                  placeholder="Write your email draft or AI instructions here..."
                  className="w-full h-64 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="masterUseAi"
                  checked={masterDraftUseAi}
                  onChange={(e) => setMasterDraftUseAi(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-black/50 text-indigo-500 focus:ring-indigo-500/50 focus:ring-offset-0 transition cursor-pointer"
                />
                <label htmlFor="masterUseAi" className="text-sm font-medium text-zinc-300 cursor-pointer">
                  Use AI to deeply personalize each email based on recipient profile
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsMasterDraftModalOpen(false)}
                disabled={isSavingMasterDraft}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMasterDraft}
                disabled={isSavingMasterDraft || !masterDraftText.trim()}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingMasterDraft ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4" /> Save & Regenerate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Recipient Confirmation Modal */}
      {recipientToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-lg font-medium text-white">Remove Recipient?</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Are you sure you want to remove this recipient? This action cannot be undone, and they will not receive this campaign email.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setRecipientToRemove(null)}
                disabled={isRemovingRecipient}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRemoveRecipient}
                disabled={isRemovingRecipient}
                className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isRemovingRecipient ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
