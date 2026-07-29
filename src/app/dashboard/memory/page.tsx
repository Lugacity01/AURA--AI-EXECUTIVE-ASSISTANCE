"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Search, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Clock, 
  Plus, 
  Sliders, 
  Check, 
  ChevronRight,
  ExternalLink,
  Briefcase,
  SlidersHorizontal,
  Mail,
  FileText,
  Bookmark,
  Loader2
} from "lucide-react";

import { useDraftsList } from "@/hooks/use-queries";

// Shimmering skeleton representing Contacts Memory page loading state
const MemorySkeleton = () => (
  <div className="flex-1 h-full flex flex-col lg:flex-row gap-6 animate-pulse text-left h-full overflow-hidden select-none w-full">
    {/* Sidebar list skeleton */}
    <div className="lg:w-80 shrink-0 border border-white/[0.06] bg-black/20 rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
        <div className="h-4 w-28 bg-white/10 rounded" />
        <div className="h-5 w-8 bg-white/10 rounded-full" />
      </div>
      <div className="p-3 border-b border-white/[0.03] bg-white/[0.01]">
        <div className="h-8 bg-white/[0.04] rounded-xl" />
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-3 border border-white/[0.02] bg-white/[0.01] rounded-xl flex flex-col gap-2">
            <div className="h-3.5 w-32 bg-white/10 rounded" />
            <div className="h-2.5 w-20 bg-white/5 rounded" />
            <div className="h-3 w-16 bg-indigo-500/5 rounded mt-1" />
          </div>
        ))}
      </div>
    </div>

    {/* Detail Pane skeleton */}
    <div className="flex-1 border border-white/[0.06] bg-black/20 rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/10" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-28 bg-white/10 rounded" />
            <div className="h-2.5 w-40 bg-white/5 rounded" />
          </div>
        </div>
        <div className="h-7 w-24 bg-white/10 rounded-lg" />
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-36 bg-white/10 rounded" />
            <div className="h-1.5 w-full bg-white/5 rounded-full" />
            <div className="h-24 w-full bg-white/[0.02] border border-white/[0.04] rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-white/[0.02] border border-white/[0.04] rounded-xl" />
            <div className="h-16 bg-white/[0.02] border border-white/[0.04] rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-48 bg-white/10 rounded" />
            <div className="h-24 w-full bg-[#070712] border border-white/[0.04] rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-32 bg-white/10 rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-white/5 rounded-lg" />
              <div className="h-6 w-24 bg-white/5 rounded-lg" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-36 bg-white/10 rounded" />
            <div className="h-16 w-full bg-[#070712] border border-white/[0.04] rounded-xl" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-3.5 w-40 bg-white/10 rounded" />
            <div className="flex flex-col gap-4 pl-4 border-l border-white/10">
              <div className="h-12 w-full bg-white/[0.01] rounded" />
              <div className="h-12 w-full bg-white/[0.01] rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function ContactMemoryHub() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPreference, setNewPreference] = useState("");
  const [editPreferences, setEditPreferences] = useState(false);

  const [emails, setEmails] = useState<any[]>([]);

  const loadContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load contacts", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      const res = await fetch("/api/email");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmails(data);
        }
      }
    } catch (err) {
      console.error("Failed to load emails", err);
    }
  };

  useEffect(() => {
    loadContacts();
    loadEmails();
  }, []);

  const selectedContact = contacts.find(c => c.id === selectedId) || contacts[0];

  const contactEmails = React.useMemo(() => {
    if (!selectedContact) return [];
    const emailLower = selectedContact.email.toLowerCase();
    const nameLower = selectedContact.name.toLowerCase();
    return emails.filter(e => {
      const fromVal = e.from.toLowerCase();
      const fromNameVal = (e.fromName || "").toLowerCase();
      return fromVal.includes(emailLower) || fromNameVal.includes(nameLower);
    });
  }, [emails, selectedContact]);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPreference.trim() || !selectedContact) return;

    try {
      const nextNotes = selectedContact.notes 
        ? `${selectedContact.notes} | ${newPreference.trim()}` 
        : newPreference.trim();

      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContact.id, notes: nextNotes })
      });

      setNewPreference("");
      setEditPreferences(false);
      await loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 h-full p-6 flex flex-col lg:flex-row gap-6 relative select-none max-w-7xl mx-auto w-full overflow-hidden">
      
      {loading ? (
        <MemorySkeleton />
      ) : (
        <>
          {/* Pane 1: Contacts Directory Sidebar */}
          <div className="lg:w-80 shrink-0 glass-panel border border-white/[0.06] bg-black/20 flex flex-col h-full overflow-hidden">
            {/* Aligned Header */}
            <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold tracking-wide text-slate-200 uppercase font-mono">Contacts Memory</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {filteredContacts.length}
              </span>
            </div>

            {/* Search bar wrapper */}
            <div className="p-3 bg-white/[0.01] border-b border-white/[0.03] shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input 
                  type="text" 
                  placeholder="Search contacts..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors font-sans"
                />
              </div>
            </div>

            {/* Contacts directory list */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                  <Users className="w-8 h-8 text-slate-600 mb-3" />
                  <span className="text-xs font-semibold text-slate-500">No contacts found</span>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const selected = contact.id === selectedId;
                  return (
                    <div 
                      key={contact.id}
                      onClick={() => setSelectedId(contact.id)}
                      className={`p-4 cursor-pointer text-left transition-all duration-200 relative ${
                        selected 
                          ? "bg-indigo-500/[0.04]" 
                          : "hover:bg-white/[0.01]"
                      }`}
                    >
                      {selected && (
                        <motion.div 
                          layoutId="active-contact-border"
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <span className="text-xs font-bold text-slate-200 block truncate">{contact.name}</span>
                      <span className="text-[10px] text-slate-500 truncate block mt-0.5">{contact.company}</span>
                      
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[9px] font-semibold text-indigo-400 font-mono">
                          {contact.company ? "Enterprise Client" : "Contact"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pane 2: Detail Profile and AI context panel */}
          <div className="flex-1 glass-panel border border-white/[0.06] bg-black/20 flex flex-col h-full overflow-hidden">
            {selectedContact ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Aligned Header */}
                <div className="h-[72px] shrink-0 border-b border-white/[0.04] bg-black/[0.15] px-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0">
                      {selectedContact.name[0]}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 truncate">{selectedContact.name}</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 shrink-0">
                          {selectedContact.company ? "Key Partner" : "Contact"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono truncate">{selectedContact.email} // {selectedContact.company}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a 
                      href={`mailto:${selectedContact.email}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email Contact
                    </a>
                  </div>
                </div>

                {/* Profile body content split columns */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                  
                  {/* Left detail column: AI context memory */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-indigo-400 font-mono font-semibold uppercase tracking-wider block">Relationship Profile</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <span>Relationship Strength:</span>
                          <span className="text-indigo-400 font-bold">95%</span>
                        </div>
                      </div>

                      {/* Health score visual meter */}
                      <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-4 border border-white/[0.02]">
                        <motion.div 
                          key={selectedContact.id}
                          initial={{ width: 0 }}
                          animate={{ width: "95%" }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"
                        />
                      </div>

                      <p className="text-sm text-slate-300 font-light leading-relaxed whitespace-pre-line bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl font-sans">
                        {selectedContact.notes 
                          ? `Aura has recorded the following custom instruction notes for ${selectedContact.name}:\n\n"${selectedContact.notes}"`
                          : `Aura is tracking correspondence history. You can click "Add preference" to customize writing tones, template overrides, or scheduling constraints for replies to ${selectedContact.name}.`}
                      </p>
                    </div>

                    {/* Extended Specifications Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">Last Conversation</span>
                        <span className="text-xs font-semibold text-slate-200 mt-1 block">
                          {contactEmails.length > 0 
                            ? new Date(contactEmails[0].receivedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                            : new Date(selectedContact.lastInteraction).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">Total Exchange Volume</span>
                        <span className="text-xs font-semibold text-indigo-400 mt-1 block font-mono">
                          {contactEmails.length} messages
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-indigo-400 font-mono font-semibold uppercase tracking-wider block">Communication Rules & Preferences</span>
                        <button 
                          onClick={() => setEditPreferences(!editPreferences)}
                          className="text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer"
                        >
                          {editPreferences ? "Cancel" : "Add preference"}
                        </button>
                      </div>
                      
                      {editPreferences && (
                        <form onSubmit={handleAddPreference} className="mb-4 flex gap-2">
                          <input 
                            type="text" 
                            placeholder="e.g. Needs pricing details formatted as tables..." 
                            value={newPreference}
                            onChange={(e) => setNewPreference(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                          />
                          <button 
                            type="submit"
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                          >
                            Save
                          </button>
                        </form>
                      )}

                      <div className="p-5 rounded-xl border border-white/[0.04] bg-[#070712] flex flex-col gap-4 text-left">
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono uppercase block">Writing Tone & Style</span>
                          <p className="text-xs text-slate-300 mt-1 font-light">Direct, Action-oriented, Bullet summaries</p>
                        </div>
                        <div className="border-t border-white/[0.03] pt-4">
                          <span className="text-[10px] text-slate-500 font-mono uppercase block">Current Notes</span>
                          <p className="text-xs text-slate-300 mt-1 font-light font-sans">{selectedContact.notes || "No custom instructions saved yet."}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right detail column: historic timeline and topics */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Frequently Discussed Topics */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-2">Discussed Topics / Subjects</span>
                      <div className="flex flex-wrap gap-2">
                        {contactEmails.length > 0 ? (
                          contactEmails.map(e => e.subject.replace(/re:\s*/i, "")).filter(Boolean).slice(0, 3).map((topic, index) => (
                            <span key={index} className="px-2.5 py-1 rounded-lg border border-white/[0.04] bg-white/[0.01] text-xs text-slate-300 font-light flex items-center gap-1 select-all">
                              <Bookmark className="w-3 h-3 text-indigo-400 shrink-0" />
                              {topic}
                            </span>
                          ))
                        ) : (
                          ["General Thread", "Sync Proposal"].map((topic, index) => (
                            <span key={index} className="px-2.5 py-1 rounded-lg border border-white/[0.04] bg-white/[0.01] text-xs text-slate-400 font-light flex items-center gap-1">
                              <Bookmark className="w-3 h-3 text-slate-600 shrink-0" />
                              {topic}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Recent Attachments */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-2">Recent Shared Attachments</span>
                      <div className="flex flex-col gap-2">
                        {contactEmails.filter(e => e.hasAttachments).length > 0 ? (
                          contactEmails.filter(e => e.hasAttachments).slice(0, 2).map((e, index) => (
                            <div key={index} className="p-2.5 rounded-lg border border-white/[0.04] bg-[#070712] flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                <span className="text-slate-300 font-light truncate max-w-[180px]">{e.subject}_attachment.pdf</span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest shrink-0">Received</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] text-center text-slate-500 text-xs italic">
                            No shared attachments found.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Historic timeline */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-4">Historic Exchanges Timeline</span>
                      
                      <div className="flex flex-col gap-6 border-l border-white/[0.06] pl-4 relative ml-2">
                        {contactEmails.length > 0 ? (
                          contactEmails.slice(0, 4).map((e, idx) => (
                            <div key={idx} className="relative text-left flex flex-col gap-1 pl-4 group">
                              <span className="absolute -left-[21.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 ring-2 ring-indigo-500/20 border border-indigo-500 group-hover:bg-indigo-400 group-hover:scale-110 transition-all duration-300" />
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(e.receivedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-slate-200 leading-snug group-hover:text-indigo-300 transition-colors font-display truncate block max-w-full">{e.subject}</span>
                              <p className="text-[11px] text-slate-400 font-light leading-relaxed truncate block max-w-full">
                                {e.snippet || e.body.slice(0, 80) + "..."}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-500 text-xs italic">
                            No email history found in database.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Users className="w-12 h-12 text-slate-600 mb-4" />
                <span className="text-sm font-semibold text-slate-400">Select a contact to view memory details</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
