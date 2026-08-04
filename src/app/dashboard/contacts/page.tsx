"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Upload } from "lucide-react";

export default function ContactsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Group Form State
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [groupError, setGroupError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactsRes, groupsRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/groups")
      ]);
      
      if (!contactsRes.ok) throw new Error("Failed to load contacts");
      
      const contactsData = await contactsRes.json();
      const groupsData = groupsRes.ok ? await groupsRes.json() : [];
      
      setContacts(contactsData.contacts || []);
      setGroups(groupsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, jobTitle, groupIds: selectedGroups }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create contact");
      }

      setIsModalOpen(false);
      setName(""); setEmail(""); setCompany(""); setJobTitle(""); setSelectedGroups([]);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGroupSubmitting(true);
    setGroupError("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, description: groupDescription }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }

      setIsGroupModalOpen(false);
      setGroupName(""); setGroupDescription("");
      fetchData();
    } catch (err: any) {
      setGroupError(err.message);
    } finally {
      setIsGroupSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).map(r => r.split(","));
        
        // Naive CSV parsing assuming: Name, Email, Company, JobTitle
        for (let i = 1; i < rows.length; i++) {
          const [name, email, company, jobTitle] = rows[i];
          if (!name || !email) continue;
          
          await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              name: name.trim(), 
              email: email.trim(), 
              company: company?.trim(), 
              jobTitle: jobTitle?.trim() 
            }),
          });
        }
      } catch (err) {
        console.error("CSV Import error:", err);
      } finally {
        // Reset file input so the same file can be uploaded again if needed
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchData();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">All Contacts</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsGroupModalOpen(true)}
            className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Group
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Contact
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No contacts yet</h3>
          <p className="text-zinc-400 max-w-sm mb-6">
            Add contacts manually or import them from a CSV to get started with AI Campaigns.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition"
            >
              Add Contact
            </button>
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {(() => {
            // Group contacts for segmented UI
            const contactsByGroup: Record<string, any[]> = {};
            groups.forEach(g => { contactsByGroup[g.name] = []; });
            contactsByGroup["Ungrouped Contacts"] = [];

            contacts.forEach(c => {
              if (!c.groupMemberships || c.groupMemberships.length === 0) {
                contactsByGroup["Ungrouped Contacts"].push(c);
              } else {
                c.groupMemberships.forEach((gm: any) => {
                  if (gm.group && contactsByGroup[gm.group.name]) {
                    contactsByGroup[gm.group.name].push(c);
                  }
                });
              }
            });

            return Object.entries(contactsByGroup).map(([groupName, groupContacts]) => {
              if (groupContacts.length === 0) return null;
              
              return (
                <div key={groupName} className="flex flex-col gap-3">
                  <h3 className="text-lg font-medium text-white px-2 border-l-2 border-indigo-500 pl-3">{groupName}</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-zinc-400">
                      <thead className="bg-white/5 border-b border-white/10 text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="px-6 py-4 font-medium">Name</th>
                          <th className="px-6 py-4 font-medium">Email</th>
                          <th className="px-6 py-4 font-medium">Company</th>
                          <th className="px-6 py-4 font-medium">Title</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {groupContacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-6 py-4 text-white font-medium">{contact.name}</td>
                            <td className="px-6 py-4">{contact.email}</td>
                            <td className="px-6 py-4">{contact.company || "-"}</td>
                            <td className="px-6 py-4">{contact.jobTitle || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-medium text-white">Add New Contact</h3>
                <p className="text-sm text-zinc-400 mt-1">Add a new person to your Aura database.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateContact} className="p-6 flex flex-col gap-5">
              {error && <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-start gap-2">
                <div className="mt-0.5">⚠️</div>
                <div>{error}</div>
              </div>}
              
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Full Name <span className="text-red-400">*</span></label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="Sarah Jenkins" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Email Address <span className="text-red-400">*</span></label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="sarah@example.com" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Company</label>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="Acme Corp" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Job Title</label>
                  <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="VP of Marketing" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-300">Assign to Group (Optional)</label>
                <select 
                  value={selectedGroups.length > 0 ? selectedGroups[0] : ""} 
                  onChange={e => setSelectedGroups(e.target.value ? [e.target.value] : [])} 
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition appearance-none"
                >
                  <option value="">No Group (Ungrouped)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-6 flex items-center justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white px-5 py-2.5 rounded-full text-sm font-medium transition hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsGroupModalOpen(false)}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-medium text-white">New Group</h3>
                <p className="text-sm text-zinc-400 mt-1">Create a segment for your contacts.</p>
              </div>
              <button onClick={() => setIsGroupModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="p-6 flex flex-col gap-4">
              {groupError && <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">{groupError}</div>}
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-300">Group Name <span className="text-red-400">*</span></label>
                <input required type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="e.g. Frontend Devs" />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-300">Description</label>
                <textarea value={groupDescription} onChange={e => setGroupDescription(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20 min-h-[100px] resize-none" placeholder="Optional description for this group..." />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="text-zinc-400 hover:text-white px-5 py-2.5 rounded-full text-sm font-medium transition hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" disabled={isGroupSubmitting} className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50">
                  {isGroupSubmitting ? "Saving..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
