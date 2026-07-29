"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sparkles, 
  Send, 
  Clock, 
  Check, 
  ShieldCheck, 
  ChevronRight,
  Search,
  RotateCcw,
  RefreshCw,
  X,
  AlertTriangle,
  FolderOpen,
  Calendar
} from "lucide-react";
import { useDraftsList } from "@/hooks/use-queries";

// Shimmering skeleton representing Drafts workspace loading state
const DraftsSkeleton = () => (
  <div className="flex-1 flex flex-col lg:flex-row gap-6 animate-pulse text-left h-full overflow-hidden">
    <div className="lg:w-80 shrink-0 border border-white/[0.06] bg-black/20 rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
        <div className="h-4 w-24 bg-white/10 rounded-md" />
        <div className="h-5 w-8 bg-white/10 rounded-full" />
      </div>
      <div className="p-3 border-b border-white/[0.03] bg-white/[0.01]">
        <div className="h-8 bg-white/[0.04] rounded-xl" />
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex flex-col gap-2 p-3 border border-white/[0.02] rounded-xl">
            <div className="h-3.5 w-16 bg-white/10 rounded" />
            <div className="h-2.5 w-32 bg-white/[0.06] rounded" />
            <div className="h-4 w-12 bg-white/[0.04] rounded mt-1" />
          </div>
        ))}
      </div>
    </div>
    
    <div className="flex-1 border border-white/[0.06] bg-black/20 rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/10 shrink-0" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-2.5 w-32 bg-white/[0.06] rounded" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <div className="h-3 w-28 bg-white/10 rounded" />
          <div className="flex-1 bg-white/[0.02] border border-white/[0.04] rounded-xl" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-3 w-36 bg-white/10 rounded" />
          <div className="flex-1 bg-[#070712] border border-white/[0.04] rounded-xl" />
          <div className="h-20 bg-white/[0.02] border border-white/[0.04] rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

export default function DraftRevisionsHub() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastStyle, setToastStyle] = useState<"success" | "error">("success");

  // Keep unsaved edit states locally so we don't spam requests on keydown
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const [activeVersions, setActiveVersions] = useState<Record<string, number>>({});

  // 1. Fetch drafts via custom hook
  const { data: rawDrafts = [], isLoading, isError, refetch } = useDraftsList();

  // 2. Format query data for local revisions
  const drafts = useMemo(() => {
    return rawDrafts.map(d => ({
      id: d.id,
      recipient: d.recipient || "External client",
      subject: d.subject || "No Subject",
      status: d.status || "Draft",
      statusColor: d.status === "Approved" 
        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
        : d.status === "Needs Approval" 
        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse" 
        : "bg-slate-500/10 border-white/[0.05] text-slate-400",
      versions: [
        d.draftContent,
        d.draftContent.slice(0, Math.floor(d.draftContent.length * 0.6)) + "...",
        `Dear Recipient, regarding terms: ${d.draftContent}`
      ],
      metadata: { generatedAt: "Recently", model: "Aura-v2 (Stable)", confidence: `${d.confidence || 90}%` }
    }));
  }, [rawDrafts]);

  // Derive selection index details
  const selectedDraft = useMemo(() => {
    if (drafts.length === 0) return null;
    const found = drafts.find(d => d.id === selectedId);
    return found || drafts[0];
  }, [drafts, selectedId]);

  const activeVersionIdx = selectedDraft ? (activeVersions[selectedDraft.id] ?? 0) : 0;
  const currentDraftText = selectedDraft 
    ? (localEdits[`${selectedDraft.id}-${activeVersionIdx}`] ?? selectedDraft.versions[activeVersionIdx])
    : "";

  // 3. Mutation: Save Staging Edit (PUT)
  const saveMutation = useMutation({
    mutationFn: async (payload: { draftId: string; draftContent: string }) => {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Staging save failed. Please verify API connections.");
      return res.json();
    },
    onSuccess: (data, variables) => {
      setToastStyle("success");
      setToastMessage("Revision saved to staging queue.");
      // Targeted query invalidation
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      // Clear cached edit
      setLocalEdits(prev => {
        const copy = { ...prev };
        delete copy[`${variables.draftId}-${activeVersionIdx}`];
        return copy;
      });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to commit staging edits.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });

  // 4. Mutation: Approve & Dispatch (POST)
  const dispatchMutation = useMutation({
    mutationFn: async (draftId: string) => {
      // Trigger update with final edited text
      await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, draftContent: currentDraftText })
      });

      // Dispatch approve trigger
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action: "approve" })
      });
      if (!res.ok) throw new Error("Approval dispatch failed. Could not send SMTP message.");
      return res.json();
    },
    onSuccess: () => {
      setToastStyle("success");
      setToastMessage("Dispatched response draft successfully!");
      // Targeted invalidation
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["inboxStats"] });
      setSelectedId(null);
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to dispatch approved response.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });

  // Calendar Event Scheduling states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSummary, setScheduleSummary] = useState("");
  const [scheduleRecipient, setScheduleRecipient] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleDuration, setScheduleDuration] = useState(30);
  const [scheduleCreateMeet, setScheduleCreateMeet] = useState(true);
  const [scheduleDescription, setScheduleDescription] = useState("");

  const handleOpenSchedule = () => {
    if (!selectedDraft) return;
    setScheduleRecipient(selectedDraft.recipient);
    setScheduleSummary(`Sync with ${selectedDraft.recipient.split("@")[0]}`);
    setScheduleDescription(`Follow-up meeting scheduled via Aura AI.\nDraft Subject: ${selectedDraft.subject}`);
    
    // Default tomorrow at 10 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setScheduleDate(`${yyyy}-${mm}-${dd}`);
    setScheduleTime("10:00");
    setScheduleDuration(30);
    setScheduleCreateMeet(true);
    setScheduleModalOpen(true);
  };

  const createEventMutation = useMutation({
    mutationFn: async () => {
      const startDateTimeStr = `${scheduleDate}T${scheduleTime}:00`;
      const startLocal = new Date(startDateTimeStr);
      const endLocal = new Date(startLocal.getTime() + scheduleDuration * 60000);

      const payload = {
        recipientEmail: scheduleRecipient,
        summary: scheduleSummary,
        description: scheduleDescription,
        startTime: startLocal.toISOString(),
        endTime: endLocal.toISOString(),
        createMeet: scheduleCreateMeet
      };

      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Google Calendar API Connection Failure.");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setToastStyle("success");
      setToastMessage(`Calendar invite successfully scheduled! ${data.meetLink ? 'Google Meet: ' + data.meetLink : ''}`);
      setScheduleModalOpen(false);
      // Auto-refresh activity log
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to schedule Google Calendar event.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });

  const handleConfirmSchedule = () => {
    createEventMutation.mutate();
  };

  const handleRestoreVersion = (idx: number) => {
    if (!selectedDraft) return;
    setActiveVersions(prev => ({
      ...prev,
      [selectedDraft.id]: idx
    }));
    setToastStyle("success");
    setToastMessage(`Switched to Revision ${idx + 1}`);
    setTimeout(() => setToastMessage(""), 2000);
  };

  const handleEditDraft = (text: string) => {
    if (!selectedDraft) return;
    setLocalEdits(prev => ({
      ...prev,
      [`${selectedDraft.id}-${activeVersionIdx}`]: text
    }));
  };

  const handleSaveStaging = () => {
    if (!selectedDraft || saveMutation.isPending) return;
    saveMutation.mutate({ draftId: selectedDraft.id, draftContent: currentDraftText });
  };

  const handleDispatch = () => {
    if (!selectedDraft || dispatchMutation.isPending) return;
    dispatchMutation.mutate(selectedDraft.id);
  };

  const filteredDrafts = drafts.filter(d => 
    d.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative select-none max-w-7xl mx-auto w-full overflow-hidden">
      
      {/* Toast Notice */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md ${
              toastStyle === "success" 
                ? "bg-indigo-950/90 border-indigo-500/30 text-indigo-300"
                : "bg-rose-950/90 border-rose-500/30 text-rose-300"
            }`}
          >
            {toastStyle === "success" ? (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
            )}
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage("")} className="p-0.5 rounded hover:bg-white/10 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <DraftsSkeleton />
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-rose-500/10 bg-rose-500/[0.02] rounded-2xl">
          <AlertTriangle className="w-10 h-10 text-rose-400 mb-3 animate-pulse" />
          <h4 className="text-sm font-bold text-slate-200">Failed to Load Drafts Revisions</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs text-center leading-relaxed">
            Live database queries encountered connection blockages.
          </p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
          </button>
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
          <FolderOpen className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
          <h4 className="text-sm font-semibold text-slate-300">Drafts Staging Hub Clear</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm text-center leading-relaxed">
            All AI-drafted responses are synchronized. Aura will draft automated replies as new items hit your inbox.
          </p>
        </div>
      ) : (
        <>
          {/* Pane 1: Drafts sidebar directory */}
          <div className="lg:w-80 shrink-0 glass-panel border border-white/[0.06] bg-black/20 flex flex-col h-full overflow-hidden min-h-[300px]">
            {/* Aligned Header */}
            <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold tracking-wide text-slate-200 uppercase font-mono">Drafts Hub</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {filteredDrafts.length}
              </span>
            </div>

            {/* Search bar wrapper */}
            <div className="p-3 bg-white/[0.01] border-b border-white/[0.03] shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input 
                  type="text" 
                  placeholder="Search drafts..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors font-sans"
                />
              </div>
            </div>

            {/* Drafts directory list */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
              {filteredDrafts.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                  <Sparkles className="w-8 h-8 text-slate-600 mb-3" />
                  <span className="text-xs font-semibold text-slate-500">No matching drafts</span>
                </div>
              ) : (
                filteredDrafts.map((d) => {
                  const isSelected = selectedDraft && d.id === selectedDraft.id;
                  return (
                    <div 
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={`p-4 cursor-pointer text-left transition-all duration-200 relative ${
                        isSelected 
                          ? "bg-indigo-500/[0.04]" 
                          : "hover:bg-white/[0.01]"
                      }`}
                    >
                      {isSelected && (
                        <motion.div 
                          layoutId="active-draft-border"
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <span className="text-xs font-bold text-slate-200 block truncate">{d.recipient.split(" ")[0]}</span>
                      <span className="text-[10px] text-slate-500 truncate block mt-0.5">{d.subject}</span>
                      
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className={`text-[8.5px] font-bold font-mono px-2 py-0.5 rounded border ${d.statusColor}`}>
                          {d.status.toUpperCase()}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pane 2: Comparator & detail Workspace */}
          <div className="flex-1 glass-panel border border-white/[0.06] bg-black/20 flex flex-col h-full overflow-hidden text-left">
            {selectedDraft ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Aligned Header */}
                <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0 uppercase">
                      {selectedDraft.recipient[0]}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-xs font-semibold text-slate-200 truncate">{selectedDraft.recipient}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate">{selectedDraft.subject}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${selectedDraft.statusColor}`}>
                      {selectedDraft.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Version revisions selector tabs */}
                <div className="p-4 bg-white/[0.01] border-b border-white/[0.03] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 select-none">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-300 font-display">Version Comparison History</span>
                  </div>
                  <div className="flex gap-2 select-none">
                    {selectedDraft.versions.map((_: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleRestoreVersion(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                          activeVersionIdx === idx 
                            ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300" 
                            : "border border-white/[0.04] bg-white/[0.01] text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        Version {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comparison diff grids scroll box */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column: Live Editable Draft Response */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Active Working Revision</span>
                    <div className="flex-1 relative min-h-[220px]">
                      <textarea
                        value={currentDraftText}
                        onChange={(e) => handleEditDraft(e.target.value)}
                        disabled={selectedDraft.status === "Sent" || selectedDraft.status === "Approved" || saveMutation.isPending || dispatchMutation.isPending}
                        className="w-full h-full bg-black/40 border border-white/[0.06] rounded-xl p-4 text-xs font-sans text-slate-300 leading-relaxed resize-none focus:outline-none focus:border-indigo-500/50 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Right Column: Version comparison snapshot logs */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[9px] text-indigo-400 font-mono uppercase tracking-wider block">Comparison Reference (Original V1)</span>
                    <div className="flex-1 p-4 rounded-xl border border-white/[0.04] bg-[#070712] text-xs font-light text-slate-400 leading-relaxed overflow-y-auto max-h-[300px] font-sans">
                      <div className="mb-2 pb-2 border-b border-white/[0.02] flex items-center justify-between select-none">
                        <span className="text-[9px] font-mono text-slate-500">Original AI generated snapshot</span>
                        <button 
                          onClick={() => handleRestoreVersion(0)}
                          className="text-[9px] font-mono text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Restore
                        </button>
                      </div>
                      <div className="text-slate-300 font-light text-left leading-relaxed">
                        {renderFormattedContent(selectedDraft.versions[0])}
                      </div>
                    </div>
                    
                    {/* Revision logs metadata */}
                    <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-xs flex flex-col gap-2.5">
                      <span className="text-[9px] text-slate-500 font-mono uppercase">Version Metadata</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Generated</span>
                          <span className="text-[10px] font-semibold text-slate-300 mt-0.5 block">{selectedDraft.metadata.generatedAt}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Orchestrator</span>
                          <span className="text-[10px] font-semibold text-slate-300 mt-0.5 block">{selectedDraft.metadata.model}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Confidence</span>
                          <span className="text-[10px] font-semibold text-indigo-400 mt-0.5 block">{selectedDraft.metadata.confidence}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Dispatch Actions footer */}
                <div className="p-4 border-t border-white/[0.04] bg-black/40 flex justify-end gap-3 shrink-0 select-none">
                  <button 
                    onClick={handleSaveStaging}
                    disabled={saveMutation.isPending || dispatchMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Staging"
                    )}
                  </button>
                  <button 
                    onClick={handleOpenSchedule}
                    disabled={saveMutation.isPending || dispatchMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-indigo-400 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Schedule Event
                  </button>
                  {selectedDraft.status !== "Sent" && selectedDraft.status !== "Approved" ? (
                    <button 
                      onClick={handleDispatch}
                      disabled={saveMutation.isPending || dispatchMutation.isPending}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {dispatchMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          Approve & Dispatch <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={handleDispatch}
                      disabled={saveMutation.isPending || dispatchMutation.isPending}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {dispatchMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Resending...
                        </>
                      ) : (
                        <>
                          Resend Response <Send className="w-3.5 h-3.5 text-indigo-400" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Sparkles className="w-12 h-12 text-slate-600 mb-4" />
                <span className="text-sm font-semibold text-slate-400">Select a draft file to compare revisions</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Google Calendar Direct Scheduling Modal */}
      <AnimatePresence>
        {scheduleModalOpen && selectedDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setScheduleModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel w-full max-w-md border border-white/[0.08] bg-[#070712]/95 p-6 rounded-2xl shadow-2xl relative z-10 text-left flex flex-col gap-4 font-sans select-text"
            >
              <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
                <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
                <h3 className="text-base font-bold text-slate-200 font-display">Schedule Google Calendar Event</h3>
                <button 
                  onClick={() => setScheduleModalOpen(false)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white ml-auto shrink-0 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase">Event Title / Summary</label>
                  <input
                    type="text"
                    value={scheduleSummary}
                    onChange={(e) => setScheduleSummary(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase">Guest Email (Recipient)</label>
                  <input
                    type="email"
                    value={scheduleRecipient}
                    onChange={(e) => setScheduleRecipient(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-mono uppercase">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-mono uppercase">Start Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-mono uppercase">Duration (Minutes)</label>
                    <select
                      value={scheduleDuration}
                      onChange={(e) => setScheduleDuration(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes</option>
                      <option value={90}>90 Minutes</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-5 pl-2 select-none">
                    <input
                      type="checkbox"
                      id="createMeetDraft"
                      checked={scheduleCreateMeet}
                      onChange={(e) => setScheduleCreateMeet(e.target.checked)}
                      className="rounded border-white/[0.1] bg-black text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="createMeetDraft" className="text-xs text-slate-300 font-medium cursor-pointer">
                      Add Google Meet
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase">Description / Notes</label>
                  <textarea
                    value={scheduleDescription}
                    onChange={(e) => setScheduleDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.04] pt-4 mt-2 select-none">
                <button
                  onClick={() => setScheduleModalOpen(false)}
                  disabled={createEventMutation.isPending}
                  className="px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  disabled={createEventMutation.isPending || !scheduleSummary || !scheduleRecipient || !scheduleDate || !scheduleTime}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {createEventMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scheduling...
                    </>
                  ) : (
                    <>
                      Confirm & Schedule <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to format raw markdown headers, bold texts, and bullet indents
const parseBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldContent = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {boldContent}
        </strong>
      );
    }
    return part;
  });
};

const renderFormattedContent = (text: string) => {
  if (!text) return null;

  return text.split("\n").map((line, idx) => {
    let cleanLine = line.trim();

    // 1. Headers starting with ##
    if (cleanLine.startsWith("##")) {
      const headerText = cleanLine.replace(/^##\s*/, "");
      return (
        <h3 key={idx} className="text-sm font-bold text-slate-100 mt-4 mb-2 first:mt-0 font-display block">
          {parseBoldText(headerText)}
        </h3>
      );
    }

    // 2. Bullet points
    if (cleanLine.startsWith("* ") || cleanLine.startsWith("- ") || cleanLine.startsWith("• ")) {
      const bulletText = cleanLine.replace(/^(\*\s*|-\s*|•\s*)/, "");
      return (
        <ul key={idx} className="list-disc pl-5 my-1 text-xs text-slate-300 font-light leading-relaxed font-sans text-left">
          <li className="marker:text-indigo-400">
            {parseBoldText(bulletText)}
          </li>
        </ul>
      );
    }

    // 3. Regular lines
    return (
      <p key={idx} className="text-xs text-slate-300 font-light leading-relaxed my-2 first:mt-0 last:mb-0 font-sans">
        {parseBoldText(line)}
      </p>
    );
  });
};
