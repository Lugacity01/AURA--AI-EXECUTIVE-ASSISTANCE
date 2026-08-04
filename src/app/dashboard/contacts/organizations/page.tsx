"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

export default function OrganizationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      if (!res.ok) throw new Error("Failed to load organizations");
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, industry, website }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      setIsModalOpen(false);
      setName(""); setIndustry(""); setWebsite("");
      fetchOrganizations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">Organizations</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Organization
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No organizations yet</h3>
          <p className="text-zinc-400 max-w-sm mb-6">
            Group your contacts by their company or institution.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition"
          >
            Add Organization
          </button>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-white/5 border-b border-white/10 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Industry</th>
                <th className="px-6 py-4 font-medium">Website</th>
                <th className="px-6 py-4 font-medium">Contacts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 text-white font-medium">{org.name}</td>
                  <td className="px-6 py-4">{org.industry || "-"}</td>
                  <td className="px-6 py-4">{org.website || "-"}</td>
                  <td className="px-6 py-4">{org._count?.contacts || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F0F12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-medium text-white">New Organization</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrganization} className="p-6 flex flex-col gap-4">
              {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-400">Company Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition" placeholder="Microsoft" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-400">Industry (Optional)</label>
                <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition" placeholder="Technology" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-400">Website (Optional)</label>
                <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition" placeholder="microsoft.com" />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white px-4 py-2 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
