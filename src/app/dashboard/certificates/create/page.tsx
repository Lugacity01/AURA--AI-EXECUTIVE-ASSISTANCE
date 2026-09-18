"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Users,
  FileText,
  Eye,
  Sparkles,
  Download,
  AlertTriangle,
  QrCode,
  Calendar,
  UserCheck,
  Search
} from "lucide-react";
import { resolveFieldValue } from "@/services/certificates/certificate-field-resolver";
import { FieldConfig } from "@/services/certificates/types";

export default function CreateCertificatesWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState<string>("");
  const [title, setTitle] = useState("Certificate of Appreciation");
  const [description, setDescription] = useState(
    "In recognition of outstanding dedication, excellence, and valuable contributions."
  );
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [issuerName, setIssuerName] = useState("Executive Leadership");
  const [issuerTitle, setIssuerTitle] = useState("Aura Platform Director");

  // Recipient Switcher state for Step 4 Preview
  const [previewContactId, setPreviewContactId] = useState<string>("");

  // AI Assistant Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  // Generation Results
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // 1. Fetch Templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["certificateTemplates"],
    queryFn: async () => {
      const res = await fetch("/api/certificate-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      return data.templates || [];
    },
  });

  // 2. Fetch Contacts
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ["allContactsForCerts"],
    queryFn: async () => {
      const res = await fetch("/api/contacts?limit=100");
      if (!res.ok) throw new Error("Failed to load contacts");
      const data = await res.json();
      return data.contacts || [];
    },
  });

  const contactsList: any[] = contactsData || [];

  const filteredContacts = contactsList.filter((c: any) => {
    const q = contactSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.jobTitle || "").toLowerCase().includes(q)
    );
  });

  const selectedTemplate = templates.find((t: any) => t.id === selectedTemplateId);
  const templateFields: FieldConfig[] = selectedTemplate ? selectedTemplate.parsedFields : [];

  // Set default preview contact
  useEffect(() => {
    if (selectedContactIds.length > 0 && (!previewContactId || !selectedContactIds.includes(previewContactId))) {
      setPreviewContactId(selectedContactIds[0]);
    }
  }, [selectedContactIds, previewContactId]);

  // Selected preview contact object
  const currentPreviewContact = contactsList.find((c) => c.id === previewContactId) || null;

  const handleToggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllContacts = () => {
    const targetIds = filteredContacts.map((c) => c.id);
    const allSelected = targetIds.length > 0 && targetIds.every((id) => selectedContactIds.includes(id));

    if (allSelected) {
      setSelectedContactIds((prev) => prev.filter((id) => !targetIds.includes(id)));
    } else {
      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  // AI Wording Generator
  const handleGenerateAiWording = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/certificates/ai-wording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTitle(data.title);
        setDescription(data.description);
        if (data.issuerTitle) setIssuerTitle(data.issuerTitle);
        setShowAiModal(false);
      }
    } catch (err: any) {
      alert("Failed to generate AI wording");
    } finally {
      setGeneratingAi(false);
    }
  };

  const [autoEmail, setAutoEmail] = useState(false);

  // Trigger Batch Generation
  const handleExecuteGeneration = async () => {
    setGeneratingBatch(true);
    setBatchError(null);
    setStep(5);

    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          contactIds: selectedContactIds,
          title,
          description,
          issueDate,
          expiryDate: expiryDate || undefined,
          issuerName,
          issuerTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Generation request failed");
      }

      setBatchResult(data.result);

      // Auto-email if checkbox was checked
      if (autoEmail && data.result?.certificates?.length > 0) {
        for (const cert of data.result.certificates) {
          try {
            await fetch(`/api/certificates/${cert.id}/email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
          } catch (emailErr) {
            console.error(`Failed to auto-email certificate ${cert.id}:`, emailErr);
          }
        }
      }
    } catch (err: any) {
      setBatchError(err.message || "Failed to generate certificates");
    } finally {
      setGeneratingBatch(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <Link
          href="/dashboard/certificates"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Certificates</span>
        </Link>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl flex items-center justify-between">
        {[
          { num: 1, label: "Template" },
          { num: 2, label: "Recipients" },
          { num: 3, label: "Certificate Info" },
          { num: 4, label: "Recipient Preview" },
          { num: 5, label: "Batch Generate" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 text-xs font-semibold ${
              step === s.num
                ? "text-indigo-400"
                : step > s.num
                ? "text-emerald-400"
                : "text-slate-500"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                step === s.num
                  ? "bg-indigo-500 text-white"
                  : step > s.num
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/[0.05] text-slate-500"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </div>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: SELECT TEMPLATE */}
      {step === 1 && (
        <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl flex flex-col gap-6">
          <div>
            <h2 className="text-base font-bold text-white">Step 1: Select Certificate Template</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose the visual layout template to use for batch certificate generation.
            </p>
          </div>

          {loadingTemplates ? (
            <div className="text-xs text-slate-500 py-8 text-center">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-xl">
              <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-semibold">No Templates Available</p>
              <Link
                href="/dashboard/certificates/templates/new"
                className="inline-flex items-center gap-2 mt-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                + Create a Template First
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((tpl: any) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/50"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <p className="text-xs text-slate-400 font-light mt-1 line-clamp-2">
                        {tpl.description || "No description"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-[10px] font-mono text-slate-500">
                      <span>{tpl.canvasWidth}×{tpl.canvasHeight} px</span>
                      <span>{tpl.parsedFields?.length || 0} Fields</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-white/[0.04]">
            <button
              disabled={!selectedTemplateId}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <span>Continue to Recipient Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RECIPIENT SELECTION */}
      {step === 2 && (
        <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Step 2: Select Recipients</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select existing Aura Contacts to issue individual certificates to.
              </p>
            </div>
            <button
              onClick={handleSelectAllContacts}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {filteredContacts.length > 0 &&
              filteredContacts.every((c) => selectedContactIds.includes(c.id))
                ? "Deselect Filtered"
                : "Select Filtered"}
            </button>
          </div>

          {/* Contact Search Bar */}
          <div className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 rounded-xl">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search contact name, email, company, job title..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
            />
            {contactSearch && (
              <button
                onClick={() => setContactSearch("")}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {loadingContacts ? (
            <div className="text-xs text-slate-500 py-8 text-center">Loading contacts...</div>
          ) : contactsList.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-xl">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-semibold">No Contacts Found</p>
              <Link href="/dashboard/contacts" className="text-xs text-indigo-400 mt-2 block">
                Go to Contacts to add recipients
              </Link>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-white/[0.06] rounded-xl">
              No contacts match "{contactSearch}"
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-white/[0.06] rounded-xl bg-black/30 divide-y divide-white/[0.04]">
              {filteredContacts.map((contact: any) => {
                const checked = selectedContactIds.includes(contact.id);
                return (
                  <label
                    key={contact.id}
                    className="flex items-center justify-between p-3 hover:bg-white/[0.02] cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleContact(contact.id)}
                        className="rounded border-white/[0.2] bg-white/[0.05]"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200">{contact.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {contact.email} {contact.company ? `• ${contact.company}` : ""} {contact.jobTitle ? `(${contact.jobTitle})` : ""}
                        </span>
                      </div>
                    </div>
                    {checked && <UserCheck className="w-4 h-4 text-emerald-400" />}
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Back
            </button>
            <button
              disabled={selectedContactIds.length === 0}
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <span>Continue ({selectedContactIds.length} Selected)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CERTIFICATE INFORMATION */}
      {step === 3 && (
        <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Step 3: Certificate Details & AI Wording</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Provide title, formal description, dates, and issuer credentials for this batch.
              </p>
            </div>
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate with AI</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Certificate Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Certificate of Completion / Certificate of Excellence"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Description / Reason Citation</label>
              <textarea
                rows={3}
                placeholder="In recognition of outstanding dedication and leadership..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Issue Date *</label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Issuer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Issuer Title</label>
                <input
                  type="text"
                  placeholder="e.g. Director of Operations"
                  value={issuerTitle}
                  onChange={(e) => setIssuerTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Back
            </button>
            <button
              disabled={!title.trim()}
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <span>Proceed to Recipient Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: RECIPIENT PREVIEW SWITCHER */}
      {step === 4 && (
        <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Step 4: Recipient Preview Switcher</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect populated dynamic fields with actual recipient values before generating.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.08] px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-slate-400">Preview Recipient:</span>
              <select
                value={previewContactId}
                onChange={(e) => setPreviewContactId(e.target.value)}
                className="bg-slate-900 border border-white/[0.1] text-xs text-indigo-300 font-semibold rounded-lg px-2 py-1 focus:outline-none"
              >
                {contactsList
                  .filter((c) => selectedContactIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company || c.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Interactive Canvas Preview */}
          <div className="relative border border-white/[0.1] rounded-xl overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center p-4">
            <div
              style={{
                aspectRatio: `${selectedTemplate?.canvasWidth || 1000} / ${selectedTemplate?.canvasHeight || 707}`,
                width: "100%",
              }}
              className="relative bg-slate-950 rounded-lg overflow-hidden border border-white/[0.06]"
            >
              {selectedTemplate?.backgroundStorageKey && (
                <img
                  src={selectedTemplate.backgroundStorageKey}
                  alt="Background preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {templateFields.map((field) => {
                const canvasW = selectedTemplate?.canvasWidth || 1000;
                const canvasH = selectedTemplate?.canvasHeight || 707;

                const leftPct = (field.x / canvasW) * 100;
                const topPct = (field.y / canvasH) * 100;
                const widthPct = (field.width / canvasW) * 100;
                const heightPct = (field.height / canvasH) * 100;

                const resolvedText = resolveFieldValue(
                  field,
                  currentPreviewContact,
                  { title, description, issueDate, expiryDate, issuerName, issuerTitle },
                  "AURA-CERT-2026-PREVIEW"
                );

                return (
                  <div
                    key={field.id}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                    className={`absolute flex items-center ${
                      field.alignment === "left"
                        ? "justify-start text-left"
                        : field.alignment === "right"
                        ? "justify-end text-right"
                        : "justify-center text-center"
                    }`}
                  >
                    {field.type === "QR_CODE" ? (
                      <div className="w-full h-full border border-dashed border-indigo-400/50 bg-indigo-950/40 flex flex-col items-center justify-center">
                        <QrCode className="w-5 h-5 text-indigo-300" />
                        <span className="text-[7px] text-indigo-300 font-mono">VERIFY QR</span>
                      </div>
                    ) : (
                      <svg
                        viewBox={`0 0 ${field.width} ${field.height}`}
                        className="w-full h-full overflow-visible pointer-events-none"
                      >
                        <text
                          x={
                            field.alignment === "left"
                              ? 2
                              : field.alignment === "right"
                              ? field.width - 2
                              : field.width / 2
                          }
                          y={field.height / 2}
                          textAnchor={
                            field.alignment === "left"
                              ? "start"
                              : field.alignment === "right"
                              ? "end"
                              : "middle"
                          }
                          dominantBaseline="central"
                          fill={field.color || "#000000"}
                          fontSize={field.fontSize || 16}
                          fontWeight={field.fontWeight === "bold" ? "bold" : "normal"}
                          fontFamily={
                            field.fontFamily?.toLowerCase().includes("times")
                              ? "Times New Roman, Times, serif"
                              : field.fontFamily?.toLowerCase().includes("courier")
                              ? "Courier New, Courier, monospace"
                              : "Helvetica, Arial, sans-serif"
                          }
                        >
                          {resolvedText}
                        </text>
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-xl">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoEmail}
                onChange={(e) => setAutoEmail(e.target.checked)}
                className="rounded border-white/[0.2] bg-white/[0.05]"
              />
              <span className="text-xs font-semibold text-slate-200">
                Automatically send PDF certificate via email to recipients upon generation
              </span>
            </label>
            <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              GMAIL ATTACHMENT
            </span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Back
            </button>
            <button
              onClick={handleExecuteGeneration}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Certificates ({selectedContactIds.length} Recipients)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: BATCH GENERATION EXECUTION & PROGRESS */}
      {step === 5 && (
        <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-8 backdrop-blur-xl flex flex-col items-center text-center gap-6">
          {generatingBatch ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <h2 className="text-base font-bold text-white">Generating Certificates Batch...</h2>
              <p className="text-xs text-slate-400">
                Rendering vector background, positioning contact fields, and generating PDFs for {selectedContactIds.length} recipients.
              </p>
            </div>
          ) : batchError ? (
            <div className="flex flex-col items-center gap-4 py-8 text-rose-400">
              <AlertTriangle className="w-12 h-12" />
              <h2 className="text-base font-bold">Batch Generation Failed</h2>
              <p className="text-xs text-slate-300 max-w-md">{batchError}</p>
              <button
                onClick={() => setStep(4)}
                className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-white"
              >
                Return to Preview
              </button>
            </div>
          ) : batchResult ? (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">Batch Certificate Generation Complete</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Issued {batchResult.successful} out of {batchResult.total} certificates successfully.
                </p>
              </div>

              {/* Failures summary if any */}
              {batchResult.failed > 0 && (
                <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-left">
                  <h4 className="text-xs font-bold text-rose-300 mb-2">
                    {batchResult.failed} Failures Recorded:
                  </h4>
                  <ul className="text-[11px] text-rose-200 divide-y divide-rose-500/10">
                    {batchResult.failures.map((f: any, idx: number) => (
                      <li key={idx} className="py-1 flex justify-between">
                        <span>{f.contactName}</span>
                        <span className="font-mono text-rose-400">{f.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                <Link
                  href="/dashboard/certificates"
                  className="px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 hover:bg-white/[0.06] text-xs font-semibold transition"
                >
                  View Issued Certificates Hub
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* AI WORDING ASSISTANT MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0c16] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Certificate Copywriter
              </h3>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Describe the event, training, or achievement to generate formal certificate wording.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. 3-day executive AI leadership intensive training..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAiWording}
                disabled={generatingAi || !aiPrompt.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-400 transition"
              >
                {generatingAi ? "Generating..." : "Generate Wording"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
