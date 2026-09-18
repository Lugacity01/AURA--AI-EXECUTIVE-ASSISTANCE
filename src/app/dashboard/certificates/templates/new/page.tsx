"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Sparkles, Image as ImageIcon, Award } from "lucide-react";

export default function NewCertificateTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [canvasHeight, setCanvasHeight] = useState(707);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgFile(file);
      const url = URL.createObjectURL(file);
      setBgPreview(url);

      // Auto detect image dimensions if possible
      const img = new Image();
      img.onload = () => {
        if (img.width && img.height) {
          // Normalize resolution to canonical width 1000px
          const ratio = img.height / img.width;
          setCanvasWidth(1000);
          setCanvasHeight(Math.round(1000 * ratio));
        }
      };
      img.src = url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (description.trim()) formData.append("description", description.trim());
      formData.append("canvasWidth", String(canvasWidth));
      formData.append("canvasHeight", String(canvasHeight));
      formData.append("fields", JSON.stringify([]));

      if (bgFile) {
        formData.append("background", bgFile);
      }

      const res = await fetch("/api/certificate-templates", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create template");
      }

      router.push(`/dashboard/certificates/templates/${data.template.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create template");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <Link
          href="/dashboard/certificates"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Certificates Hub</span>
        </Link>
      </div>

      <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Create Certificate Template</h1>
            <p className="text-xs text-slate-400 font-light mt-0.5">
              Upload artwork background designed in Canva/Figma and set canonical dimensions.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Background Upload Box */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Certificate Background Artwork (PNG / JPG)
            </label>
            <div className="relative border-2 border-dashed border-white/[0.1] hover:border-indigo-500/50 rounded-2xl p-6 text-center bg-white/[0.01] hover:bg-white/[0.02] transition cursor-pointer group">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />

              {bgPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={bgPreview}
                    alt="Background preview"
                    className="max-h-48 rounded-xl object-contain border border-white/[0.08] shadow-md"
                  />
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Change Image Artwork
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-slate-200">
                      Click to upload background artwork
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Recommended: High resolution PNG / JPG (A4 Landscape aspect ratio)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Template Details */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Template Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Standard Certificate of Completion"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Describe the purpose or style of this certificate template..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Canvas Dimensions */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Canvas Width (px)</label>
                <input
                  type="number"
                  value={canvasWidth}
                  onChange={(e) => setCanvasWidth(parseInt(e.target.value, 10) || 1000)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Canvas Height (px)</label>
                <input
                  type="number"
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(parseInt(e.target.value, 10) || 707)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-5">
            <Link
              href="/dashboard/certificates"
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Creating Template..." : "Create & Open Designer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
