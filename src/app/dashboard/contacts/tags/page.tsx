"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

export default function TagsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed to load tags");
      const data = await res.json();
      setTags(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tag");
      }

      setIsModalOpen(false);
      setName("");
      fetchTags();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">Tags</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Tag
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
        </div>
      ) : tags.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No tags yet</h3>
          <p className="text-zinc-400 max-w-sm mb-6">
            Use tags like VIP or Prospect to easily segment and filter your contacts.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition"
          >
            Create Tag
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white/5 border border-white/10 rounded-full pl-4 pr-3 py-1.5 flex items-center gap-3">
              <span className="text-white text-sm font-medium">{tag.name}</span>
              <span className="bg-white/10 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{tag._count?.contactTags || 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F0F12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-medium text-white">New Tag</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTag} className="p-6 flex flex-col gap-4">
              {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-400">Tag Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition" placeholder="VIP Customer" />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white px-4 py-2 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
