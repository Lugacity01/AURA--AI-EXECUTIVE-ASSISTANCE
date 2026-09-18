"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Plus,
  FileText,
  Search,
  ExternalLink,
  Download,
  ShieldAlert,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Mail,
  Folder,
  ChevronDown,
  ChevronUp,
  Filter,
  List
} from "lucide-react";

export default function CertificatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"templates" | "issued">("issued");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "REVOKED">("ALL");
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>("ALL");
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<string[]>([]);
  const [emailingCertId, setEmailingCertId] = useState<string | null>(null);

  // Fetch Templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["certificateTemplates"],
    queryFn: async () => {
      const res = await fetch("/api/certificate-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      return data.templates || [];
    },
  });

  // Fetch Issued Certificates
  const { data: certificates = [], isLoading: loadingCertificates } = useQuery({
    queryKey: ["issuedCertificates"],
    queryFn: async () => {
      const res = await fetch("/api/certificates");
      if (!res.ok) throw new Error("Failed to load certificates");
      const data = await res.json();
      return data.certificates || [];
    },
  });

  // Revoke Mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/certificates/${id}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke certificate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuedCertificates"] });
    },
  });

  // Delete Template Mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/certificate-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificateTemplates"] });
    },
  });

  // Delete Single Certificate Mutation
  const deleteCertMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/certificates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete certificate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuedCertificates"] });
    },
  });

  // Bulk Delete Certificates Mutation
  const bulkDeleteCertMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/certificates/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateIds: ids }),
      });
      if (!res.ok) throw new Error("Failed to bulk delete certificates");
      return res.json();
    },
    onSuccess: () => {
      setSelectedCertIds([]);
      queryClient.invalidateQueries({ queryKey: ["issuedCertificates"] });
    },
  });

  // Email Certificate Handler
  const handleEmailCertificate = async (certId: string, recipientName: string) => {
    setEmailingCertId(certId);
    try {
      const res = await fetch(`/api/certificates/${certId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send email");
      }
      alert(`✓ Certificate PDF successfully emailed to ${data.result?.recipientEmail || recipientName}!`);
    } catch (err: any) {
      alert(`Failed to send certificate email: ${err.message}`);
    } finally {
      setEmailingCertId(null);
    }
  };

  // Filtered Certificates
  const filteredCertificates = certificates.filter((c: any) => {
    const matchesSearch =
      c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact?.company || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesTemplate = selectedTemplateFilter === "ALL" || c.templateId === selectedTemplateFilter;

    return matchesSearch && matchesStatus && matchesTemplate;
  });

  // Group certificates by template
  const groupedByTemplate = React.useMemo(() => {
    const map = new Map<string, { templateId: string; templateName: string; certificates: any[] }>();

    for (const cert of filteredCertificates) {
      const tId = cert.templateId || "custom";
      const tName = cert.template?.name || "Custom Certificate";
      if (!map.has(tId)) {
        map.set(tId, { templateId: tId, templateName: tName, certificates: [] });
      }
      map.get(tId)!.certificates.push(cert);
    }

    return Array.from(map.values());
  }, [filteredCertificates]);

  const toggleExpandTemplate = (tId: string) => {
    setExpandedTemplateIds((prev) =>
      prev.includes(tId) ? prev.filter((i) => i !== tId) : [...prev, tId]
    );
  };

  const handleToggleSelectCert = (id: string) => {
    setSelectedCertIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDownload = async () => {
    if (selectedCertIds.length === 0) return;
    setIsBulkDownloading(true);
    try {
      const res = await fetch("/api/certificates/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateIds: selectedCertIds }),
      });

      if (!res.ok) throw new Error("Failed to create ZIP download");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aura_certificates_batch.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download ZIP");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const renderCertificatesTable = (certsList: any[]) => (
    <div className="border border-white/[0.06] rounded-2xl bg-black/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-white/[0.02] border-b border-white/[0.04] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={
                    certsList.length > 0 &&
                    certsList.every((c) => selectedCertIds.includes(c.id))
                  }
                  onChange={() => {
                    const targetIds = certsList.map((c) => c.id);
                    const allSelected = targetIds.every((id) => selectedCertIds.includes(id));
                    if (allSelected) {
                      setSelectedCertIds((prev) => prev.filter((id) => !targetIds.includes(id)));
                    } else {
                      setSelectedCertIds((prev) => Array.from(new Set([...prev, ...targetIds])));
                    }
                  }}
                  className="rounded border-white/[0.2] bg-white/[0.05]"
                />
              </th>
              <th className="p-4">Recipient</th>
              <th className="p-4">Certificate Details</th>
              <th className="p-4">Issue Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {certsList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No certificates match the selected criteria.
                </td>
              </tr>
            ) : (
              certsList.map((cert: any) => {
                const snapshot = cert.snapshot || {};
                const isSelected = selectedCertIds.includes(cert.id);
                return (
                  <tr key={cert.id} className="hover:bg-white/[0.01] transition">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectCert(cert.id)}
                        className="rounded border-white/[0.2] bg-white/[0.05]"
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">{snapshot.contactName || cert.contact?.name || "Unknown"}</span>
                        <span className="text-[10px] text-slate-400">{snapshot.contactCompany || cert.contact?.company || snapshot.contactEmail || "-"}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{cert.title}</span>
                        <span className="text-[10px] font-mono text-indigo-400">{cert.certificateNumber}</span>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {new Date(cert.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>

                    <td className="p-4">
                      {cert.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" /> Revoked
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cert.pdfStorageKey && (
                          <a
                            href={`/api/certificates/${cert.id}?download=true`}
                            className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] text-slate-300 transition"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {cert.status === "ACTIVE" && (
                          <button
                            onClick={() => handleEmailCertificate(cert.id, snapshot.contactName || cert.contact?.name || "Recipient")}
                            disabled={emailingCertId === cert.id}
                            className="p-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition cursor-pointer"
                            title={`Email Certificate PDF to ${snapshot.contactEmail || cert.contact?.email || 'Recipient'}`}
                          >
                            {emailingCertId === cert.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        <a
                          href={`/certificate/${cert.certificateNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] text-indigo-400 transition"
                          title="Public Verification Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {cert.status === "ACTIVE" && (
                          <button
                            onClick={() => {
                              if (confirm(`Revoke certificate ${cert.certificateNumber}? This action cannot be undone.`)) {
                                revokeMutation.mutate(cert.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                            title="Revoke Certificate"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm(`Permanently delete certificate ${cert.certificateNumber}? This will remove the record and PDF file.`)) {
                              deleteCertMutation.mutate(cert.id);
                            }
                          }}
                          disabled={deleteCertMutation.isPending}
                          className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                          title="Delete Certificate Permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Certificates Hub</h1>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                Design custom visual templates, dynamic contact fields, batch issue, and manage public certificate verifications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/certificates/templates/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>New Template</span>
          </Link>

          <Link
            href="/dashboard/certificates/create"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Issue Certificates</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            activeTab === "templates"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Certificate Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("issued")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            activeTab === "issued"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Issued Certificates ({certificates.length})</span>
        </button>
      </div>

      {/* TAB 1: TEMPLATES */}
      {activeTab === "templates" && (
        <div>
          {loadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">No Certificate Templates Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Upload your professionally designed certificate background (PNG/JPG) and drag dynamic Aura contact fields onto it.
              </p>
              <Link
                href="/dashboard/certificates/templates/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Template</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {templates.map((tpl: any) => (
                <div
                  key={tpl.id}
                  className="group rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl hover:border-indigo-500/40 transition-all overflow-hidden flex flex-col justify-between shadow-lg"
                >
                  <div>
                    {/* Thumbnail / Header graphics */}
                    <div className="h-36 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border-b border-white/[0.04] relative overflow-hidden flex items-center justify-center">
                      {tpl.backgroundStorageKey ? (
                        <img
                          src={tpl.backgroundStorageKey}
                          alt={tpl.name}
                          className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <Award className="w-8 h-8 opacity-40" />
                          <span className="text-[10px] font-mono">No Background Artwork</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.08] text-[10px] font-mono text-indigo-300">
                        {tpl.canvasWidth} × {tpl.canvasHeight} px
                      </div>
                    </div>

                    <div className="p-5 flex flex-col gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-light line-clamp-2">
                        {tpl.description || "No description provided."}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono">
                          {tpl.parsedFields?.length || 0} Dynamic Fields
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                    <Link
                      href={`/dashboard/certificates/templates/${tpl.id}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Design Layout</span>
                    </Link>

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete template '${tpl.name}'?`)) {
                          deleteTemplateMutation.mutate(tpl.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ISSUED CERTIFICATES */}
      {activeTab === "issued" && (
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-black/40 border border-white/[0.06] p-3.5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 w-full lg:w-72 border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 rounded-xl">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search recipient, cert number, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                />
              </div>

              {/* Template Filter Dropdown */}
              <div className="flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 rounded-xl text-xs">
                <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={selectedTemplateFilter}
                  onChange={(e) => setSelectedTemplateFilter(e.target.value)}
                  className="bg-slate-900 border-none text-slate-200 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Templates ({templates.length})</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl text-xs">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                    viewMode === "grouped" ? "bg-indigo-500/20 text-indigo-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Grouped Folders by Template"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Grouped</span>
                </button>
                <button
                  onClick={() => setViewMode("flat")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                    viewMode === "flat" ? "bg-indigo-500/20 text-indigo-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Flat Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Flat List</span>
                </button>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl text-xs">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    statusFilter === "ALL" ? "bg-indigo-500/20 text-indigo-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    statusFilter === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("REVOKED")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    statusFilter === "REVOKED" ? "bg-rose-500/20 text-rose-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Revoked
                </button>
              </div>

              {selectedCertIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDownload}
                    disabled={isBulkDownloading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isBulkDownloading ? "Preparing ZIP..." : `Download ZIP (${selectedCertIds.length})`}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete ${selectedCertIds.length} selected certificate(s)? This will remove records and PDF files.`)) {
                        bulkDeleteCertMutation.mutate(selectedCertIds);
                      }
                    }}
                    disabled={bulkDeleteCertMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{bulkDeleteCertMutation.isPending ? "Deleting..." : `Delete Selected (${selectedCertIds.length})`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* VIEW MODE 1: GROUPED BY TEMPLATE ACCORDIONS */}
          {loadingCertificates ? (
            <div className="p-12 text-center text-slate-500 border border-white/[0.06] rounded-2xl bg-black/30">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading issued certificates history...
            </div>
          ) : viewMode === "grouped" ? (
            groupedByTemplate.length === 0 ? (
              <div className="p-12 text-center text-slate-500 border border-dashed border-white/[0.08] rounded-2xl bg-black/20 text-xs">
                No issued certificates match the selected filters.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groupedByTemplate.map((group) => {
                  const isExpanded = expandedTemplateIds.includes(group.templateId) || selectedTemplateFilter !== "ALL";
                  const activeCount = group.certificates.filter((c) => c.status === "ACTIVE").length;
                  const revokedCount = group.certificates.filter((c) => c.status === "REVOKED").length;

                  return (
                    <div
                      key={group.templateId}
                      className="border border-white/[0.06] rounded-2xl bg-black/40 backdrop-blur-xl overflow-hidden shadow-lg transition"
                    >
                      {/* Group Header Bar */}
                      <div
                        onClick={() => toggleExpandTemplate(group.templateId)}
                        className="p-4 bg-white/[0.02] hover:bg-white/[0.04] transition flex items-center justify-between cursor-pointer border-b border-white/[0.04]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              {group.templateName}
                              <span className="text-[10px] font-mono font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {group.certificates.length} Issued
                              </span>
                            </h3>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                              <span className="text-emerald-400 font-semibold">{activeCount} Active</span>
                              {revokedCount > 0 && <span className="text-rose-400 font-semibold">{revokedCount} Revoked</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/certificates/create?templateId=${group.templateId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Issue More</span>
                          </Link>

                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-white transition">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Group Certificates Table */}
                      {isExpanded && <div className="p-2">{renderCertificatesTable(group.certificates)}</div>}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* VIEW MODE 2: FLAT TABLE */
            renderCertificatesTable(filteredCertificates)
          )}
        </div>
      )}
    </div>
  );
}
