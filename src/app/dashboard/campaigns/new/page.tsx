"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronRight, Wand2, Loader2, ArrowLeft, X, Sparkles, Plus, Mail, Users, Filter, LayoutTemplate, Clock, Calendar as CalendarIcon, Upload, Trash2, MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cleanBrowserText, replaceContactPlaceholders } from "@/lib/font-sanitizer";

export default function NewCampaignWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Refs
  const csvInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generationInterval, setGenerationInterval] = useState<NodeJS.Timeout | null>(null);

  // Campaign State
  const [campaignId, setCampaignId] = useState("");
  const [title, setTitle] = useState("");
  const [campaignType, setCampaignType] = useState("NEWSLETTER");
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [basePrompt, setBasePrompt] = useState("");
  const [generationMode, setGenerationMode] = useState<"ai" | "standard">("standard");
  const [recipientSearch, setRecipientSearch] = useState("");

  // PDF Attachment & A4 Letterhead Canvas State
  const [pdfEnabled, setPdfEnabled] = useState(false);
  const [pdfFilename, setPdfFilename] = useState("Attachment_Document.pdf");
  const [pdfContentSource, setPdfContentSource] = useState<"EMAIL_BODY" | "CUSTOM">("EMAIL_BODY");
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfTemplate, setPdfTemplate] = useState("");
  const [pdfHeaderImage, setPdfHeaderImage] = useState<string | null>(null);
  const [pdfBackgroundFit, setPdfBackgroundFit] = useState<"A4" | "HEADER">("A4");
  const [pdfContentX, setPdfContentX] = useState<number>(70);
  const [pdfContentY, setPdfContentY] = useState<number>(180);
  const [pdfContentWidth, setPdfContentWidth] = useState<number>(455);
  const [pdfContentHeight, setPdfContentHeight] = useState<number>(550);
  const [pdfFontSize, setPdfFontSize] = useState<number>(11);
  const [pdfLineHeight, setPdfLineHeight] = useState<number>(1.4);
  const [pdfAlignment, setPdfAlignment] = useState<"LEFT" | "CENTER" | "RIGHT" | "JUSTIFY">("LEFT");
  const [letterheadAspectRatio, setLetterheadAspectRatio] = useState<number | null>(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);

  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a valid JPEG, PNG, or WebP image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPdfHeaderImage(dataUrl);

      // Detect Image Aspect Ratio (A4 ratio is 841.89 / 595.28 = 1.414)
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const ratio = img.height / img.width;
        setLetterheadAspectRatio(ratio);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAutoFitContent = () => {
    const textToFit = pdfTemplate || basePrompt || "Dear Recipient,\n\nOfficial document content will render inside this box.";
    const charCount = textToFit.length;
    let fontSize = 11;
    let lineHeight = 1.4;
    let contentY = 180;
    let contentHeight = 550;

    const avgCharsPerLine = Math.floor(pdfContentWidth / (fontSize * 0.55));
    const totalLines = Math.ceil(charCount / avgCharsPerLine) + (textToFit.split("\n").length - 1);
    const estimatedHeight = totalLines * (fontSize * lineHeight * 14);

    if (estimatedHeight > contentHeight) {
      if (fontSize > 10) {
        fontSize = 10;
        lineHeight = 1.3;
      } else if (fontSize > 9) {
        fontSize = 9.5;
        lineHeight = 1.25;
      }
      contentHeight = Math.min(620, contentHeight + 40);
    } else if (estimatedHeight < contentHeight * 0.4 && charCount < 300) {
      fontSize = 12;
      lineHeight = 1.45;
    }

    setPdfContentY(contentY);
    setPdfContentHeight(contentHeight);
    setPdfFontSize(fontSize);
    setPdfLineHeight(lineHeight);
  };

  // Event State (For MEETING Campaigns)
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("14:00");
  const [eventDuration, setEventDuration] = useState("30");

  // Attachments State (For non-MEETING Campaigns)
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Contacts State
  const [recipientTab, setRecipientTab] = useState<"CONTACTS" | "ORGANIZATIONS" | "GROUPS">("CONTACTS");
  const [contacts, setContacts] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // What the user selects on the UI
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Step 6: Review Drafts State
  const [campaignRecipients, setCampaignRecipients] = useState<any[]>([]);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);

  // Step 7: Schedule & Send State
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDate, setScheduledDate] = useState<string>("");

  useEffect(() => {
    fetchContacts();
    fetchOrganizations();
    fetchGroups();
    if (editId) {
      fetchExistingCampaign(editId);
    }
  }, [editId]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(Array.isArray(data) ? data : []);
      }
    } catch (e) { }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (e) { }
  };

  useEffect(() => {
    return () => {
      if (generationInterval) clearInterval(generationInterval);
    };
  }, [generationInterval]);

  const fetchExistingCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCampaignId(data.id);
        setTitle(data.title);
        setCampaignType(data.campaignType);
        if (data.channel) setChannel(data.channel);
        if (data.template) {
          setBasePrompt(data.template.basePrompt || "");
        }
        if (data.eventDate) {
          const d = new Date(data.eventDate);
          setEventDate(d.toISOString().split("T")[0]);
          setEventTime(d.toTimeString().slice(0, 5));
        }
        if (data.eventDuration) {
          setEventDuration(data.eventDuration.toString());
        }
        if (data.attachments) {
          setAttachments(data.attachments);
        }

        // Auto-select recipients
        if (data.recipients && data.recipients.length > 0) {
          setSelectedContactIds(data.recipients.map((r: any) => r.contactId));
          setCampaignRecipients(data.recipients);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).map(r => r.split(","));

        const newContactIds: string[] = [];
        for (let i = 1; i < rows.length; i++) {
          const [name, email, company, jobTitle] = rows[i];
          if (!name || !email) continue;

          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              company: company?.trim(),
              jobTitle: jobTitle?.trim()
            }),
          });
          if (res.ok) {
            const contact = await res.json();
            newContactIds.push(contact.id);
          }
        }
        await fetchContacts();
        setSelectedContactIds(prev => [...prev, ...newContactIds]);
      } catch (err) {
        console.error("CSV Import error:", err);
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = "";
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !campaignId) return;

    setIsUploading(true);
    setError("");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Convert file to Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        reader.readAsDataURL(file);
        const fileData = await base64Promise;

        const res = await fetch(`/api/campaigns/${campaignId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            fileData
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to upload file");
        }
        const { attachment } = await res.json();
        setAttachments(prev => [...prev, attachment]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/attachments/${attachmentId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const steps = [
    "Campaign Type",
    "Recipients",
    "Base Prompt",
    "Attachments",
    "Generate",
    "Review",
    "Approve",
    "Schedule"
  ];

  const handleCreateCampaign = async () => {
    if (!title) {
      setError("Please enter a campaign title.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (campaignId) {
        // We are updating an existing draft
        const res = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, campaignType, channel })
        });
        if (!res.ok) throw new Error("Failed to update campaign");
        setStep(2);
      } else {
        // Creating a new one
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, campaignType, channel, description: "New AI Campaign" })
        });
        if (!res.ok) throw new Error("Failed to create campaign");
        const data = await res.json();
        setCampaignId(data.id);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isSingleContact = selectedContactIds.length === 1 && selectedGroupIds.length === 0 && selectedOrgIds.length === 0;
    if (isSingleContact && generationMode === "ai") {
      setGenerationMode("standard");
    }
  }, [selectedContactIds, selectedGroupIds, selectedOrgIds, generationMode]);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (generationInterval) {
        clearInterval(generationInterval);
      }
    };
  }, [generationInterval]);

  const handleSaveRecipients = async () => {
    if (selectedContactIds.length === 0 && selectedGroupIds.length === 0 && selectedOrgIds.length === 0) {
      setError("Please select at least one recipient, organization, or group.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContactIds,
          groupIds: selectedGroupIds,
          organizationIds: selectedOrgIds
        })
      });
      if (!res.ok) throw new Error("Failed to save recipients");

      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrompt,
          pdfEnabled: pdfEnabled || Boolean(pdfTemplate || pdfTitle || pdfHeaderImage),
          pdfFilename,
          pdfContentSource,
          pdfTitle,
          pdfTemplate,
          pdfHeaderImage,
          pdfBackgroundFit,
          pdfContentX,
          pdfContentY,
          pdfContentWidth,
          pdfContentHeight,
          pdfFontSize,
          pdfLineHeight,
          pdfAlignment
        })
      });
      if (!res.ok) throw new Error("Failed to save base prompt");

      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGeneration = async (regenerate: boolean = false) => {
    setLoading(true);
    try {
      // Always persist prompt & PDF settings before triggering AI generation
      if (campaignId) {
        await fetch(`/api/campaigns/${campaignId}/template`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basePrompt,
            pdfEnabled: pdfEnabled || Boolean(pdfTemplate || pdfTitle || pdfHeaderImage),
            pdfFilename: pdfFilename || "Official_Notice.pdf",
            pdfContentSource: pdfContentSource || "EMAIL_BODY",
            pdfTitle: pdfTitle || "OFFICIAL DOCUMENTATION",
            pdfTemplate: pdfTemplate || basePrompt,
            pdfHeaderImage,
            pdfBackgroundFit,
            pdfContentX,
            pdfContentY,
            pdfContentWidth,
            pdfContentHeight,
            pdfFontSize,
            pdfLineHeight,
            pdfAlignment
          })
        });
      }

      const res = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useAi: generationMode === "ai",
          regenerate,
          eventDate: eventDate && eventTime ? `${eventDate}T${eventTime}:00Z` : undefined,
          eventDuration: parseInt(eventDuration)
        })
      });
      if (!res.ok) throw new Error("Failed to start generation");

      setStep(5);

      const interval = setInterval(async () => {
        const statusRes = await fetch(`/api/campaigns/${campaignId}`);
        if (statusRes.ok) {
          const campaignData = await statusRes.json();
          // Wait for the background worker to finish generation and mark campaign as READY
          if (campaignData.status === "READY" || campaignData.status === "DRAFT") {
            setCampaignRecipients(campaignData.recipients || []);
            clearInterval(interval);
            setStep(6);
          }
        }
      }, 3000);

      setGenerationInterval(interval);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!editingDraft) return;
    setIsDraftSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/recipients/${editingDraft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizedSubject: editingDraft.personalizedSubject,
          personalizedBody: editingDraft.personalizedBody,
          personalizedPdfContent: editingDraft.personalizedPdfContent,
          approvalStatus: "APPROVED"
        })
      });

      if (!res.ok) throw new Error("Failed to save draft");

      // Update local state
      setCampaignRecipients(prev => prev.map(r => r.id === editingDraft.id ? { ...r, ...editingDraft, approvalStatus: "APPROVED" } : r));
      setEditingDraft(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsDraftSaving(false);
    }
  };

  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  const handleDeleteDraft = async () => {
    if (!deletingDraftId) return;
    setIsDeletingDraft(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/recipients/${deletingDraftId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete draft");

      // Update local state
      setCampaignRecipients(prev => prev.filter(r => r.id !== deletingDraftId));
      setDeletingDraftId(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsDeletingDraft(false);
    }
  };

  const handleApproveAll = async () => {
    // In a real app, you'd hit a bulk-approve endpoint. Here we'll simulate by updating locally or hitting API in a loop (not recommended for large lists).
    // Assuming backend handles it or we're just doing it locally for UI sake here:
    setCampaignRecipients(prev => prev.map(r => ({ ...r, approvalStatus: "APPROVED" })));
  };

  const handleLaunchCampaign = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = scheduleType === "scheduled" && scheduledDate
        ? { scheduledAt: new Date(scheduledDate).toISOString() }
        : {};

      const res = await fetch(`/api/campaigns/${campaignId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule campaign");
      }

      router.push("/dashboard/campaigns");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F12]">
      {/* Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns" className="text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl md:text-2xl font-medium text-white">Campaign Builder</h1>
        </div>

        {/* Mobile Step Indicator */}
        <div className="md:hidden flex items-center gap-2 text-sm">
          <span className="text-zinc-400">Step {step} of {steps.length}:</span>
          <span className="text-indigo-400 font-medium">{steps[step - 1]}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Wizard Steps */}
        <div className="w-64 border-r border-white/10 bg-black/20 p-6 flex flex-col gap-2 overflow-y-auto hidden md:flex">
          {steps.map((s, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isCompleted = stepNum < step;

            return (
              <div
                key={s}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400 font-medium' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'border border-zinc-700'}`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : stepNum}
                </div>
                <span className="text-sm">{s}</span>
              </div>
            );
          })}
        </div>

        {/* Main Step Content */}
        <div className="flex-1 p-4 md:p-10 overflow-y-auto flex flex-col relative pb-32">

          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}

          {/* STEP 1: CAMPAIGN TYPE */}
          {step === 1 && (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-medium text-white mb-2">What kind of campaign is this?</h2>
              <p className="text-zinc-400 mb-8">Set up the foundation for how Aura should format these emails.</p>

              <div className="mb-8 flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-400">Campaign Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition text-lg"
                  placeholder="e.g. Q3 Investor Update"
                />
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-zinc-400 mb-2 block">Delivery Channel</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setChannel("EMAIL")}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${channel === "EMAIL" ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/10 hover:bg-white/10 text-white"}`}
                  >
                    <Mail className="w-5 h-5" /> Email Broadcast
                  </button>
                  <button
                    onClick={() => setChannel("WHATSAPP")}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${channel === "WHATSAPP" ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 hover:bg-white/10 text-white"}`}
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp Broadcast
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "MEETING", title: "Meeting Invitation", desc: "Suggests times and generates calendar events", icon: "📅" },
                  { id: "NEWSLETTER", title: "Newsletter", desc: "Informational broadcast with rich formatting", icon: "📰" },
                  { id: "FOLLOW_UP", title: "Follow-up", desc: "Checks in on a previous thread or meeting", icon: "👋" },
                  { id: "ANNOUNCEMENT", title: "Announcement", desc: "Company updates or product launches", icon: "🚀" },
                ].map((type) => (
                  <button
                    key={type.title}
                    onClick={() => setCampaignType(type.id)}
                    className={`text-left border p-6 rounded-xl transition group ${campaignType === type.id ? 'bg-indigo-500/10 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-bottom-left">{type.icon}</div>
                    <h3 className="text-lg font-medium text-white mb-1">{type.title}</h3>
                    <p className="text-zinc-400 text-sm">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: RECIPIENTS */}
          {step === 2 && (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-medium text-white mb-2">Who is receiving this?</h2>
              <p className="text-zinc-400 mb-6">Select specific contacts, or target entire organizations and groups.</p>

              <div className="flex gap-2 mb-4">
                {["CONTACTS", "ORGANIZATIONS", "GROUPS"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setRecipientTab(tab as any)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${recipientTab === tab ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-zinc-400 hover:text-white border border-transparent hover:border-white/10'}`}
                  >
                    {tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[400px]">
                {/* CONTACTS TAB */}
                {recipientTab === "CONTACTS" && (
                  <>
                    <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 bg-black/20">
                      <span className="text-sm text-zinc-400">{selectedContactIds.length} selected</span>
                      <div className="flex flex-wrap items-center gap-4">
                        <input
                          type="text"
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          placeholder="Search contacts..."
                          className="bg-black/50 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                        <input
                          type="file"
                          accept=".csv"
                          ref={csvInputRef}
                          className="hidden"
                          onChange={handleCsvUpload}
                        />
                        <button onClick={() => csvInputRef.current?.click()} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                          <Upload className="w-3 h-3" /> Import CSV
                        </button>
                        <button onClick={() => setSelectedContactIds(contacts.map(c => c.id))} className="text-xs text-indigo-400 hover:text-indigo-300">Select All</button>
                      </div>
                    </div>
                    <div className="overflow-y-auto p-4 flex flex-col gap-6">
                      {(() => {
                        const filteredContacts = contacts.filter(c =>
                          (c.name || "").toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          (c.email || "").toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          (c.company || "").toLowerCase().includes(recipientSearch.toLowerCase())
                        );

                        const contactsByGroup: Record<string, any[]> = {};
                        groups.forEach(g => { contactsByGroup[g.name] = []; });
                        contactsByGroup["Ungrouped Contacts"] = [];

                        filteredContacts.forEach(c => {
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
                            <div key={groupName} className="flex flex-col gap-2">
                              <div className="flex items-center justify-between pl-1 mb-1">
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{groupName}</h4>
                                <button
                                  onClick={() => setSelectedContactIds(prev => {
                                    const next = new Set(prev);
                                    const allSelected = groupContacts.every(c => next.has(c.id));
                                    if (allSelected) {
                                      groupContacts.forEach(c => next.delete(c.id));
                                    } else {
                                      groupContacts.forEach(c => next.add(c.id));
                                    }
                                    return Array.from(next);
                                  })}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase tracking-wider font-semibold"
                                >
                                  {groupContacts.every(c => selectedContactIds.includes(c.id)) ? "Deselect All" : "Select All"}
                                </button>
                              </div>
                              <div className="flex flex-col gap-1">
                                {groupContacts.map(contact => (
                                  <label key={contact.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition bg-black/10">
                                    <input
                                      type="checkbox"
                                      checked={selectedContactIds.includes(contact.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedContactIds(prev => [...prev, contact.id]);
                                        else setSelectedContactIds(prev => prev.filter(id => id !== contact.id));
                                      }}
                                      className="w-4 h-4 rounded border-white/20 bg-black text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-white text-sm font-medium">{contact.name}</span>
                                      <span className="text-zinc-500 text-xs">{contact.email} {contact.organization ? `• ${contact.organization.name}` : ''}</span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}

                {/* ORGANIZATIONS TAB */}
                {recipientTab === "ORGANIZATIONS" && (
                  <>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                      <span className="text-sm text-zinc-400">{selectedOrgIds.length} selected</span>
                      <button onClick={() => setSelectedOrgIds(organizations.map(o => o.id))} className="text-xs text-indigo-400 hover:text-indigo-300">Select All</button>
                    </div>
                    <div className="overflow-y-auto p-4 flex flex-col gap-2">
                      {organizations.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8 text-sm">No organizations found.</div>
                      ) : (
                        organizations.map(org => (
                          <label key={org.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition">
                            <input
                              type="checkbox"
                              checked={selectedOrgIds.includes(org.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedOrgIds(prev => [...prev, org.id]);
                                else setSelectedOrgIds(prev => prev.filter(id => id !== org.id));
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-black text-indigo-500 focus:ring-indigo-500"
                            />
                            <div className="flex flex-col">
                              <span className="text-white text-sm font-medium">{org.name}</span>
                              <span className="text-zinc-500 text-xs">{org.domain} • {org.contacts?.length || 0} contacts</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* GROUPS TAB */}
                {recipientTab === "GROUPS" && (
                  <>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                      <span className="text-sm text-zinc-400">{selectedGroupIds.length} selected</span>
                      <button onClick={() => setSelectedGroupIds(groups.map(g => g.id))} className="text-xs text-indigo-400 hover:text-indigo-300">Select All</button>
                    </div>
                    <div className="overflow-y-auto p-4 flex flex-col gap-2">
                      {groups.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8 text-sm">No groups found.</div>
                      ) : (
                        groups.map(grp => (
                          <label key={grp.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition">
                            <input
                              type="checkbox"
                              checked={selectedGroupIds.includes(grp.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedGroupIds(prev => [...prev, grp.id]);
                                else setSelectedGroupIds(prev => prev.filter(id => id !== grp.id));
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-black text-indigo-500 focus:ring-indigo-500"
                            />
                            <div className="flex flex-col">
                              <span className="text-white text-sm font-medium">{grp.name}</span>
                              <span className="text-zinc-500 text-xs">{grp.description || "No description"} • {grp.members?.length || 0} members</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: BASE PROMPT */}
          {step === 3 && (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-medium text-white mb-2">Base Prompt & Template</h2>
              <p className="text-zinc-400 mb-8">Write the core message. Aura will personalize this for each recipient based on their profile context.</p>

              <textarea
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-6 text-white min-h-[300px] focus:outline-none focus:border-indigo-500 transition resize-y mb-6"
                placeholder="Write your email here... \n\ne.g., We are thrilled to announce that we've closed our Series A! I wanted to personally reach out to you..."
              />

              <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                <h3 className="text-white font-medium mb-4">Content Generation Mode</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const isSingleContact = selectedContactIds.length === 1 && selectedGroupIds.length === 0 && selectedOrgIds.length === 0;
                    return (
                      <>
                        <div
                          onClick={() => {
                            if (!isSingleContact) setGenerationMode("ai");
                          }}
                          className={`p-4 rounded-xl border transition flex flex-col gap-2 ${isSingleContact ? "opacity-50 cursor-not-allowed bg-black/50 border-white/5" : "cursor-pointer " + (generationMode === "ai" ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-black/30 hover:border-white/30")
                            }`}
                          title={isSingleContact ? "Deep AI Personalization is disabled when targeting only a single contact." : ""}
                        >
                          <div className="flex items-center gap-2 text-white font-medium">
                            <Wand2 className="w-4 h-4 text-indigo-400" />
                            Deep AI Personalization
                          </div>
                          <p className="text-sm text-zinc-400">
                            {isSingleContact ? "Disabled because you are only messaging 1 person." : "Aura will rewrite and personalize the base prompt specifically for each recipient using their profile data."}
                          </p>
                        </div>

                        <div
                          onClick={() => setGenerationMode("standard")}
                          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${generationMode === "standard" ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-black/30 hover:border-white/30"}`}
                        >
                          <div className="flex items-center gap-2 text-white font-medium">
                            <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            AI Master Template
                          </div>
                          <p className="text-sm text-zinc-400">
                            Aura will generate one polished, professional master email based on your prompt, and send that exact email to everyone.
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Attach a PDF Section */}
              <div className="mt-8 bg-white/5 border border-white/10 p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium text-lg flex items-center gap-2">
                      <span className="text-xl">📄</span> Attach a PDF Document
                    </h3>
                    <p className="text-sm text-zinc-400">Optionally generate and attach a personalized PDF file to each outgoing email.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfEnabled(!pdfEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pdfEnabled ? "bg-indigo-600" : "bg-white/10"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pdfEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {pdfEnabled && (
                  <div className="space-y-6 pt-4 border-t border-white/10 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">PDF Filename</label>
                        <input
                          type="text"
                          value={pdfFilename}
                          onChange={(e) => setPdfFilename(e.target.value)}
                          placeholder="Official_Notice.pdf"
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Document Source</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPdfContentSource("EMAIL_BODY")}
                            className={`p-2.5 rounded-lg border text-left transition ${pdfContentSource === "EMAIL_BODY" ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"}`}
                          >
                            <div className="font-medium text-xs">Email Message</div>
                            <div className="text-[10px] text-zinc-400">Convert body to PDF</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPdfContentSource("CUSTOM")}
                            className={`p-2.5 rounded-lg border text-left transition ${pdfContentSource === "CUSTOM" ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"}`}
                          >
                            <div className="font-medium text-xs">Custom Template</div>
                            <div className="text-[10px] text-zinc-400">Use placeholders</div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 7: A4 Letterhead Upload Dropzone */}
                    <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">🖼️ Upload Official A4 Letterhead</label>
                          <p className="text-xs text-zinc-400 mt-0.5">Upload a full A4 sheet graphic containing your logo, header, address, and footer.</p>
                        </div>
                        {pdfHeaderImage && (
                          <button
                            type="button"
                            onClick={handleAutoFitContent}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                          >
                            <span>⚡</span> Auto Fit Content
                          </button>
                        )}
                      </div>

                      {!pdfHeaderImage ? (
                        <label className="border-2 border-dashed border-white/20 hover:border-indigo-500/50 bg-black/30 hover:bg-indigo-500/5 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
                          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
                          <span className="text-xs font-medium text-white">Upload A4 Letterhead Graphic (JPEG, PNG, WebP)</span>
                          <span className="text-[10px] text-zinc-500 mt-1">Recommended size: A4 ratio (~210mm x 297mm or 1240x1754 px)</span>
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLetterheadUpload} />
                        </label>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3">
                              <img src={pdfHeaderImage} alt="Letterhead Thumbnail" className="w-10 h-14 object-cover rounded border border-white/20" />
                              <div>
                                <p className="text-xs font-medium text-white">Official Letterhead Graphic Loaded</p>
                                <p className="text-[10px] text-zinc-400">Mode: {pdfBackgroundFit === "A4" ? "Full A4 Page Cover" : "Top Header Banner"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg cursor-pointer transition">
                                Replace
                                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLetterheadUpload} />
                              </label>
                              <button
                                type="button"
                                onClick={() => { setPdfHeaderImage(null); setLetterheadAspectRatio(null); }}
                                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Aspect Ratio Check Warning */}
                          {letterheadAspectRatio && (letterheadAspectRatio < 1.2 || letterheadAspectRatio > 1.6) && (
                            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-center justify-between text-xs text-amber-300">
                              <span>⚠️ Uploaded image aspect ratio differs from standard A4 (1:1.414).</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPdfBackgroundFit("A4")}
                                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-2.5 py-1 rounded font-medium transition"
                                >
                                  Fit to A4
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPdfBackgroundFit("HEADER")}
                                  className="bg-white/10 hover:bg-white/20 text-zinc-300 px-2.5 py-1 rounded transition"
                                >
                                  Keep Proportions
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Step 8 & 10: Interactive A4 Visual Canvas & Live Preview */}
                    <div className="bg-black/50 border border-white/10 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <span>👁️</span> Interactive A4 Letterhead Canvas & Content Box Editor
                        </label>
                        <span className="text-[11px] text-zinc-400 font-mono">A4 Canvas: 595pt × 841pt</span>
                      </div>

                      {/* Overflow Warning Badge */}
                      {((pdfTemplate || basePrompt || "").length * (pdfFontSize * 0.55)) > (pdfContentWidth * (pdfContentHeight / (pdfFontSize * pdfLineHeight * 14))) && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center justify-between text-xs text-red-300">
                          <span>⚠️ Content exceeds the available letter area.</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPdfFontSize(Math.max(9, pdfFontSize - 1))}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-2.5 py-1 rounded font-medium transition"
                            >
                              Reduce Font Slightly
                            </button>
                            <button
                              type="button"
                              onClick={() => setPdfLineHeight(Math.max(1.0, parseFloat((pdfLineHeight - 0.1).toFixed(2))))}
                              className="bg-white/10 hover:bg-white/20 text-zinc-300 px-2.5 py-1 rounded transition"
                            >
                              Reduce Spacing
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Scaled A4 Preview Container */}
                      <div className="flex justify-center bg-zinc-950 p-6 rounded-xl border border-white/10 overflow-hidden">
                        <div
                          className="relative bg-white shadow-2xl rounded border border-zinc-300"
                          style={{
                            width: "380px",
                            height: "537px", // 380 * 1.414 (A4 aspect ratio)
                          }}
                        >
                          {/* Layer 1: Background Image */}
                          {pdfHeaderImage ? (
                            <img
                              src={pdfHeaderImage}
                              alt="A4 Letterhead Background"
                              className="absolute inset-0 w-full h-full"
                              style={{
                                objectFit: pdfBackgroundFit === "A4" ? "cover" : "contain"
                              }}
                            />
                          ) : (
                            <div className="absolute top-4 left-6 right-6 border-b border-zinc-200 pb-2 flex justify-between items-center text-zinc-900">
                              <div>
                                <p className="font-bold text-indigo-600 uppercase text-[10px] tracking-wide">LUGACITY OPTIMAL SOLUTIONS</p>
                                <p className="text-[8px] text-zinc-400 uppercase">Official Documentation</p>
                              </div>
                            </div>
                          )}

                          {/* Layer 2: Interactive Content Box Overlay */}
                          <div
                            className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 rounded p-2 transition-all cursor-move group"
                            style={{
                              left: `${(pdfContentX / 595.28) * 100}%`,
                              top: `${(pdfContentY / 841.89) * 100}%`,
                              width: `${(pdfContentWidth / 595.28) * 100}%`,
                              height: `${(pdfContentHeight / 841.89) * 100}%`,
                            }}
                          >
                            <div className="absolute -top-5 left-0 bg-indigo-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow">
                              Content Box ({pdfContentX}x, {pdfContentY}y)
                            </div>

                            <div
                              className="w-full h-full overflow-hidden text-zinc-900 leading-normal"
                              style={{
                                fontSize: `${pdfFontSize * (380 / 595.28)}px`,
                                lineHeight: pdfLineHeight,
                                textAlign: pdfAlignment.toLowerCase() as any
                              }}
                            >
                              {pdfTitle ? <p className="font-bold text-zinc-900 mb-1">{pdfTitle}</p> : null}
                              <div className="whitespace-pre-wrap">
                                {pdfTemplate || basePrompt || "Dear John,\n\nWe are pleased to invite you to our upcoming cohort program. Please find your selection details enclosed in this document.\n\nBest regards,\nLUGACITY Team"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 9: Precision Controls Panel */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/10 text-xs">
                        {/* Position Inputs */}
                        <div className="space-y-2">
                          <label className="block font-semibold uppercase tracking-wider text-zinc-400">Position (Points)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">X (Left Offset)</span>
                              <input
                                type="number"
                                value={pdfContentX}
                                onChange={(e) => setPdfContentX(parseInt(e.target.value) || 0)}
                                className="w-full bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">Y (Top Offset)</span>
                              <input
                                type="number"
                                value={pdfContentY}
                                onChange={(e) => setPdfContentY(parseInt(e.target.value) || 0)}
                                className="w-full bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Size Inputs */}
                        <div className="space-y-2">
                          <label className="block font-semibold uppercase tracking-wider text-zinc-400">Size (Points)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">Width</span>
                              <input
                                type="number"
                                value={pdfContentWidth}
                                onChange={(e) => setPdfContentWidth(parseInt(e.target.value) || 100)}
                                className="w-full bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">Height</span>
                              <input
                                type="number"
                                value={pdfContentHeight}
                                onChange={(e) => setPdfContentHeight(parseInt(e.target.value) || 100)}
                                className="w-full bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Typography & Alignment */}
                        <div className="space-y-2">
                          <label className="block font-semibold uppercase tracking-wider text-zinc-400">Typography & Alignment</label>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">Font Size</span>
                              <select
                                value={pdfFontSize}
                                onChange={(e) => setPdfFontSize(parseInt(e.target.value))}
                                className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-white"
                              >
                                {[9, 10, 11, 12, 13, 14, 16, 18].map(s => (
                                  <option key={s} value={s}>{s}pt</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">Line Spacing</span>
                              <select
                                value={pdfLineHeight}
                                onChange={(e) => setPdfLineHeight(parseFloat(e.target.value))}
                                className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-white"
                              >
                                {[1.0, 1.2, 1.3, 1.4, 1.5, 1.8, 2.0].map(h => (
                                  <option key={h} value={h}>{h}x</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">Align</span>
                              <div className="flex border border-white/10 rounded overflow-hidden">
                                {["LEFT", "CENTER", "RIGHT", "JUSTIFY"].map((al) => (
                                  <button
                                    type="button"
                                    key={al}
                                    onClick={() => setPdfAlignment(al as any)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold ${pdfAlignment === al ? "bg-indigo-600 text-white" : "bg-black/30 text-zinc-400"}`}
                                  >
                                    {al[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {pdfContentSource === "CUSTOM" && (
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Document Title</label>
                          <input
                            type="text"
                            value={pdfTitle}
                            onChange={(e) => setPdfTitle(e.target.value)}
                            placeholder="e.g. Executive Notification Letter"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">PDF Document Composer</label>
                            <span className="text-xs text-indigo-400 font-mono">Placeholders: [Name], [Company], [Job Title]</span>
                          </div>
                          <textarea
                            value={pdfTemplate}
                            onChange={(e) => setPdfTemplate(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white min-h-[180px] text-sm focus:outline-none focus:border-indigo-500 transition resize-y font-sans"
                            placeholder={"Dear [Name],\n\nWe are pleased to inform you that you have been selected for [Company].\n\nProgramme: [Company]\nStart Date: September 2, 2026\n\nCongratulations..."}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: ATTACHMENTS & CALENDAR */}
          {step === 4 && (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-medium text-white mb-2">
                {campaignType === "MEETING" ? "Calendar & Meeting Settings" : "Attachments"}
              </h2>
              <p className="text-zinc-400 mb-8">
                {campaignType === "MEETING"
                  ? "Configure how Aura should schedule these meetings and generate Google Meet links."
                  : "Attach any files, pitch decks, or resources to this campaign."}
              </p>

              {campaignType === "MEETING" ? (
                <div className="flex flex-col gap-6">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-xl flex items-start gap-4">
                    <div className="text-2xl">📅</div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Google Calendar Integration Active</h3>
                      <p className="text-sm text-indigo-300">Aura will automatically generate a unique Google Meet link and send calendar invites when the recipient approves the meeting.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-400">Event Date</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-400">Event Time</label>
                      <input
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Meeting Duration</label>
                    <select
                      value={eventDuration}
                      onChange={(e) => setEventDuration(e.target.value)}
                      className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="90">1.5 Hours</option>
                      <option value="120">2 Hours</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/5 border border-dashed border-white/20 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 transition"
                  >
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleAttachmentUpload}
                    />
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-indigo-400 mb-4 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-zinc-400 mb-4" />
                    )}
                    <h3 className="text-white font-medium mb-1">
                      {isUploading ? "Uploading..." : "Upload Attachments"}
                    </h3>
                    <p className="text-sm text-zinc-400">Drag and drop files here, or click to browse.</p>
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-col gap-2 mt-4">
                      <h4 className="text-sm font-medium text-zinc-400">Attached Files</h4>
                      {attachments.map(att => (
                        <div key={att.id || att.originalFilename} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-white">{att.originalFilename}</span>
                              <span className="text-xs text-zinc-500">{(att.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: AI GENERATION */}
          {step === 5 && (
            <div className="max-w-3xl animate-in fade-in zoom-in-95 duration-700 h-[400px] flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500 blur-[40px] opacity-30 animate-pulse rounded-full" />
                <div className="w-20 h-20 bg-indigo-500/20 border border-indigo-500/50 rounded-full flex items-center justify-center relative animate-bounce shadow-[0_0_50px_rgba(99,102,241,0.5)]">
                  <Wand2 className="w-10 h-10 text-indigo-400" />
                </div>
              </div>
              <h2 className="text-3xl font-medium text-white mb-3">Aura is working her magic...</h2>
              <p className="text-zinc-400 max-w-md mx-auto">
                Analyzing recipient profiles, extracting context, and generating highly personalized emails. This might take a few moments.
              </p>
            </div>
          )}

          {/* STEP 6: REVIEW & APPROVE */}
          {step === 6 && (
            <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-medium text-white mb-2">Review & Approve Drafts</h2>
                  <p className="text-zinc-400">Review the AI-generated personalized emails before they are sent.</p>
                </div>
                <button
                  onClick={handleApproveAll}
                  className="bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition border border-white/10"
                >
                  Approve All
                </button>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Recipient</th>
                        <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject & Preview</th>
                        <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">PDF Attachment</th>
                        <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {campaignRecipients.map((recipient) => (
                        <tr key={recipient.id} className="hover:bg-white/5 transition group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-white">{recipient.contact?.name || "Unknown"}</span>
                              <span className="text-xs text-zinc-500">{recipient.contact?.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col max-w-[200px] lg:max-w-[280px]">
                              <span className="text-sm text-zinc-300 truncate font-medium">{recipient.personalizedSubject || "No Subject"}</span>
                              <span className="text-xs text-zinc-500 truncate">{recipient.personalizedBody || "No Body"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pdfEnabled || pdfTemplate || pdfTitle || recipient.personalizedPdfContent ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                <span>📄</span> {pdfFilename || "Official_Notice.pdf"}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-600">None</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {recipient.approvalStatus === "APPROVED" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Needs Review
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-3 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingDraft(recipient)}
                                className="text-indigo-400 hover:text-indigo-300 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingDraftId(recipient.id)}
                                className="text-red-400 hover:text-red-300 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {campaignRecipients.length === 0 && (
                    <div className="p-8 text-center text-zinc-500">
                      No recipients found for this campaign.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: SCHEDULE & SEND */}
          {step === 7 && (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
              <h2 className="text-2xl font-medium text-white mb-2">Schedule Campaign</h2>
              <p className="text-zinc-400 mb-8">Decide when Aura should send out these personalized emails.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div
                  onClick={() => setScheduleType("immediate")}
                  className={`p-6 rounded-2xl border cursor-pointer transition flex flex-col gap-3 ${scheduleType === "immediate"
                    ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                    : "bg-black/40 border-white/10 hover:bg-white/5"
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-xl">🚀</div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${scheduleType === "immediate" ? "border-indigo-500" : "border-zinc-500"}`}>
                      {scheduleType === "immediate" && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                    </div>
                  </div>
                  <h3 className="text-white font-medium text-lg">Send Immediately</h3>
                  <p className="text-sm text-zinc-400">Emails will be dispatched as soon as you hit launch.</p>
                </div>

                <div
                  onClick={() => setScheduleType("scheduled")}
                  className={`p-6 rounded-2xl border cursor-pointer transition flex flex-col gap-3 ${scheduleType === "scheduled"
                    ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                    : "bg-black/40 border-white/10 hover:bg-white/5"
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-xl">🕒</div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${scheduleType === "scheduled" ? "border-indigo-500" : "border-zinc-500"}`}>
                      {scheduleType === "scheduled" && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                    </div>
                  </div>
                  <h3 className="text-white font-medium text-lg">Schedule for Later</h3>
                  <p className="text-sm text-zinc-400">Pick a specific date and time for these to go out.</p>
                </div>
              </div>

              {scheduleType === "scheduled" && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                    <label className="block text-sm font-medium text-zinc-400 mb-3">Select Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Nav */}
          <div className="fixed bottom-0 left-0 md:left-64 right-0 p-6 bg-[#0F0F12]/80 backdrop-blur-md border-t border-white/10 flex justify-end gap-4 z-10">
            {step > 1 && step !== 5 && (
              <button
                onClick={() => setStep(step === 6 ? 4 : step - 1)}
                disabled={loading}
                className="text-zinc-400 px-6 py-3 rounded-full text-sm font-medium hover:text-white transition disabled:opacity-50"
              >
                Back
              </button>
            )}

            {step === 1 && (
              <button
                onClick={handleCreateCampaign}
                disabled={loading}
                className="bg-white text-black px-8 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next: Select Recipients <ChevronRight className="w-4 h-4" /></>}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleSaveRecipients}
                disabled={loading}
                className="bg-white text-black px-8 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next: Write Prompt <ChevronRight className="w-4 h-4" /></>}
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleSavePrompt}
                disabled={loading}
                className="bg-white text-black px-8 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next: Settings <ChevronRight className="w-4 h-4" /></>}
              </button>
            )}

            {step === 4 && (
              <>
                {campaignRecipients.length > 0 && campaignRecipients.some(r => r.approvalStatus !== "PENDING") ? (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleStartGeneration(true)}
                      disabled={loading}
                      className="bg-zinc-800 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-zinc-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Regenerate Drafts <Wand2 className="w-4 h-4" /></>}
                    </button>
                    <button
                      onClick={() => setStep(6)}
                      disabled={loading}
                      className="bg-white text-black px-8 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2"
                    >
                      Continue to Review <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartGeneration(false)}
                    disabled={loading}
                    className="bg-white text-black px-8 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{generationMode === "ai" ? "Start AI Generation" : "Generate Drafts"} <Wand2 className="w-4 h-4" /></>}
                  </button>
                )}
              </>
            )}

            {step === 5 && (
              <button
                disabled
                className="bg-white/10 text-white/50 px-8 py-3 rounded-full text-sm font-medium transition flex items-center gap-2 cursor-not-allowed"
              >
                Generating...
              </button>
            )}

            {step === 6 && (
              <button
                onClick={() => setStep(7)}
                disabled={loading}
                className="bg-white text-black px-8 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next: Schedule <ChevronRight className="w-4 h-4" /></>}
              </button>
            )}

            {step === 7 && (
              <button
                onClick={handleLaunchCampaign}
                disabled={loading || (scheduleType === "scheduled" && !scheduledDate)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Launch Campaign 🚀</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Edit Drawer */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingDraft(null)} />

          <div className="relative w-full max-w-2xl bg-[#121214] h-full shadow-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-medium text-white">Edit Draft</h3>
                <p className="text-sm text-zinc-400 mt-1">Editing email for {editingDraft.contact?.name}</p>
              </div>
              <button onClick={() => setEditingDraft(null)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-400">Subject Line</label>
                <input
                  type="text"
                  value={editingDraft.personalizedSubject || ""}
                  onChange={e => setEditingDraft({ ...editingDraft, personalizedSubject: e.target.value })}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-400">Email Body</label>
                <textarea
                  value={editingDraft.personalizedBody || ""}
                  onChange={e => setEditingDraft({ ...editingDraft, personalizedBody: e.target.value })}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-y min-h-[160px]"
                />
              </div>

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                    <span>📄</span> Attached PDF Document Content
                  </label>
                  <span className="text-xs text-zinc-500">Generates {pdfFilename || "Official_Notice.pdf"}</span>
                </div>
                <textarea
                  value={editingDraft.personalizedPdfContent !== undefined && editingDraft.personalizedPdfContent !== null ? editingDraft.personalizedPdfContent : (pdfTemplate || pdfTitle || editingDraft.personalizedBody || "")}
                  onChange={e => setEditingDraft({ ...editingDraft, personalizedPdfContent: e.target.value })}
                  placeholder="Enter custom PDF text content for this recipient..."
                  className="bg-black/50 border border-indigo-500/30 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-y min-h-[180px]"
                />
                <p className="text-xs text-zinc-400">This content will be rendered into a PDF attachment and delivered to {editingDraft.contact?.email}.</p>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0F0F12]">
              <button onClick={() => setEditingDraft(null)} className="px-5 py-2.5 rounded-full text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition">
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isDraftSaving}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {isDraftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {deletingDraftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setDeletingDraftId(null)} />
          <div className="bg-[#18181B] border border-red-500/20 rounded-2xl w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Delete this draft?</h3>
              <p className="text-zinc-400 text-sm mb-6">
                This action cannot be undone. This recipient will be removed from the campaign entirely.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingDraftId(null)}
                  disabled={isDeletingDraft}
                  className="flex-1 bg-white/5 text-zinc-300 hover:text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-white/10 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDraft}
                  disabled={isDeletingDraft}
                  className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-full text-sm font-medium transition border border-red-500/20 hover:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingDraft ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    "Yes, delete it"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Sample Preview Modal */}
      {showPdfPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPdfPreviewModal(false)}></div>
          <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-lg w-full relative shadow-2xl p-6 z-10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h3 className="text-white font-medium text-base">A4 PDF Letterhead Preview</h3>
              </div>
              <button
                onClick={() => setShowPdfPreviewModal(false)}
                className="text-zinc-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-400 mb-3 flex items-center justify-between w-full">
              <span>Attached: <strong className="text-indigo-400">{pdfFilename || "Official_Notice.pdf"}</strong></span>
              <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono text-[10px]">Sample Contact: Sarah Johnson</span>
            </div>

            {/* Scaled A4 Letterhead Rendered Container */}
            <div className="flex justify-center bg-zinc-950 p-3 rounded-xl border border-white/10 overflow-hidden w-full">
              <div
                className="relative bg-white shadow-2xl rounded border border-zinc-300 overflow-hidden"
                style={{
                  width: "320px",
                  height: "452px", // 320 * 1.414 (A4 ratio)
                }}
              >
                {pdfHeaderImage && (
                  <img
                    src={pdfHeaderImage}
                    alt="Letterhead Background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                <div
                  className="absolute p-2 overflow-hidden"
                  style={{
                    left: `${(pdfContentX / 595.28) * 100}%`,
                    top: `${(pdfContentY / 841.89) * 100}%`,
                    width: `${(pdfContentWidth / 595.28) * 100}%`,
                    height: `${(pdfContentHeight / 841.89) * 100}%`,
                  }}
                >
                  <div
                    className="w-full h-full text-zinc-900 leading-normal"
                    style={{
                      fontSize: `${pdfFontSize * (320 / 595.28)}px`,
                      lineHeight: pdfLineHeight,
                      textAlign: pdfAlignment.toLowerCase() as any
                    }}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {cleanBrowserText(
                        replaceContactPlaceholders(
                          pdfContentSource === "EMAIL_BODY" ? basePrompt : (pdfTemplate || basePrompt || ""),
                          {
                            name: "Sarah Johnson",
                            company: "Frontend Development",
                            jobTitle: "Cohort Student",
                            department: "Engineering",
                            email: "sarah@example.com"
                          }
                        )
                      ) || "Dear Sarah Johnson,\n\nOfficial document content will render inside this box."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPdfPreviewModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-5 py-2 rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline icon component since Users wasn't imported from lucide-react in the new block above
function UsersIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
