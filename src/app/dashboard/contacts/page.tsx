"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Upload, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import * as xlsx from "xlsx";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Group Form State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [groupError, setGroupError] = useState("");

  // Import State
  const [parsedImportContacts, setParsedImportContacts] = useState<any[]>([]);
  const [importGroupId, setImportGroupId] = useState<string>("");
  const [importNewGroupName, setImportNewGroupName] = useState<string>("");
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);

  // Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactsRes, groupsRes] = await Promise.all([
        fetch("/api/contacts?limit=1000"),
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

  const openCreateContactModal = () => {
    setEditingContactId(null);
    setName(""); setEmail(""); setCompany(""); setJobTitle(""); setSelectedGroups([]);
    setError("");
    setIsModalOpen(true);
  };

  const openEditContactModal = (contact: any) => {
    setEditingContactId(contact.id);
    setName(contact.name);
    setEmail(contact.email);
    setCompany(contact.company || "");
    setJobTitle(contact.jobTitle || "");
    setSelectedGroups(contact.groupMemberships?.map((gm: any) => gm.groupId) || []);
    setError("");
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const url = editingContactId ? `/api/contacts/${editingContactId}` : "/api/contacts";
      const method = editingContactId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, jobTitle, groupIds: selectedGroups }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save contact");
      }

      setIsModalOpen(false);
      fetchData();
      showToast(editingContactId ? "Contact updated successfully!" : "Contact created successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateGroupModal = () => {
    setEditingGroupId(null);
    setGroupName("");
    setGroupDescription("");
    setGroupError("");
    setIsGroupModalOpen(true);
  };

  const openEditGroupModal = (group: any) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupError("");
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGroupSubmitting(true);
    setGroupError("");

    try {
      const url = editingGroupId ? `/api/groups/${editingGroupId}` : "/api/groups";
      const method = editingGroupId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, description: groupDescription }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save group");
      }

      setIsGroupModalOpen(false);
      fetchData();
      showToast(editingGroupId ? "Group updated successfully!" : "Group created successfully!");
    } catch (err: any) {
      setGroupError(err.message);
    } finally {
      setIsGroupSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Group",
      message: `Are you sure you want to delete the group "${name}"? The contacts inside will NOT be deleted, they will just become ungrouped.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete group");
          fetchData();
        } catch (err: any) {
          setAlertConfig({ isOpen: true, title: "Error", message: err.message });
        }
      }
    });
  };

  const handleDeleteContact = async (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Contact",
      message: `Are you sure you want to permanently delete ${name}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete contact");
          fetchData();
        } catch (err: any) {
          setAlertConfig({ isOpen: true, title: "Error", message: err.message });
        }
      }
    });
  };

  const handleDeleteUngrouped = async (count: number) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete All Ungrouped Contacts",
      message: `Are you sure you want to permanently delete all ${count} ungrouped contacts? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/contacts/bulk-ungrouped`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete ungrouped contacts");
          setSelectedContactIds(new Set());
          fetchData();
        } catch (err: any) {
          setAlertConfig({ isOpen: true, title: "Error", message: err.message });
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedContactIds.size === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: "Delete Selected Contacts",
      message: `Are you sure you want to permanently delete ${selectedContactIds.size} selected contacts?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/contacts/bulk`, { 
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactIds: Array.from(selectedContactIds) })
          });
          if (!res.ok) throw new Error("Failed to bulk delete contacts");
          setSelectedContactIds(new Set());
          fetchData();
        } catch (err: any) {
          setAlertConfig({ isOpen: true, title: "Error", message: err.message });
        }
      }
    });
  };

  const handleToggleContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedContactIds(next);
  };

  const handleToggleGroup = (groupContacts: any[]) => {
    const allSelected = groupContacts.every(c => selectedContactIds.has(c.id));
    const next = new Set(selectedContactIds);
    if (allSelected) {
      groupContacts.forEach(c => next.delete(c.id));
    } else {
      groupContacts.forEach(c => next.add(c.id));
    }
    setSelectedContactIds(next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Parse as JSON array of objects
      const jsonData = xlsx.utils.sheet_to_json(worksheet) as Record<string, string>[];
      
      const parsedContacts = jsonData.map(row => {
        // Try to flexibly find columns for name, email, company, job title
        const getVal = (keys: string[]) => {
          const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
          return key ? String(row[key]) : undefined;
        };

        return {
          name: getVal(["name", "full name", "contact name", "first name"]), // Note: 'first name' works if there's no full name
          email: getVal(["email", "e-mail", "email address"]),
          company: getVal(["company", "organization", "org", "employer"]),
          jobTitle: getVal(["job title", "title", "role", "position"])
        };
      }).filter(c => c.name && c.email); // Only keep contacts with name and email

      if (parsedContacts.length > 0) {
        setParsedImportContacts(parsedContacts);
        setImportGroupId("");
        setImportNewGroupName("");
        setIsImportModalOpen(true);
      } else {
        setAlertConfig({ isOpen: true, title: "Import Failed", message: "No valid contacts found. Make sure your file has 'Name' and 'Email' columns." });
      }

    } catch (err) {
      console.error("Import error:", err);
      setAlertConfig({ isOpen: true, title: "Import Error", message: "Failed to parse file. Ensure it is a valid CSV or Excel file." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setLoading(false);
    }
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImportSubmitting(true);
    
    try {
      let finalGroupId = importGroupId;

      // If they chose to create a new group
      if (importGroupId === "NEW" && importNewGroupName.trim()) {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: importNewGroupName.trim() }),
        });
        if (!res.ok) throw new Error("Failed to create new group");
        const newGroup = await res.json();
        finalGroupId = newGroup.id;
      }

      // Bulk import
      const res = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contacts: parsedImportContacts,
          groupId: finalGroupId && finalGroupId !== "UNGROUPED" && finalGroupId !== "NEW" ? finalGroupId : undefined
        }),
      });

      if (!res.ok) throw new Error("Failed to import contacts");

      setIsImportModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setAlertConfig({ isOpen: true, title: "Import Error", message: err.message || "Import failed" });
    } finally {
      setIsImportSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Toast popup */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl bg-indigo-950/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-medium text-white">All Contacts</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={openCreateGroupModal}
            className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Group
          </button>
          <button 
            onClick={openCreateContactModal}
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Contact
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Import CSV/Excel
          </button>
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
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
              onClick={openCreateContactModal}
              className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition"
            >
              Add Contact
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import CSV/Excel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {(() => {
            // Group contacts for segmented UI
            const contactsByGroup: Record<string, any[]> = {};
            const groupDataMap: Record<string, any> = {};
            
            groups.forEach(g => { 
              contactsByGroup[g.name] = []; 
              groupDataMap[g.name] = g;
            });
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
              if (groupContacts.length === 0 && groupName === "Ungrouped Contacts") return null;
              
              const group = groupDataMap[groupName];

              return (
                <div key={groupName} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 pl-3 border-l-2 border-indigo-500">
                    <h3 className="text-lg font-medium text-white">{groupName} <span className="text-sm text-zinc-500 ml-2">({groupContacts.length})</span></h3>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                      {group ? (
                        <>
                          <button onClick={() => openEditGroupModal(group)} className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition" title="Edit Group">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteGroup(group.id, group.name)} className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition" title="Delete Group">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleDeleteUngrouped(groupContacts.length)} className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition text-xs font-medium" title="Delete All Ungrouped">
                          <Trash2 className="w-3.5 h-3.5" /> Delete All
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {groupContacts.length > 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-white/5 border-b border-white/10 text-xs uppercase text-zinc-500">
                          <tr>
                            <th className="px-6 py-4 font-medium w-12">
                              <input 
                                type="checkbox" 
                                checked={groupContacts.length > 0 && groupContacts.every(c => selectedContactIds.has(c.id))}
                                onChange={() => handleToggleGroup(groupContacts)}
                                className="w-4 h-4 rounded border-white/10 bg-black/50 text-indigo-500 focus:ring-indigo-500/50 focus:ring-offset-0 transition cursor-pointer"
                              />
                            </th>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Company</th>
                            <th className="px-6 py-4 font-medium">Title</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {groupContacts.map((contact) => (
                            <tr key={contact.id} className={`hover:bg-white/[0.02] transition ${selectedContactIds.has(contact.id) ? 'bg-indigo-500/5' : ''}`}>
                              <td className="px-6 py-4">
                                <input 
                                  type="checkbox" 
                                  checked={selectedContactIds.has(contact.id)}
                                  onChange={() => handleToggleContact(contact.id)}
                                  className="w-4 h-4 rounded border-white/10 bg-black/50 text-indigo-500 focus:ring-indigo-500/50 focus:ring-offset-0 transition cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 text-white font-medium">{contact.name}</td>
                              <td className="px-6 py-4">{contact.email}</td>
                              <td className="px-6 py-4">{contact.company || "-"}</td>
                              <td className="px-6 py-4">{contact.jobTitle || "-"}</td>
                              <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => openEditContactModal(contact)}
                                  className="text-zinc-500 hover:text-white transition w-7 h-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10"
                                  title="Edit Contact"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteContact(contact.id, contact.name)}
                                  className="text-zinc-500 hover:text-red-400 transition w-7 h-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-red-500/10"
                                  title="Delete Contact"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-zinc-500 text-sm">
                      No contacts in this group yet.
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !isImportSubmitting && setIsImportModalOpen(false)}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-medium text-white">Import Settings</h3>
                <p className="text-sm text-zinc-400 mt-1">Found {parsedImportContacts.length} valid contacts.</p>
              </div>
              <button disabled={isImportSubmitting} onClick={() => setIsImportModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleConfirmImport} className="p-6 flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-300">Assign to Group (Optional)</label>
                <select 
                  value={importGroupId} 
                  onChange={e => setImportGroupId(e.target.value)} 
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition appearance-none"
                >
                  <option value="">Leave Ungrouped</option>
                  <option value="NEW">+ Create New Group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {importGroupId === "NEW" && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium text-zinc-300">New Group Name <span className="text-red-400">*</span></label>
                  <input 
                    required 
                    type="text" 
                    value={importNewGroupName} 
                    onChange={e => setImportNewGroupName(e.target.value)} 
                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" 
                    placeholder="e.g. VIP Clients" 
                  />
                </div>
              )}
              
              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" disabled={isImportSubmitting} onClick={() => setIsImportModalOpen(false)} className="text-zinc-400 hover:text-white px-5 py-2.5 rounded-full text-sm font-medium transition hover:bg-white/5 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isImportSubmitting} className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50">
                  {isImportSubmitting ? "Importing..." : `Import ${parsedImportContacts.length} Contacts`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-medium text-white">{editingContactId ? "Edit Contact" : "Add New Contact"}</h3>
                <p className="text-sm text-zinc-400 mt-1">{editingContactId ? "Update details for this contact." : "Add a new person to your Aura database."}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveContact} className="p-6 flex flex-col gap-4">
              {error && <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Full Name <span className="text-red-400">*</span></label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="John Doe" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Email Address <span className="text-red-400">*</span></label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="john@example.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Company</label>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="Acme Corp" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-300">Job Title</label>
                  <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-white/20" placeholder="CEO" />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300">Assign to Groups</label>
                  <button 
                    type="button" 
                    onClick={openCreateGroupModal}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> New Group
                  </button>
                </div>
                
                {groups.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {groups.map(group => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroups(prev => 
                            prev.includes(group.id) 
                              ? prev.filter(id => id !== group.id)
                              : [...prev, group.id]
                          )
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                          selectedGroups.includes(group.id)
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex items-center justify-center text-center text-xs text-zinc-500">
                    You haven't created any groups yet.
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 mt-2 border-t border-white/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white px-5 py-2.5 rounded-full text-sm font-medium transition hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Modal (Create/Edit) */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsGroupModalOpen(false)}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-medium text-white">{editingGroupId ? "Edit Group" : "New Group"}</h3>
                <p className="text-sm text-zinc-400 mt-1">Manage segments for your contacts.</p>
              </div>
              <button onClick={() => setIsGroupModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveGroup} className="p-6 flex flex-col gap-4">
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
                  {isGroupSubmitting ? "Saving..." : "Save Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-medium text-white">{confirmConfig.title}</h3>
              <button onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-zinc-300">
              {confirmConfig.message}
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} className="px-4 py-2 rounded-full bg-white/5 text-zinc-300 hover:bg-white/10 transition text-sm font-medium">Cancel</button>
              <button 
                onClick={() => {
                  setConfirmConfig({ ...confirmConfig, isOpen: false });
                  confirmConfig.onConfirm();
                }} 
                className="px-4 py-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-sm font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Bulk Selection */}
      {selectedContactIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-[#18181B] border border-white/10 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
            <span className="text-sm font-medium text-white">
              {selectedContactIds.size} selected
            </span>
            <div className="w-px h-6 bg-white/10" />
            <button 
              onClick={() => setSelectedContactIds(new Set())}
              className="text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              Deselect All
            </button>
            <button 
              onClick={handleBulkDelete}
              className="bg-red-500/10 text-red-400 px-4 py-2 rounded-full text-sm font-medium hover:bg-red-500/20 hover:text-red-300 transition flex items-center gap-2 border border-red-500/20"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-medium text-white">{alertConfig.title}</h3>
              <button onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-zinc-300">
              {alertConfig.message}
            </div>
            <div className="p-6 pt-0 flex justify-end">
              <button onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })} className="px-6 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition text-sm font-medium">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
