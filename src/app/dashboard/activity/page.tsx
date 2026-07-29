"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Terminal, 
  Database,
  Search,
  Check,
  Zap,
  ShieldAlert,
  Loader2
} from "lucide-react";

export default function ActivityCenter() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/activity");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleClearLogs = async () => {
    try {
      await fetch("/api/activity", { method: "DELETE" });
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full">
      <div className="flex flex-col gap-8 text-left select-none max-w-5xl mx-auto w-full">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
              Activity Center
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-light">
              Audit timeline logging every background task, AI model call, risk scan, and dispatch outcome.
            </p>
          </div>

          {!loading && logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-rose-500/10 hover:bg-rose-500/5 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            >
              Clear Logs
            </button>
          )}
        </div>

        {/* Search bar wrapper */}
        <div className="glass-panel p-4 border border-white/[0.06] flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Filter activities by category or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0"
          />
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">Loading telemetry logs...</span>
          </div>
        ) : (
          /* Timeline Log Feed */
          <div className="relative flex flex-col gap-6 pl-4 border-l border-white/[0.06] ml-4">
            <AnimatePresence mode="popLayout">
              {filteredLogs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-16 text-center border border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center bg-white/[0.01] -ml-4"
                >
                  <Terminal className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
                  <h4 className="text-base font-bold text-slate-200 font-display">Activity Empty</h4>
                  <p className="text-xs text-slate-500 font-light mt-1">
                    Your assistant hasn't performed any logs matching the queries yet.
                  </p>
                </motion.div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedIds.includes(log.id);
                  const isWaiting = log.status === "Waiting";
                  return (
                    <motion.div
                      key={log.id}
                      layoutId={log.id}
                      exit={{ opacity: 0, y: -10 }}
                      className="relative flex flex-col gap-2 group text-left"
                    >
                      {/* Timeline connecting Node dot icon */}
                      <span className={`absolute -left-[21.5px] top-1.5 w-2.5 h-2.5 rounded-full border bg-slate-900 transition-all duration-300 ${
                        isWaiting 
                          ? "border-amber-400 ring-2 ring-amber-500/20 animate-pulse" 
                          : "border-indigo-500 ring-2 ring-indigo-500/20"
                      }`} />

                      {/* Timeline item summary headers */}
                      <div 
                        onClick={() => toggleExpand(log.id)}
                        className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isWaiting 
                                ? "bg-amber-500/10 text-amber-400" 
                                : "bg-indigo-500/10 text-indigo-400"
                            }`}>
                              {log.action.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-slate-200 block truncate font-display">{log.desc}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isWaiting 
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>

                      {/* Expanded details view panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden p-4 rounded-xl border border-white/[0.04] bg-[#070712] flex flex-col gap-4 text-xs font-light text-slate-300 font-sans"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                              <div>
                                <span className="text-[9px] text-slate-500 font-mono uppercase block">Timestamp</span>
                                <span className="text-xs font-semibold text-slate-200 mt-1 block font-mono">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-mono uppercase block">Tool Used</span>
                                <span className="text-xs font-semibold text-slate-200 mt-1 block flex items-center gap-1">
                                  <Database className="w-3.5 h-3.5 text-indigo-400" /> {log.toolUsed || "Database layer"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-mono uppercase block">Duration</span>
                                <span className="text-xs font-semibold text-slate-200 mt-1 block font-mono">{log.duration || "100ms"}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-mono uppercase block">Trigger Context</span>
                                <span className="text-xs font-semibold text-slate-200 mt-1 block">{log.reason || "Rule assessment hook"}</span>
                              </div>
                            </div>

                            <div className="border-t border-white/[0.03] pt-3">
                              <span className="text-[9px] text-slate-500 font-mono uppercase block text-left">Technical Outcome</span>
                              <p className="text-xs text-indigo-300 mt-1 font-mono leading-relaxed whitespace-pre-wrap text-left">
                                {log.outcome || "Executed safely."}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
