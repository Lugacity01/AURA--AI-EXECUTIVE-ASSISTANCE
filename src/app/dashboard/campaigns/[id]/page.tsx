"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Megaphone, CheckCircle2, Clock, Users, Activity, ExternalLink, Play, Plus, ChevronRight, X, AlertCircle, UserPlus } from "lucide-react";
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

  // Recipient Preview Modal State
  const [previewRecipient, setPreviewRecipient] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    fetchCampaignDetails();
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      const [campRes, fupRes] = await Promise.all([
        fetch(`/api/campaigns/${id}`),
        fetch(`/api/campaigns/${id}/follow-ups`)
      ]);
      
      if (!campRes.ok) throw new Error("Failed to fetch campaign");
      
      const data = await campRes.json();
      setCampaign(data);

      if (fupRes.ok) {
        const followUpsData = await fupRes.json();
        setFollowUps(followUpsData);
      }
      
      const contactsRes = await fetch("/api/contacts?limit=100");
      if (contactsRes.ok) {
        const cData = await contactsRes.json();
        setContacts(cData.contacts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          masterBody: (!isIntelligentMode && hasPreview) ? previewBody : undefined
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
      <div className="border-b border-white/10 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns" className="text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-white flex items-center gap-3">
              {campaign.title}
              <span className={`text-xs px-2.5 py-1 rounded-md uppercase tracking-wider font-semibold ${
                campaign.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                campaign.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-400' :
                campaign.status === 'SENDING' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {campaign.status === 'SENDING' && campaign.totalRecipients > 0 ? 
                  `SENDING (${Math.round(((campaign.emailsSent || 0) / campaign.totalRecipients) * 100)}%)` 
                  : campaign.status}
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Created on {new Date(campaign.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        {campaign.status === 'DRAFT' && (
          <button 
            onClick={() => router.push(`/dashboard/campaigns/new?id=${campaign.id}`)}
            className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Continue Editing
          </button>
        )}
        {campaign.status === 'COMPLETED' && (
          <div className="flex items-center gap-3">
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
        {campaign.status === 'READY' && (
          <div className="flex items-center gap-3">
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

      <div className="flex-1 overflow-auto p-8 flex flex-col gap-8">
        
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
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Total Recipients</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.totalRecipients || 0}</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Emails Sent</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.emailsSent || 0}</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Opened</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.opened || 0}</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Replied</p>
            <h3 className="text-3xl font-semibold text-white">{campaign.replied || 0}</h3>
          </div>
        </div>

        {/* Recipients Table */}
        <div>
          <h2 className="text-lg font-medium text-white mb-4">Recipient List</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-zinc-400">
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
                        <button 
                          onClick={() => setPreviewRecipient(recipient)}
                          className="text-indigo-400 hover:text-indigo-300 transition text-xs font-medium uppercase tracking-wider flex items-center justify-end gap-1 w-full"
                        >
                          Preview <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                <div className="grid grid-cols-3 gap-3">
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
                <div className="flex justify-between items-center mb-2">
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
                <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white">
                  {previewRecipient.personalizedSubject || "No subject generated yet."}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Body</label>
                <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white whitespace-pre-wrap min-h-[150px]">
                  {previewRecipient.personalizedBody || "No body generated yet."}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-[#0F0F12] flex items-center justify-end">
              <button 
                onClick={() => setPreviewRecipient(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition border border-white/10"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
