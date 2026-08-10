"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Inbox, 
  Sparkles, 
  Send, 
  AlertTriangle,
  Clock,
  Search,
  Check,
  ChevronRight,
  Filter,
  Users,
  Edit2,
  Trash2,
  X,
  Loader2,
  Star,
  Archive,
  ArrowRight,
  RotateCw,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { InboxFilter, InboxItemDTO, EmailDetailDTO, ThreadResponse } from "@/services/inbox/inbox.types";

// Modern Shimmering Skeleton for Emails list Queue
const EmailListSkeleton = () => (
  <div className="flex-1 divide-y divide-white/[0.02] flex flex-col overflow-hidden">
    {Array.from({ length: 7 }).map((_, idx) => (
      <div key={idx} className="p-4 flex gap-3 animate-pulse">
        <div className="pt-0.5">
          <div className="w-4 h-4 rounded border border-white/[0.06] bg-white/[0.03] shrink-0" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-24 bg-white/10 rounded-md" />
            <div className="h-2.5 w-10 bg-white/10 rounded-md" />
          </div>
          <div className="h-3 w-36 bg-white/[0.08] rounded-md" />
          <div className="h-2.5 w-full bg-white/[0.04] rounded-md" />
          <div className="flex gap-1.5 mt-1">
            <div className="h-3 w-10 bg-white/[0.03] border border-white/[0.05] rounded" />
            <div className="h-3 w-14 bg-white/[0.03] border border-white/[0.05] rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Modern Shimmering Skeleton for conversation Thread Panel
const ThreadSkeleton = () => (
  <div className="flex-1 flex flex-col h-full overflow-hidden text-left bg-white/[0.01] divide-y divide-white/[0.04]">
    {/* Subject banner shimmer */}
    <div className="p-5 animate-pulse bg-black/[0.05] flex flex-col gap-2.5">
      <div className="h-2.5 w-16 bg-indigo-500/20 rounded" />
      <div className="h-5 w-64 bg-white/10 rounded-md" />
    </div>

    {/* Messages shimmers */}
    {Array.from({ length: 2 }).map((_, idx) => (
      <div key={idx} className="p-6 flex flex-col gap-4 animate-pulse">
        <div className="flex items-center justify-between border-b border-white/[0.02] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/10 shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-24 bg-white/10 rounded" />
              <div className="h-2.5 w-36 bg-white/[0.06] rounded" />
            </div>
          </div>
          <div className="h-3 w-28 bg-white/[0.06] rounded" />
        </div>
        
        <div className="pl-8 flex flex-col gap-3">
          <div className="h-3 w-full bg-white/10 rounded-md" />
          <div className="h-3 w-[95%] bg-white/10 rounded-md" />
          <div className="h-3 w-[80%] bg-white/10 rounded-md" />
          <div className="h-3 w-[45%] bg-white/[0.06] rounded-md" />
        </div>

        <div className="pl-8 flex gap-1.5 items-center mt-2">
          <div className="h-3.5 w-16 bg-white/[0.03] border border-white/[0.05] rounded-md" />
          <div className="h-3.5 w-20 bg-white/[0.03] border border-white/[0.05] rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

export default function InboxQueue() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  // Selection and search states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<InboxFilter>(InboxFilter.INBOX);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"NEWEST" | "OLDEST" | "SENDER" | "SUBJECT">("NEWEST");
  
  // Client draft editing and toast states
  const [styleMode, setStyleMode] = useState<"standard" | "brief" | "formal" | "polite">("standard");
  const [editableDraft, setEditableDraft] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 1. Query: Stats
  const { data: stats = { unread: 0, inbox: 0, starred: 0, trash: 0 } } = useQuery<{ unread: number; inbox: number; starred: number; trash: number }>({
    queryKey: ["inboxStats"],
    queryFn: async () => {
      const res = await fetch("/api/inbox/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    }
  });

  // 2. Query: Gmail connection status
  const { data: syncStatus = { connected: false, isSyncing: false, lastSuccessfulSync: "", connectedEmail: "" } } = useQuery<{ connected: boolean; isSyncing: boolean; lastSuccessfulSync: string; connectedEmail: string }>({
    queryKey: ["gmailSyncStatus"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/status");
      if (!res.ok) throw new Error("Failed to load status");
      const data = await res.json();
      return {
        connected: data.status === "CONNECTED" || data.status === "REVOKED",
        isSyncing: data.isSyncing || false,
        lastSuccessfulSync: data.lastSuccessfulSync ? new Date(data.lastSuccessfulSync).toLocaleString() : "Never",
        connectedEmail: data.email || ""
      };
    }
  });

  // 3. Query: Emails List
  const { data: emailsData, isLoading: loadingEmails } = useQuery<{ items: InboxItemDTO[]; nextCursor: string | null }>({
    queryKey: ["emails", activeFilter, sortOption, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "25");
      params.set("filter", activeFilter);
      params.set("sort", sortOption);
      if (searchQuery.trim()) {
        params.set("search", searchQuery);
      }
      const res = await fetch(`/api/inbox?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch emails");
      const data = await res.json();
      return data;
    },
    refetchInterval: 10000, // Auto-refresh inbox emails list every 10 seconds
  });

  const emails: InboxItemDTO[] = emailsData?.items || [];
  const nextCursor = emailsData?.nextCursor || null;

  // Auto-select first email in list if none is selected
  useEffect(() => {
    if (emails.length > 0 && !selectedId) {
      setSelectedId(emails[0].id);
    }
  }, [emails, selectedId]);

  // 4. Query: Thread & Details
  const { data: threadDetails, isLoading: loadingThread } = useQuery<{ details: EmailDetailDTO; thread: ThreadResponse | null; draftText: string } | null>({
    queryKey: ["emailThread", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const detailRes = await fetch(`/api/inbox/${selectedId}`);
      if (!detailRes.ok) throw new Error("Failed to load details");
      const details: EmailDetailDTO = await detailRes.json();

      const threadRes = await fetch(`/api/inbox/thread/${details.threadId}`);
      let thread: ThreadResponse | null = null;
      if (threadRes.ok) {
        thread = await threadRes.json();
      }

      // Load draft response if available
      const draftRes = await fetch(`/api/drafts`);
      let draftText = "";
      if (draftRes.ok) {
        const draftsList = await draftRes.json();
        const linkedDraft = draftsList.find((d: any) => d.emailId === selectedId);
        if (linkedDraft) {
          draftText = linkedDraft.draftContent || "";
        }
      }

      return { details, thread, draftText };
    },
    enabled: !!selectedId
  });

  // Keep local draft text state in sync when thread query loads
  useEffect(() => {
    if (threadDetails?.draftText !== undefined) {
      setEditableDraft(threadDetails.draftText);
    }
  }, [threadDetails]);

  // 5. Mutation: Sync Now Trigger
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      if (res.status === 409) {
        return { inProgress: true };
      }
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onMutate: () => {
      setToastMessage("Gmail synchronization started...");
      setTimeout(() => setToastMessage(""), 5000);
    },
    onSuccess: (data) => {
      if (data.inProgress) {
        setToastMessage("Sync is already running in the background...");
      } else {
        setToastMessage(`Sync completed. Imported ${data.created} new, updated ${data.updated} emails.`);
        queryClient.invalidateQueries({ queryKey: ["emails"] });
        queryClient.invalidateQueries({ queryKey: ["inboxStats"] });
        queryClient.invalidateQueries({ queryKey: ["gmailSyncStatus"] });
      }
    },
    onError: (err: any) => {
      setToastMessage(`Sync failed: ${err.message || "Server error"}`);
    },
    onSettled: () => {
      setTimeout(() => setToastMessage(""), 4000);
    }
  });

  // 5.5 Query: Background Auto-Sync
  useQuery({
    queryKey: ["gmailAutoSync"],
    queryFn: async () => {
      if (!syncStatus.connected) return null;
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      if (res.status === 409) return { created: 0, updated: 0 }; // Ignore quietly if already syncing
      if (!res.ok) throw new Error("Auto-sync failed");
      const data = await res.json();
      
      // If there were changes, update the UI data
      if (data.created > 0 || data.updated > 0) {
        queryClient.invalidateQueries({ queryKey: ["emails"] });
        queryClient.invalidateQueries({ queryKey: ["inboxStats"] });
        queryClient.invalidateQueries({ queryKey: ["gmailSyncStatus"] });
      }
      return data;
    },
    refetchInterval: 30000, // Sync with Gmail every 30 seconds
    enabled: syncStatus.connected,
  });

  // 6. Mutation: Bulk Actions
  const actionMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string; ids: string[] }) => {
      const res = await fetch("/api/inbox/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids })
      });
      if (!res.ok) throw new Error("Bulk action failed");
      return res.json();
    },
    onMutate: async ({ action, ids }) => {
      await queryClient.cancelQueries({ queryKey: ["emails"] });
      await queryClient.cancelQueries({ queryKey: ["inboxStats"] });

      const prevEmails = queryClient.getQueryData(["emails", activeFilter, sortOption, searchQuery]);

      // Optimistic updates
      if (prevEmails) {
        queryClient.setQueryData(
          ["emails", activeFilter, sortOption, searchQuery],
          (old: any) => {
            if (!old) return old;
            let updatedItems = [...old.items];
            if (action === "MARK_READ") {
              updatedItems = updatedItems.map(e => ids.includes(e.id) ? { ...e, status: "READ" as any } : e);
            } else if (action === "MARK_UNREAD") {
              updatedItems = updatedItems.map(e => ids.includes(e.id) ? { ...e, status: "UNREAD" as any } : e);
            } else if (action === "ARCHIVE" || action === "TRASH") {
              updatedItems = updatedItems.filter(e => !ids.includes(e.id));
            }
            return { ...old, items: updatedItems };
          }
        );
      }

      return { prevEmails };
    },
    onError: (err, variables, context) => {
      if (context?.prevEmails) {
        queryClient.setQueryData(
          ["emails", activeFilter, sortOption, searchQuery],
          context.prevEmails
        );
      }
      setToastMessage("Failed to execute email action. Rolled back.");
    },
    onSuccess: (data, variables) => {
      const failedCount = data.failed ? data.failed.length : 0;
      if (failedCount > 0) {
        setToastMessage(`Action partially completed. ${data.successful.length} succeeded, ${failedCount} failed.`);
      } else {
        setToastMessage(`Bulk action completed successfully.`);
      }
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["inboxStats"] });
    },
    onSettled: () => {
      setSelectedIds(new Set());
      setTimeout(() => setToastMessage(""), 4000);
    }
  });
  // 7. Mutation: Manual AI Draft Generation
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
      setToastMessage("AI response draft generated successfully.");
      setTimeout(() => setToastMessage(""), 4000);
      // Invalidate target email thread query caches
      queryClient.invalidateQueries({ queryKey: ["emailThread", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
    onError: (err: any) => {
      setToastMessage(err.message || "Failed to generate AI draft.");
      setTimeout(() => setToastMessage(""), 4000);
    }
  });
  // Action dispatcher helper
  const handleExecuteAction = (action: "MARK_READ" | "MARK_UNREAD" | "ARCHIVE" | "TRASH" | "RESTORE", targetIds: string[]) => {
    actionMutation.mutate({ action, ids: targetIds });
  };

  // Checkbox toggle helpers
  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map(e => e.id)));
    }
  };

  // AI draft style modifier simulation
  const updateDraftText = (mode: "standard" | "brief" | "formal" | "polite") => {
    setStyleMode(mode);
    if (!threadDetails?.details) return;
    const baseText = threadDetails.draftText || "Thank you for reaching out. We are looking into this.";
    let text = baseText;

    if (mode === "brief") {
      text = baseText.slice(0, Math.floor(baseText.length * 0.5)) + "...";
    } else if (mode === "formal") {
      text = `Dear Partner,\n\nRegarding the proposal review. ${baseText}\n\nBest Regards,\nAlex`;
    } else if (mode === "polite") {
      text = `Hello!\n\nHope you're having a great day. ${baseText}\n\nWarmly,\nAlex`;
    }
    setEditableDraft(text);
  };

  // Draft approvals
  const handleApprove = async () => {
    if (!threadDetails?.details) return;
    setIsSending(true);
    try {
      setToastMessage("Triage action simulated successfully.");
    } catch (err) {
      console.error(err);
      setToastMessage("Error triaging draft.");
    } finally {
      setIsSending(false);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  // Navigation Folder configs
  const folderTabs = [
    { filter: InboxFilter.INBOX, label: "Inbox", icon: Inbox, count: stats.inbox },
    { filter: InboxFilter.UNREAD, label: "Unread", icon: Clock, count: stats.unread },
    { filter: InboxFilter.STARRED, label: "Starred", icon: Star, count: stats.starred },
    { filter: InboxFilter.SENT, label: "Sent", icon: Send, count: 0 },
    { filter: InboxFilter.ARCHIVED, label: "Archive", icon: Archive, count: 0 },
    { filter: InboxFilter.TRASH, label: "Trash", icon: Trash2, count: stats.trash },
  ];

  return (
    <div className="flex-1 h-full p-4 md:p-6 flex flex-col gap-6 relative select-none max-w-[1600px] mx-auto w-full overflow-hidden">
      
      {/* Toast popup */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl bg-indigo-950/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Status Header Widgets */}
      <div className="glass-panel p-4 border border-white/[0.04] bg-white/[0.01] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 select-text">
        <div className="flex items-center gap-3 text-left">
          <div className={`w-3 h-3 rounded-full ${syncStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
          <div>
            <span className="text-xs font-bold text-slate-200">
              {syncStatus.connected ? `Gmail Linked (${syncStatus.connectedEmail})` : "Gmail Disconnected"}
            </span>
            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Last synced: {syncStatus.lastSuccessfulSync}</span>
          </div>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncStatus.isSyncing || syncMutation.isPending || !syncStatus.connected}
          className="px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {syncStatus.isSyncing || syncMutation.isPending ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" /> Syncing Inbox...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" /> Sync Now
            </>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Folders navigation */}
        <div className="lg:w-48 shrink-0 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 select-none">
          {folderTabs.map((tab) => {
            const isActive = activeFilter === tab.filter;
            return (
              <button
                key={tab.filter}
                onClick={() => {
                  setActiveFilter(tab.filter);
                  setSelectedId(null);
                }}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold tracking-wide capitalize shrink-0 transition-all cursor-pointer ${
                  isActive 
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" 
                    : "bg-white/[0.01] border-white/[0.04] text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <tab.icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </div>
                {tab.count > 0 && (
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Column 1: Triage list queue */}
        <div className="flex-1 lg:max-w-xs shrink-0 glass-panel border border-white/[0.06] bg-black/20 flex flex-col h-full overflow-hidden min-h-[300px]">
          {/* Header toolbar */}
          <div className="h-[64px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-4 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={emails.length > 0 && selectedIds.size === emails.length}
                onChange={handleToggleSelectAll}
                className="rounded border-white/[0.1] bg-black/40 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-300 font-mono">Triage Queue</span>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExecuteAction("MARK_READ", Array.from(selectedIds))}
                  className="p-1.5 rounded hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Mark Read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExecuteAction("ARCHIVE", Array.from(selectedIds))}
                  className="p-1.5 rounded hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Archive"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExecuteAction("TRASH", Array.from(selectedIds))}
                  className="p-1.5 rounded hover:bg-white/[0.05] text-rose-500 hover:text-rose-400 cursor-pointer"
                  title="Move to Trash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-white/[0.03] bg-white/[0.01] shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Search mail..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors font-sans"
              />
            </div>
          </div>

          {/* Scrollable Email Queue */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] flex flex-col">
            {loadingEmails ? (
              <EmailListSkeleton />
            ) : emails.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 select-text">
                <FolderOpen className="w-8 h-8 text-slate-600 mb-3" />
                <span className="text-xs font-semibold text-slate-500">No emails found</span>
              </div>
            ) : (
              emails.map((mail) => {
                const isSelected = mail.id === selectedId;
                const isChecked = selectedIds.has(mail.id);
                return (
                  <div
                    key={mail.id}
                    onClick={() => setSelectedId(mail.id)}
                    className={`p-4 cursor-pointer text-left transition-all relative border-b border-white/[0.02] flex gap-3 ${
                      isSelected ? "bg-indigo-500/[0.03]" : "hover:bg-white/[0.01]"
                    }`}
                  >
                    {isSelected && (
                      <motion.div 
                        layoutId="active-email-tab-border"
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500"
                      />
                    )}
                    <div className="pt-0.5">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => handleToggleSelectOne(mail.id, e)}
                        onChange={() => {}}
                        className="rounded border-white/[0.1] bg-black/40 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-200 truncate pr-2">
                          {mail.fromName || mail.from}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">
                          {new Date(mail.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-slate-300 truncate font-display">
                          {mail.subject}
                        </span>
                        {mail.messageCount > 1 && (
                          <span className="text-[9px] font-bold font-mono px-1 py-0.25 rounded bg-white/[0.04] text-slate-400">
                            {mail.messageCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed font-light mb-1.5">
                        {mail.snippet || mail.body}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        {mail.labelIds.filter(l => !["INBOX", "UNREAD"].includes(l)).slice(0, 2).map((label, idx) => (
                          <span key={idx} className="text-[8px] font-mono px-1 py-0.25 rounded bg-white/[0.02] border border-white/[0.04] text-slate-400 select-text uppercase">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Middle Email Thread & Context View */}
        <div className="flex-1 glass-panel border border-white/[0.06] bg-black/20 flex flex-col h-full overflow-hidden select-text">
          {loadingThread ? (
            <ThreadSkeleton />
          ) : threadDetails?.details && threadDetails?.thread ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden text-left">
              {/* Header */}
              <div className="h-[64px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0 uppercase">
                    {threadDetails.thread.sender[0]}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate">{threadDetails.thread.sender}</span>
                    <span className="text-[9px] text-slate-500 font-mono truncate">
                      Participants: {threadDetails.thread.participants.length} users
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => handleExecuteAction("ARCHIVE", [threadDetails.details.id])}
                    className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                  <button 
                    onClick={() => handleExecuteAction("TRASH", [threadDetails.details.id])}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Trash
                  </button>
                </div>
              </div>

              {/* Thread Messages List */}
              <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-white/[0.04] bg-white/[0.01]">
                <div className="p-5 border-b border-white/[0.03] bg-black/[0.05]">
                  <span className="text-[9px] text-indigo-400 font-mono uppercase tracking-wider block mb-1">Subject</span>
                  <h3 className="text-base font-bold text-slate-100 font-display leading-snug">{threadDetails.thread.subject}</h3>
                </div>

                {threadDetails.thread.messages.map((msg) => {
                  const isHTML = !!msg.bodyHtml;
                  return (
                    <div key={msg.id} className="p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-white/[0.02] pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase shrink-0">
                            {msg.fromName ? msg.fromName[0] : msg.from[0]}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">
                              {msg.fromName || msg.from}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{msg.from}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.receivedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="pl-8 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-light max-w-2xl font-sans">
                        {isHTML ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: msg.bodyHtml! }} 
                            className="prose prose-invert max-w-none text-xs leading-relaxed"
                          />
                        ) : (
                          msg.bodyText || msg.body
                        )}
                      </div>

                      <div className="pl-8 flex flex-wrap gap-1.5 items-center mt-2">
                        {msg.hasAttachments && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                            Attachment detected
                          </span>
                        )}
                        {msg.labelIds.map((l, idx) => (
                          <span key={idx} className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/[0.02] border border-white/[0.04] text-slate-400 uppercase">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Inbox className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
              <span className="text-sm font-semibold text-slate-400">Select an email to view details</span>
            </div>
          )}
        </div>

        {/* Column 3: AI Assistant Drafting (optional rendering) */}
        {threadDetails?.details && (threadDetails.details as any).draft && (
          <div className="lg:w-85 shrink-0 glass-panel border border-white/[0.06] bg-black/20 flex flex-col h-full overflow-hidden text-left justify-between">
            <div className="h-[64px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase text-indigo-400 tracking-wider font-mono">Aura AI Agent</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[9px] font-bold font-mono tracking-wider uppercase">Safe Scan</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
              <div className="p-4 bg-white/[0.01]">
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle 
                          cx="20" 
                          cy="20" 
                          r="17" 
                          className="stroke-white/[0.04]" 
                          strokeWidth="3" 
                          fill="none" 
                        />
                        <circle 
                          cx="20" 
                          cy="20" 
                          r="17" 
                          className="stroke-indigo-500" 
                          strokeWidth="3" 
                          fill="none" 
                          strokeDasharray={`${2 * Math.PI * 17}`}
                          strokeDashoffset={`${2 * Math.PI * 17 * (1 - (((threadDetails.details as any).draft?.confidence) || 90) / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[9px] font-bold font-mono text-white">{((threadDetails.details as any).draft?.confidence) || 90}%</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] text-slate-500 font-mono uppercase block">Confidence</span>
                      <span className="text-[10px] text-slate-400 font-light block">AI Match Score</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Risk Level</span>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded mt-1 inline-block ${
                      (threadDetails.details as any).draft?.riskLevel === "HIGH" 
                        ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" 
                        : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                    }`}>
                      {(threadDetails.details as any).draft?.riskLevel || "LOW"}
                    </span>
                  </div>
                </div>

                {(threadDetails.details as any).draft?.riskLevel === "HIGH" && (
                  <div className="mt-3 p-3 rounded-xl border border-rose-500/10 bg-rose-500/[0.03] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="text-[10px] text-rose-400 font-mono font-semibold uppercase block">Risk Alert Details</span>
                      <p className="text-[11px] text-rose-300 font-light leading-relaxed mt-0.5">
                        {(threadDetails.details as any).draft?.riskAnalysis || "Sensitive terms detected."} Needs verification.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col gap-3 min-h-[300px]">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">AI Draft Response</span>
                
                {threadDetails.draftText ? (
                  <>
                    {/* Style modes revision buttons */}
                    <div className="flex bg-white/[0.02] rounded-lg p-0.5 border border-white/[0.04] text-[10px] font-mono shrink-0 select-none">
                      {(["standard", "brief", "formal", "polite"] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => updateDraftText(style)}
                          className={`flex-1 py-1 rounded text-center capitalize transition-all cursor-pointer ${
                            styleMode === style 
                              ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300" 
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 relative overflow-hidden min-h-[120px]">
                      <textarea 
                        value={editableDraft}
                        onChange={(e) => setEditableDraft(e.target.value)}
                        className="w-full h-full bg-black/40 border border-white/[0.06] rounded-xl p-4 text-xs font-sans text-slate-300 placeholder-slate-500 leading-relaxed resize-none focus:outline-none focus:border-indigo-500/50"
                        placeholder="Drafting response..."
                      />
                      <div className="absolute bottom-2.5 right-3 p-1 text-slate-600 bg-black/40 rounded border border-white/[0.02]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[220px]">
                    <span className="text-xs text-slate-500 font-normal italic font-sans max-w-xs leading-relaxed">
                      No response draft has been generated for this email thread. Click below to generate one.
                    </span>
                    <button
                      onClick={() => selectedId && generateMutation.mutate(selectedId)}
                      disabled={generateMutation.isPending}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Response...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Generate AI Response
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.04] flex flex-col gap-2 bg-black/10 shrink-0">
              <button 
                onClick={handleApprove}
                disabled={isSending || !threadDetails?.draftText}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSending ? "Dispatched..." : "Approve & Send Draft"} <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
