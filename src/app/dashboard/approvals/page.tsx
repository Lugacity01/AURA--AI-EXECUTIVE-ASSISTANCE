"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ShieldCheck, 
  Send, 
  AlertTriangle, 
  Check, 
  X, 
  Archive,
  Save,
  HelpCircle,
  RefreshCw,
  Edit3,
  FolderOpen,
  Sparkles,
  Calendar,
  Search
} from "lucide-react";
import { useApprovalsList } from "@/hooks/use-queries";

// Shimmering skeleton representing Approvals feed loading state
const ApprovalsSkeleton = () => (
  <div className="flex flex-col gap-6 animate-pulse text-left">
    {Array.from({ length: 3 }).map((_, idx) => (
      <div key={idx} className="glass-panel p-6 border border-white/[0.06] bg-black/20 rounded-2xl flex flex-col md:flex-row justify-between gap-6 relative">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-5 h-5 rounded-lg bg-white/10 shrink-0 mt-1" />
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="h-3.5 w-24 bg-white/10 rounded-md" />
              <div className="h-3 w-36 bg-white/[0.06] rounded-md" />
            </div>
            <div className="h-4.5 w-48 bg-white/10 rounded-md" />
            <div className="h-3.5 w-full bg-white/[0.04] rounded-md" />
            <div className="h-12 bg-white/[0.02] border border-white/[0.04] rounded-xl" />
            <div className="h-16 bg-[#070712] border border-white/[0.04] rounded-xl" />
          </div>
        </div>
        <div className="md:w-56 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.04] pt-4 md:pt-0 md:pl-6 gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-white/10 rounded" />
              <div className="h-3 w-8 bg-white/10 rounded" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3 w-16 bg-white/10 rounded" />
              <div className="h-4 w-12 bg-white/10 rounded" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="h-8 bg-white/[0.04] rounded-xl" />
              <div className="h-8 bg-white/[0.04] rounded-xl" />
            </div>
            <div className="h-9 bg-white/10 rounded-xl" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function ApprovalsHub() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastStyle, setToastStyle] = useState<"success" | "error">("success");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [hoveredRiskId, setHoveredRiskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch approvals via custom hook
  const { data: items = [], isLoading, isError, refetch } = useApprovalsList();

  // Filter items locally based on search query
  const filteredItems = items.filter((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.subject && item.subject.toLowerCase().includes(q)) ||
      (item.sender && item.sender.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q)) ||
      (item.snippet && item.snippet.toLowerCase().includes(q)) ||
      (item.draft && item.draft.toLowerCase().includes(q))
    );
  });

  // 2. Mutation: Individual Approve
  const approveMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action: "approve" })
      });
      if (!res.ok) throw new Error("Approval dispatch failed. Verify server routes.");
      return res.json();
    },
    onSuccess: (data, variables) => {
      setToastStyle("success");
      setToastMessage("Approved and sent draft response successfully.");
      setSelectedIds(prev => prev.filter(id => {
        const item = items.find(i => i.id === id);
        return item?.draftId !== variables;
      }));
      // Targeted invalidation
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["inboxStats"] });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to dispatch email response.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });

  // 3. Mutation: Individual Reject
  const rejectMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action: "archive" })
      });
      if (!res.ok) throw new Error("Reject staging update failed.");
      return res.json();
    },
    onSuccess: (data, variables) => {
      setToastStyle("success");
      setToastMessage("Draft response rejected & archived.");
      setToastMessage("Draft response rejected & archived.");
      setSelectedIds(prev => prev.filter(id => {
        const item = items.find((i: any) => i.id === id);
        return item?.draftId !== variables;
      }));
      // Targeted invalidation
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["inboxStats"] });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to reject response draft.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });

  // 4. Mutation: Save Staging Edit
  const saveMutation = useMutation({
    mutationFn: async ({ draftId, draftContent }: { draftId: string; draftContent: string }) => {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, draftContent })
      });
      if (!res.ok) throw new Error("Save staging changes failed.");
      return res.json();
    },
    onSuccess: () => {
      setToastStyle("success");
      setToastMessage("Draft updated successfully.");
      setEditingId(null);
      // Targeted invalidation
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to commit staging edits.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });
  // 5. Mutation: Manual AI Draft Generation
  const generateMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, action: "generate" })
      });
      if (!res.ok) throw new Error("Failed to generate AI response.");
      return res.json();
    },
    onSuccess: () => {
      setToastStyle("success");
      setToastMessage("AI response draft generated successfully.");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to generate AI draft.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });
  // 5. Mutation: Bulk Approve
  const bulkApproveMutation = useMutation({
    mutationFn: async (draftIds: string[]) => {
      for (const draftId of draftIds) {
        await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, action: "approve" })
        });
      }
    },
    onSuccess: () => {
      setToastStyle("success");
      setToastMessage("Bulk approved and dispatched all staging drafts.");
      setSelectedIds([]);
      // Targeted invalidation
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["inboxStats"] });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to execute bulk approval dispatches.");
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });

  // Calendar Event Scheduling states
  const [schedulingItem, setSchedulingItem] = useState<any | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSummary, setScheduleSummary] = useState("");
  const [scheduleRecipient, setScheduleRecipient] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleDuration, setScheduleDuration] = useState(30);
  const [scheduleCreateMeet, setScheduleCreateMeet] = useState(true);
  const [scheduleDescription, setScheduleDescription] = useState("");

  const handleOpenSchedule = (item: any) => {
    setSchedulingItem(item);
    setScheduleRecipient(item.email);
    setScheduleSummary(`Sync with ${item.sender || "Partner"}`);
    setScheduleDescription(`Follow-up meeting scheduled via Aura AI.\nThread Topic: ${item.subject}`);
    
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
      // Auto-refresh notifications and activity log
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (err: any) => {
      setToastStyle("error");
      setToastMessage(err.message || "Failed to schedule Google Calendar event.");
    }
  });

  const handleConfirmSchedule = () => {
    createEventMutation.mutate();
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i: any) => i.id));
    }
  };

  const handleApprove = (item: any) => {
    if (!item.draftId || approveMutation.isPending) return;
    approveMutation.mutate(item.draftId);
  };

  const handleReject = (item: any) => {
    if (!item.draftId || rejectMutation.isPending) return;
    rejectMutation.mutate(item.draftId);
  };

  const handleStartEdit = (id: string, initialDraft: string) => {
    setEditingId(id);
    setEditingText(initialDraft);
  };

  const handleSaveEdit = (item: any) => {
    if (!item.draftId || saveMutation.isPending) return;
    saveMutation.mutate({ draftId: item.draftId, draftContent: editingText });
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0 || bulkApproveMutation.isPending) return;
    const draftIds = selectedIds
      .map(id => items.find((i: any) => i.id === id)?.draftId)
      .filter(Boolean) as string[];
    bulkApproveMutation.mutate(draftIds);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
      <div className="flex flex-col gap-6 text-left select-none max-w-5xl mx-auto w-full">

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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6 select-none">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
              Approvals Center
            </h2>
            <p className="text-slate-400 text-xs mt-1 font-light max-w-xl leading-relaxed">
              Aura flags items that involve financial commitments, agreements, or style deviations for manual confirmation.
            </p>
          </div>

          {!isLoading && !isError && items.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                {selectedIds.length === items.length ? "Deselect All" : "Select All"}
              </button>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {bulkApproveMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching Selected...
                    </>
                  ) : (
                    `Approve Selected (${selectedIds.length})`
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Bar (Search) */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Search by sender, email, subject, or content..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all duration-200"
              />
            </div>
            
            {searchQuery && (
              <div className="text-xs text-zinc-400 flex items-center shrink-0">
                Found {filteredItems.length} {filteredItems.length === 1 ? "result" : "results"}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <ApprovalsSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-rose-500/10 bg-rose-500/[0.02] rounded-2xl p-12 select-text">
            <AlertTriangle className="w-10 h-10 text-rose-400 mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-200">Failed to Load Approvals Queue</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs text-center leading-relaxed font-light">
              Server database retrieval failed. Please check endpoint status.
            </p>
            <button 
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-6">
              {searchQuery ? <Search className="w-8 h-8 text-slate-500" /> : <FolderOpen className="w-8 h-8 text-slate-500" />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{searchQuery ? "No matching approvals found" : "All Caught Up!"}</h3>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              {searchQuery 
                ? "Try adjusting your search terms to find what you're looking for." 
                : "There are no pending actions requiring your attention right now."}
            </p>
          </div>
        ) : (
          /* Approvals Cards Feed List */
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item: any) => {
                const isSelected = selectedIds.includes(item.id);
                const isEditing = editingId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    layoutId={item.id}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`glass-panel p-6 border text-left flex flex-col md:flex-row justify-between gap-6 relative overflow-visible group ${
                      isSelected 
                        ? "border-indigo-500/35 bg-indigo-500/[0.01]" 
                        : "border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    {/* Checkbox selector */}
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => handleSelect(item.id)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer mt-1 shrink-0 ${
                          isSelected 
                            ? "bg-indigo-500 border-indigo-400 text-white shadow-inner" 
                            : "border-white/[0.15] bg-white/[0.01] hover:border-white/[0.3]"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Sender details and Date */}
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-200 truncate">{item.sender}</span>
                          <span className="text-[10px] text-slate-500 font-mono truncate">{item.email}</span>
                          <span className="text-[9px] text-slate-600 font-mono shrink-0 ml-auto select-none">{item.time}</span>
                        </div>

                        {/* Subject */}
                        <h4 className="text-sm font-semibold text-slate-100 font-display mb-2 truncate">{item.subject}</h4>

                        {/* snippet */}
                        <p className="text-xs text-slate-400 font-light mb-4 line-clamp-2 leading-relaxed font-sans">
                          {item.snippet}
                        </p>

                        {/* AI reason detail */}
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.02] flex items-start gap-2.5 mb-4">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9px] text-slate-500 font-mono uppercase block">Why approval is required</span>
                            <p className="text-xs text-slate-300 font-light mt-0.5 leading-relaxed font-sans">
                              {item.reason}
                            </p>
                          </div>
                        </div>

                        {/* Editable draft response box */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] text-slate-500 font-mono uppercase block">AI Draft response</span>
                          
                          {isEditing ? (
                            <div className="relative">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full bg-black/60 border border-indigo-500/30 rounded-xl p-4 pr-48 text-xs font-sans text-slate-300 leading-relaxed focus:outline-none focus:border-indigo-500/50 resize-none h-[110px] disabled:opacity-50"
                                disabled={saveMutation.isPending}
                              />
                              <div className="absolute bottom-3 right-3 flex gap-2">
                                <button 
                                  onClick={() => setEditingId(null)}
                                  disabled={saveMutation.isPending}
                                  className="px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleSaveEdit(item)}
                                  disabled={saveMutation.isPending}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {saveMutation.isPending ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )} Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {item.draft ? (
                                <div className="p-4 rounded-xl border border-white/[0.04] bg-[#070712] text-xs font-light text-slate-300 leading-relaxed text-left font-sans select-text">
                                  {renderFormattedContent(item.draft)}
                                </div>
                              ) : (
                                <div className="p-5 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] flex flex-col items-center justify-center text-center gap-3">
                                  <span className="text-xs text-slate-500 font-normal italic font-sans">
                                    No response draft has been generated for this email thread.
                                  </span>
                                  <button
                                    onClick={() => generateMutation.mutate(item.id)}
                                    disabled={generateMutation.isPending && generateMutation.variables === item.id}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                                  >
                                    {generateMutation.isPending && generateMutation.variables === item.id ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Generating Draft...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 text-indigo-400" /> Generate AI Response
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right column: metrics stats and hovers */}
                    <div className="md:w-56 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.04] pt-4 md:pt-0 md:pl-6 text-left relative select-none">
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-mono uppercase">AI Match Score</span>
                          <span className="text-xs font-bold font-mono text-slate-200">{item.confidence}%</span>
                        </div>

                        {/* Risk indicator badge with hover explainer */}
                        <div className="flex items-center justify-between relative">
                          <span className="text-[10px] text-slate-500 font-mono uppercase">Risk factor</span>
                          
                          <div 
                            onMouseEnter={() => setHoveredRiskId(item.id)}
                            onMouseLeave={() => setHoveredRiskId(null)}
                            className="flex items-center gap-1 cursor-pointer relative"
                          >
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                              item.risk === "HIGH" 
                                ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" 
                                : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                            }`}>
                              {item.risk} <HelpCircle className="w-2.5 h-2.5 shrink-0" />
                            </span>

                            {/* Hover tooltip explanation panel */}
                            <AnimatePresence>
                              {hoveredRiskId === item.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-0 top-6 z-40 p-3 w-56 rounded-xl border border-white/[0.06] bg-[#090919] shadow-2xl text-[10px] flex flex-col gap-1.5 backdrop-blur-md text-left"
                                >
                                  <span className="font-bold text-indigo-400 font-mono tracking-wider uppercase block mb-1">Risk Factors Detected</span>
                                  {item.riskExplainer.map((exp: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-1 text-slate-300 font-light font-sans">
                                      <span className="text-indigo-400 shrink-0 font-bold font-mono">•</span>
                                      <span>{exp}</span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Card actions triggers */}
                      <div className="flex flex-col gap-2 mt-6">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleStartEdit(item.id, item.draft)}
                            disabled={isEditing || approveMutation.isPending || rejectMutation.isPending}
                            className="py-2 rounded-xl text-xs font-semibold border border-white/[0.05] hover:bg-white/[0.04] text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleOpenSchedule(item)}
                            disabled={isEditing || approveMutation.isPending || rejectMutation.isPending}
                            className="py-2 rounded-xl text-xs font-semibold border border-white/[0.05] hover:bg-white/[0.04] text-slate-300 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Meet
                          </button>
                          <button
                            onClick={() => handleReject(item)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="py-2 rounded-xl text-xs font-semibold border border-rose-500/10 hover:bg-rose-500/5 text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {rejectMutation.isPending && rejectMutation.variables === item.draftId ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Archive className="w-3.5 h-3.5" /> Reject
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {approveMutation.isPending && approveMutation.variables === item.draftId ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                            </>
                          ) : (
                            <>
                              Approve & Send <Send className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Google Calendar Direct Scheduling Modal */}
      <AnimatePresence>
        {scheduleModalOpen && schedulingItem && (
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
                      id="createMeet"
                      checked={scheduleCreateMeet}
                      onChange={(e) => setScheduleCreateMeet(e.target.checked)}
                      className="rounded border-white/[0.1] bg-black text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="createMeet" className="text-xs text-slate-300 font-medium cursor-pointer">
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
