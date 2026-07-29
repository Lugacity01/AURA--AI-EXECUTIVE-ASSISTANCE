"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { 
  Sparkles, 
  Send, 
  MessageSquare, 
  AlertTriangle,
  User,
  RefreshCw,
  X
} from "lucide-react";

// Mock preset shortcuts
const PRESETS = [
  "Summarize today's emails.",
  "Find invoices from Microsoft.",
  "Explain why Marcus's email needs approval.",
  "Draft a follow-up to Sarah Jenkins.",
  "Review calendar openings for next week."
];

interface ChatMessage {
  id: string;
  sender: "aura" | "user";
  text: string;
  meta?: {
    type?: "summary" | "risk" | string;
    saved?: string;
    approvals?: number;
    risk?: "HIGH" | "MEDIUM" | "LOW";
    confidence?: number;
  };
  hasFailed?: boolean;
}

// Shimmering skeleton representing dialogue items on first load
const ChatSkeleton = () => (
  <div className="flex-1 flex flex-col gap-6 animate-pulse p-4">
    <div className="flex gap-3 max-w-[70%] text-left self-start">
      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="h-3 w-16 bg-white/10 rounded" />
        <div className="h-12 w-64 bg-white/[0.06] rounded-2xl" />
      </div>
    </div>
    
    <div className="flex gap-3 max-w-[70%] text-left self-end flex-row-reverse">
      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
      <div className="flex flex-col gap-1.5 items-end flex-1">
        <div className="h-3 w-12 bg-white/10 rounded" />
        <div className="h-8 w-48 bg-indigo-500/20 rounded-2xl" />
      </div>
    </div>

    <div className="flex gap-3 max-w-[70%] text-left self-start">
      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="h-3 w-20 bg-white/10 rounded" />
        <div className="h-16 w-80 bg-white/[0.06] rounded-2xl" />
      </div>
    </div>
  </div>
);

export default function AIChatConsole() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-msg",
      sender: "aura",
      text: "Good day, Yinka. I have indexed your inbox, CRM records, and calendar slots. Ask me to summarize emails, write drafts, or audit contract terms."
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [toastError, setToastError] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(false);

  // TanStack Mutation for Chat Submissions
  const chatMutation = useMutation({
    mutationFn: async (payload: { text: string; messageId: string }) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload.text })
      });
      if (!res.ok) {
        throw new Error("Aura AI is temporarily offline. Tap retry to send again.");
      }
      return res.json();
    },
    onMutate: (variables) => {
      // If the message is already in our list (e.g. from retry), don't duplicate it.
      // Otherwise, add the user's message.
      setMessages(prev => {
        if (prev.some(m => m.id === variables.messageId)) {
          // Clear any failures on this message
          return prev.map(m => m.id === variables.messageId ? { ...m, hasFailed: false } : m);
        }
        return [...prev, {
          id: variables.messageId,
          sender: "user",
          text: variables.text
        }];
      });
      setToastError("");
    },
    onSuccess: (data, variables) => {
      // Append Aura's reply
      setMessages(prev => [...prev, {
        id: `aura-reply-${Date.now()}`,
        sender: "aura",
        text: data.reply,
        meta: data.meta
      }]);
    },
    onError: (err: any, variables) => {
      // Set error toast
      setToastError(err.message || "Failed to dispatch message to AI agent.");
      // Flag the user message that failed to trigger local Retry buttons
      setMessages(prev => prev.map(m => 
        m.id === variables.messageId ? { ...m, hasFailed: true } : m
      ));
      setTimeout(() => setToastError(""), 5000);
    }
  });

  const handleSendMessage = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;
    const msgId = `user-msg-${Date.now()}`;
    chatMutation.mutate({ text, messageId: msgId });
    setInputVal("");
  };

  const handleRetryMessage = (failedMsg: ChatMessage) => {
    chatMutation.mutate({ text: failedMsg.text, messageId: failedMsg.id });
  };

  return (
    <div className="flex-1 h-full p-4 md:p-6 flex flex-col relative select-none max-w-4xl mx-auto w-full overflow-hidden">
      
      {/* Toast popup */}
      <AnimatePresence>
        {toastError && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl bg-rose-950/90 border border-rose-500/30 text-rose-300 text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            <span>{toastError}</span>
            <button onClick={() => setToastError("")} className="p-0.5 rounded hover:bg-white/10 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="border-b border-white/[0.04] pb-4 shrink-0 text-left flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
            Aura AI Console
          </h2>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            Context-aware chat assistant connected to your inbox, contacts, and calendar.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[9px] font-bold font-mono tracking-wider uppercase">Active Context</span>
        </div>
      </div>

      {/* Message scroll container */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-4 min-h-0">
        {isPageLoading ? (
          <ChatSkeleton />
        ) : (
          messages.map((msg) => {
            const isAura = msg.sender === "aura";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[85%] text-left ${isAura ? "self-start" : "self-end flex-row-reverse"}`}
              >
                {/* Avatar indicator */}
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                  isAura 
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                    : "bg-white/[0.04] border-white/[0.08] text-slate-300"
                }`}>
                  {isAura ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message block */}
                <div className="flex flex-col gap-2">
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap relative group ${
                    isAura 
                      ? "bg-white/[0.01] border border-white/[0.05] text-slate-300 font-light" 
                      : msg.hasFailed
                      ? "bg-rose-950/20 border border-rose-500/30 text-rose-300 font-medium"
                      : "bg-indigo-600 text-white font-medium"
                  }`}>
                    {renderFormattedContent(msg.text)}

                    {/* Local message-level retry trigger */}
                    {msg.hasFailed && (
                      <div className="mt-3 pt-2 border-t border-rose-500/20 flex items-center justify-between gap-4">
                        <span className="text-[10px] text-rose-400 font-sans font-light">Delivery failed.</span>
                        <button
                          onClick={() => handleRetryMessage(msg)}
                          className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry Send
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Optional response widgets */}
                  {isAura && msg.meta && (
                    <div className="grid grid-cols-2 gap-2 mt-1 shrink-0">
                      {msg.meta.type === "summary" && (
                        <>
                          <div className="p-2.5 rounded-xl border border-white/[0.04] bg-[#070712] text-left">
                            <span className="text-[9px] text-slate-500 font-mono uppercase block">Estimated Time Reclaimed</span>
                            <span className="text-xs font-bold text-indigo-400 font-mono mt-0.5 block">{msg.meta.saved}</span>
                          </div>
                          <div className="p-2.5 rounded-xl border border-white/[0.04] bg-[#070712] text-left">
                            <span className="text-[9px] text-slate-500 font-mono uppercase block">Requires Confirmation</span>
                            <span className="text-xs font-bold text-amber-400 font-mono mt-0.5 block">{msg.meta.approvals} files</span>
                          </div>
                        </>
                      )}
                      {msg.meta.risk === "HIGH" && (
                        <div className="p-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.02] text-left col-span-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-[10px] font-bold text-rose-400 font-mono uppercase">HIGH COMPLIANCE RISK ({msg.meta.confidence}% confidence)</span>
                          </div>
                          <Link href="/dashboard/approvals" className="text-[9px] font-bold text-slate-400 hover:text-white underline cursor-pointer shrink-0">
                            Review in Approvals
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Aura thinking bubble */}
        {chatMutation.isPending && (
          <div className="flex gap-3 self-start max-w-[85%] text-left">
            <div className="w-8 h-8 rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/[0.05] text-slate-500 text-xs font-mono tracking-widest flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              AURA IS THINKING...
            </div>
          </div>
        )}
      </div>

      {/* Preset pills suggestions */}
      <div className="pb-3 flex gap-2 overflow-x-auto shrink-0 select-none no-scrollbar">
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="px-3 py-1.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] text-[10px] text-slate-400 hover:text-slate-200 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            disabled={chatMutation.isPending}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message input panel */}
      <div className="p-4 border-t border-white/[0.04] bg-black/10 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex gap-2 relative items-center"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={chatMutation.isPending}
            placeholder={chatMutation.isPending ? "Aura is typing a reply..." : "Ask Aura to summarize, write, calendar scan, or explain risk triggers..."}
            className="flex-1 bg-black/40 border border-white/[0.06] rounded-xl py-3 pl-4 pr-12 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={chatMutation.isPending || !inputVal.trim()}
            className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

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
