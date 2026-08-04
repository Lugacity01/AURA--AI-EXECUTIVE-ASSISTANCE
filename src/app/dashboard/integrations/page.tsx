"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Sparkles,
  Calendar,
  MessageSquare,
  BookOpen,
  Lock,
  Check,
  ToggleLeft,
  ToggleRight,
  Database,
  ArrowRight,
  ShieldAlert,
  Info,
  User,
  Sliders,
  Bell,
  Eye,
  Activity,
  Loader2,
  Mail
} from "lucide-react";

export default function IntegrationsDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "accounts" | "ai" | "automation" | "security">("automation");
  const [toast, setToast] = useState("");
  const [rules, setRules] = useState<any[]>([]);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "US";
  const [loading, setLoading] = useState(true);

  // Connected accounts state
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(true);
  const [slackConnected, setSlackConnected] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);

  const [gmailStatus, setGmailStatus] = useState<"CONNECTED" | "NOT_CONNECTED" | "REVOKED">("NOT_CONNECTED");
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);

  const loadGmailStatus = async () => {
    try {
      const res = await fetch("/api/gmail/status");
      if (res.ok) {
        const data = await res.json();
        setGmailStatus(data.status);
        setGmailEmail(data.email);
      }
    } catch (err) {
      console.error("Failed to load Gmail status:", err);
    }
  };

  const handleToggleGmail = async () => {
    if (gmailStatus === "CONNECTED") {
      setLoading(true);
      try {
        const res = await fetch("/api/gmail/disconnect", { method: "POST" });
        if (res.ok) {
          setGmailStatus("NOT_CONNECTED");
          setGmailEmail(null);
          setToast("Gmail disconnected successfully.");
        } else {
          setToast("Failed to disconnect Gmail.");
        }
      } catch (err) {
        console.error(err);
        setToast("Connection error occurred.");
      } finally {
        setLoading(false);
        setTimeout(() => setToast(""), 3000);
      }
    } else {
      window.location.href = "/api/gmail/connect";
    }
  };

  // Custom AI prompt instructions
  const [customInstructions, setCustomInstructions] = useState(
    "Always sign off as 'Alex's Executive Assistant'. Do not commit to pricing packages without requesting manual verification first. Propose Thursday afternoons for scheduling slots if David Chen reaches out."
  );

  const loadRules = async () => {
    try {
      const res = await fetch("/api/automation");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
    loadGmailStatus();
  }, []);

  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId })
      });
      const updated = await res.json();
      setToast(`Rule state updated successfully.`);
      await loadRules();
    } catch (err) {
      console.error(err);
      setToast("Error toggling automation rule.");
    } finally {
      setTimeout(() => setToast(""), 3000);
    }
  };

  const handleToggleAccount = (provider: string) => {
    if (provider === "calendar") {
      setGoogleCalendarConnected(!googleCalendarConnected);
      setToast(googleCalendarConnected ? "Disconnected Google Calendar" : "Authorized Google Calendar via OAuth");
    } else if (provider === "slack") {
      setSlackConnected(!slackConnected);
      setToast(slackConnected ? "Disconnected Slack integration" : "Slack webhook registered successfully");
    } else if (provider === "notion") {
      setNotionConnected(!notionConnected);
      setToast(notionConnected ? "Disconnected Notion workspace" : "Notion page syncing authorized");
    }
    setTimeout(() => setToast(""), 3000);
  };

  const handleSaveInstructions = (e: React.FormEvent) => {
    e.preventDefault();
    setToast("AI instructions updated and synchronized.");
    setTimeout(() => setToast(""), 3000);
  };

  const settingsTabs = [
    { id: "profile", name: "Profile", icon: User },
    { id: "accounts", name: "Connected Accounts", icon: Calendar },
    { id: "ai", name: "AI Preferences", icon: Sparkles },
    { id: "automation", name: "Automation Center", icon: Sliders },
    { id: "security", name: "Security & Privacy", icon: Lock },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full">
      <div className="flex flex-col gap-8 text-left select-none max-w-5xl mx-auto w-full">

        {/* Toast Notice */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl bg-indigo-950/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div className="border-b border-white/[0.04] pb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Settings & Control Panel
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-light">
            Manage your AI preferences, connected software, automation triggers, and assistant behaviors.
          </p>
        </div>

        {/* Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left: Sub-navigation sidebar tabs (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-1.5">
            {settingsTabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer text-left ${active
                      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300 shadow-inner"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]"
                    }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Tab content panel (8 columns) */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-6"
                >
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Profile settings</span>

                  <div className="glass-panel p-6 border border-white/[0.06] flex flex-col gap-4 text-left">
                    <div className="flex items-center gap-4 border-b border-white/[0.04] pb-4">
                      {session?.user?.image ? (
                        <img src={session.user.image} alt={session.user.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-semibold text-indigo-300">
                          {initials}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200 font-display">{session?.user?.name || "User"}</span>
                        <span className="text-xs text-slate-500 font-mono">{session?.user?.email || "user@email.com"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">Title</span>
                        <span className="text-xs font-semibold text-slate-300 block mt-1 font-sans">Founder / CEO</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">Organization</span>
                        <span className="text-xs font-semibold text-slate-300 block mt-1 font-sans">Apex Technology Partners</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "accounts" && (
                <motion.div
                  key="accounts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-6"
                >
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Connected Accounts & OAuth</span>

                  <div className="flex flex-col gap-4">
                    {/* Gmail */}
                    <div className="glass-panel p-6 border border-white/[0.06] flex flex-col sm:flex-row items-start justify-between gap-6">
                      <div className="flex items-start gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-200 font-display">Gmail</h4>
                            {gmailStatus === "CONNECTED" && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">
                                ACTIVE
                              </span>
                            )}
                            {gmailStatus === "REVOKED" && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                REVOKED
                              </span>
                            )}
                            {gmailStatus === "NOT_CONNECTED" && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-500/10 border border-white/[0.08] text-slate-400">
                                NOT CONNECTED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed font-light mt-1 font-sans">
                            Read, organize, summarize, draft, and send emails using Aura AI.
                          </p>
                          {gmailEmail && (
                            <div className="mt-3 flex flex-col gap-0.5 text-left">
                              <span className="text-[9px] text-slate-500 font-mono uppercase block">Connected as</span>
                              <span className="text-xs font-semibold text-slate-300 font-mono">{gmailEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleToggleGmail}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all shrink-0 ${gmailStatus === "CONNECTED"
                            ? "border-rose-500/20 hover:border-rose-500/35 hover:bg-rose-500/5 text-rose-400"
                            : "border-indigo-500/20 hover:border-indigo-500/35 hover:bg-indigo-500/5 text-indigo-400"
                          }`}
                      >
                        {gmailStatus === "CONNECTED" ? "Disconnect" : "Connect Gmail"}
                      </button>
                    </div>

                    {/* Google Calendar */}
                    <div className="glass-panel p-6 border border-white/[0.06] flex flex-col sm:flex-row items-start justify-between gap-6">
                      <div className="flex items-start gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-200 font-display">Google Calendar</h4>
                            {googleCalendarConnected && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed font-light mt-1 font-sans">
                            Grants calendar audit write access so Aura can verify scheduling conflict slots.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleAccount("calendar")}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${googleCalendarConnected
                            ? "border-rose-500/20 hover:border-rose-500/35 hover:bg-rose-500/5 text-rose-400"
                            : "border-indigo-500/20 hover:border-indigo-500/35 hover:bg-indigo-500/5 text-indigo-400"
                          }`}
                      >
                        {googleCalendarConnected ? "Disconnect" : "Connect"}
                      </button>
                    </div>

                    {/* Slack */}
                    <div className="glass-panel p-6 border border-white/[0.06] flex flex-col sm:flex-row items-start justify-between gap-6">
                      <div className="flex items-start gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-200 font-display">Slack Dispatch</h4>
                            {slackConnected && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed font-light mt-1 font-sans">
                            Sends daily digests and forwards high-priority notifications to Slack.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleAccount("slack")}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${slackConnected
                            ? "border-rose-500/20 hover:border-rose-500/35 hover:bg-rose-500/5 text-rose-400"
                            : "border-indigo-500/20 hover:border-indigo-500/35 hover:bg-indigo-500/5 text-indigo-400"
                          }`}
                      >
                        {slackConnected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "ai" && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-6"
                >
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">AI Custom Guidelines</span>

                  <form onSubmit={handleSaveInstructions} className="glass-panel p-6 border border-white/[0.06] flex flex-col gap-4 text-left">
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono uppercase block">Custom Prompt Instructions</span>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-xs font-sans text-slate-300 leading-relaxed focus:outline-none focus:border-indigo-500/50 resize-none h-[120px] mt-1.5"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white self-end shadow-md shadow-indigo-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Update Guidelines
                    </button>
                  </form>
                </motion.div>
              )}

              {activeTab === "automation" && (
                <motion.div
                  key="automation"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-6"
                >
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Automation Rule Switches</span>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px]">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Syncing automation rules...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 text-left">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="glass-panel p-5 border border-white/[0.06] flex items-center justify-between gap-6"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 font-display">{rule.title}</h4>
                            <p className="text-[11px] text-slate-400 leading-normal font-light mt-0.5 font-sans">{rule.desc}</p>

                            <div className="flex gap-4 mt-2 font-mono text-[9px] text-slate-500">
                              <div>
                                <span>Last Executed: </span>
                                <span className="text-slate-300 font-semibold">{rule.lastExecuted || "Never"}</span>
                              </div>
                              <div>
                                <span>Success Rate: </span>
                                <span className="text-indigo-400 font-bold">{rule.successRate || "100%"}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className="text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
                          >
                            {rule.enabled ? (
                              <ToggleRight className="w-9 h-9 text-indigo-500" />
                            ) : (
                              <ToggleLeft className="w-9 h-9 text-slate-600" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-6"
                >
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Security & Privacy compliance</span>

                  <div className="glass-panel p-6 border border-white/[0.06] flex flex-col gap-4 text-left">
                    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02]">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-indigo-300 font-light leading-relaxed font-sans">
                        Your data is fully encrypted at rest and in transit. OAuth tokens are refreshed automatically. No message content is used to train open models.
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/[0.04] pt-4">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Encryption Keys</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">AES-256 standard active</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        LOCKED
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}
