"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

export default function GroupsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to load groups");
      const data = await res.json();
      setGroups(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }

      setIsModalOpen(false);
      setName(""); setDescription("");
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">Contact Groups</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No groups yet</h3>
          <p className="text-zinc-400 max-w-sm mb-6">
            Create reusable groups like Investors or Clients to quickly target audiences.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition"
          >
            Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition group relative cursor-pointer">
              <h3 className="text-lg font-medium text-white mb-1">{group.name}</h3>
              <p className="text-zinc-400 text-sm line-clamp-2">{group.description || "No description"}</p>
              <div className="mt-4 flex items-center text-xs font-medium text-zinc-500 bg-white/5 rounded-full px-3 py-1 w-max">
                {group._count?.members || 0} Members
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F0F12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-medium text-white">New Group</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="p-6 flex flex-col gap-4">
              {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-400">Group Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition" placeholder="Investors Q3" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-400">Description (Optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition min-h-[100px] resize-none" placeholder="A group for our most active investors" />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white px-4 py-2 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
