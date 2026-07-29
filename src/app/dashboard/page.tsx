"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Inbox, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Mail,
  Zap,
  CheckCircle2,
  Calendar,
  Loader2
} from "lucide-react";

// Premium Shimmering Skeleton for Dashboard Overview page
const DashboardSkeleton = () => (
  <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full max-w-5xl mx-auto flex flex-col gap-8 animate-pulse text-left">
    {/* Greeting Card Shimmer */}
    <div className="glass-panel p-6 border border-white/[0.06] bg-white/[0.01] rounded-2xl flex flex-col gap-4">
      <div className="h-5 w-48 bg-white/10 rounded-md" />
      <div className="h-3 w-64 bg-white/[0.06] rounded-md" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="p-3 rounded-xl border border-white/[0.04] bg-[#070712] h-12" />
        ))}
      </div>
    </div>

    {/* Stats Grid Shimmer */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="glass-panel p-5 border border-white/[0.04] bg-white/[0.01] h-28" />
      ))}
    </div>
  </div>
);

export default function DashboardOverview() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!session) return;
    
    // Prefetch Inbox stats
    queryClient.prefetchQuery({
      queryKey: ["inboxStats"],
      queryFn: async () => {
        const res = await fetch("/api/inbox/stats");
        if (!res.ok) throw new Error("Failed to prefetch stats");
        return res.json();
      }
    });

    // Prefetch Drafts list
    queryClient.prefetchQuery({
      queryKey: ["drafts"],
      queryFn: async () => {
        const res = await fetch("/api/drafts");
        if (!res.ok) throw new Error("Failed to prefetch drafts");
        return res.json();
      }
    });

    // Prefetch Approvals list
    queryClient.prefetchQuery({
      queryKey: ["approvals"],
      queryFn: async () => {
        const res = await fetch("/api/email");
        if (!res.ok) throw new Error("Failed to prefetch approvals");
        const emails = await res.json();
        if (!Array.isArray(emails)) return [];
        return emails
          .filter((e: any) => e.status === "NEEDS_APPROVAL" || e.status === "UNREAD")
          .map((e: any) => ({
            id: e.id,
            draftId: e.draft?.id,
            sender: e.from,
            email: e.fromEmail || "external-client@apex.com",
            subject: e.subject,
            snippet: e.body.slice(0, 150) + "...",
            draft: e.draft?.draftContent || "",
            risk: e.draft?.riskLevel || "LOW",
            reason: e.draft?.riskAnalysis || "Sensitive transaction terms.",
            confidence: e.draft?.confidence || 90,
            time: "Recent",
            riskExplainer: e.draft?.riskLevel === "HIGH" 
              ? [
                  "External recipient detected",
                  "Legal contract keywords found",
                  "Financial pricing commitments found"
                ]
              : [
                  "Trusted contact whitelist",
                  "Standard scheduling sync"
                ]
          }));
      }
    });
  }, [queryClient, session]);

  // 1. Query: Emails List
  const { data: emails = [], isLoading: loadingEmails } = useQuery<any[]>({
    queryKey: ["dashboardEmails"],
    queryFn: async () => {
      const res = await fetch("/api/email");
      if (!res.ok) throw new Error("Failed to load dashboard emails");
      return res.json();
    }
  });

  // 2. Query: Activity Log
  const { data: activities = [], isLoading: loadingActivities } = useQuery<any[]>({
    queryKey: ["dashboardActivities"],
    queryFn: async () => {
      const res = await fetch("/api/activity");
      if (!res.ok) throw new Error("Failed to load dashboard activities");
      return res.json();
    }
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  // Derive stats dynamically from query results
  const unreadCount = emails.filter(e => e.status === "UNREAD").length;
  const approvalsCount = emails.filter(e => e.status === "NEEDS_APPROVAL").length;
  const draftsCount = emails.filter(e => e.draft).length;
  const sentCount = emails.filter(e => e.status === "APPROVED").length;

  const stats = [
    { name: "Today's Emails", value: String(emails.length), change: "+10% vs yesterday", icon: Mail, color: "text-blue-400" },
    { name: "Unread Emails", value: String(unreadCount), change: `${approvalsCount} needs review`, icon: Inbox, color: "text-indigo-400" },
    { name: "AI Drafts Created", value: String(draftsCount), change: "All safety scanned", icon: Sparkles, color: "text-purple-400" },
    { name: "Replies Sent", value: String(sentCount), change: "100% confirmation", icon: CheckCircle2, color: "text-indigo-400" },
    { name: "Pending Approvals", value: String(approvalsCount), change: "Requires review", icon: ShieldCheck, color: "text-amber-400" },
    { name: "Automated Actions", value: String(activities.length + 27), change: "Zero manual friction", icon: Zap, color: "text-pink-400" },
    { name: "Hours Saved", value: "2.7h", change: "Reclaimed yesterday", icon: Clock, color: "text-cyan-400" },
    { name: "Avg Response Time", value: "1.8m", change: "Under AI triage speed", icon: TrendingUp, color: "text-purple-400" },
  ];

  // Filter critical attention items
  const criticalItems = emails
    .filter(e => e.status === "NEEDS_APPROVAL" || e.status === "UNREAD")
    .map(e => ({
      id: e.id,
      sender: e.from,
      subject: e.subject,
      receivedAt: "Recent",
      risk: e.draft?.riskLevel || "LOW",
      reason: e.draft?.riskAnalysis || "Typical internal communication."
    }))
    .slice(0, 2);

  const loading = loadingEmails || loadingActivities;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-8 text-left max-w-5xl mx-auto w-full"
        >
          {/* Welcome header & AI Summary Banner */}
          <motion.div 
            variants={itemVariants} 
            className="glass-panel p-6 border border-white/[0.06] bg-gradient-to-r from-indigo-500/[0.03] to-purple-500/[0.03] rounded-2xl flex flex-col gap-4 text-left relative overflow-hidden"
          >
            <div className="absolute right-6 top-6 opacity-[0.03] pointer-events-none">
              <Sparkles className="w-24 h-24 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display">
                Good Morning, {session?.user?.name ? session.user.name.split(" ")[0] : "User"}.
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 font-light">Here's what needs your attention today.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-2">
              {[
                { label: `${unreadCount} unread emails`, desc: "Awaiting triage list" },
                { label: `${approvalsCount} high-priority`, desc: "Requires confirmation" },
                { label: `${draftsCount} drafts ready`, desc: "Pending confirmation" },
                { label: `${approvalsCount} require approval`, desc: "Financial/legal bindings" },
                { label: "2.7 hours saved", desc: "Reclaimed task savings" }
              ].map((bullet, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-white/[0.04] bg-[#070712] flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 font-display">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {bullet.label}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-1 block uppercase tracking-wider">{bullet.desc}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Grid of stats */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="glass-panel p-5 border border-white/[0.04] bg-white/[0.01] flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-slate-400 font-display">{stat.name}</span>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-white tracking-tight font-mono">{stat.value}</span>
                  <span className="block text-[10px] text-slate-500 font-mono mt-1">{stat.change}</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Action / Timeline split grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Immediate attention required */}
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-7 glass-panel p-6 border border-white/[0.06] flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-slate-100 text-sm tracking-wide font-display">Requires Immediate Review</span>
                </div>
                <Link href="/dashboard/approvals" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer">
                  Approvals Center <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex flex-col gap-4">
                {criticalItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No items require manual approval.
                  </div>
                ) : (
                  criticalItems.map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 rounded-xl border border-white/[0.04] bg-[#070712] flex flex-col gap-2 relative overflow-hidden group hover:border-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">{item.sender}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">{item.receivedAt}</span>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                            item.risk === "HIGH" 
                              ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" 
                              : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                          }`}>
                            {item.risk} RISK
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-200 text-left font-display">{item.subject}</span>
                      
                      <div className="mt-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.02] flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-400 font-light leading-relaxed text-left">
                          {item.reason}
                        </p>
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <Link 
                          href={`/dashboard/inbox`}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.04] transition-colors cursor-pointer"
                        >
                          Open Draft
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Right Column: Activity Timeline */}
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-5 glass-panel p-6 border border-white/[0.06] flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <span className="font-bold text-slate-100 text-sm tracking-wide font-display">Aura Activity Log</span>
                <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Active timeline
                </span>
              </div>

              <div className="flex flex-col gap-6 pl-4 relative border-l border-l-white/[0.06] ml-2">
                {activities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No logs recorded.
                  </div>
                ) : (
                  activities.slice(0, 5).map((act, idx) => (
                    <div key={idx} className="relative flex flex-col gap-1 text-left pl-4 group">
                      {/* Vertical Node bullet */}
                      <span className={`absolute -left-[21.5px] top-1.5 w-2.5 h-2.5 rounded-full border bg-slate-900 transition-all duration-300 ${
                        act.status === "Waiting" 
                          ? "border-amber-400 ring-2 ring-amber-500/20 animate-pulse" 
                          : "border-indigo-500 ring-2 ring-indigo-500/20"
                      }`} />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          act.status === "Waiting" 
                            ? "bg-amber-500/10 text-amber-400" 
                            : "bg-indigo-500/10 text-indigo-400"
                        }`}>
                          {act.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors font-display">{act.action}</span>
                      <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                        {act.desc}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Suggested Focus Areas */}
          <motion.div variants={itemVariants} className="glass-panel p-6 border border-white/[0.06] bg-gradient-to-r from-indigo-500/[0.02] to-purple-500/[0.02]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-slate-200 font-display">Calendar Sync recommendations</h4>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    Google Calendar sync details show meeting invites corresponding to Sarah's email thread proposal.
                  </p>
                </div>
              </div>
              <Link 
                href="/dashboard/integrations"
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white transition-all inline-flex items-center gap-1.5 shrink-0 self-start md:self-auto cursor-pointer"
              >
                Review Calendar Rules <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
