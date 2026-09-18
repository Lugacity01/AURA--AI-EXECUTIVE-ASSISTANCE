"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  Move,
  Type,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  QrCode,
  Sparkles,
  Layers,
  Plus
} from "lucide-react";
import { AVAILABLE_FIELDS } from "@/services/certificates/certificate-field-resolver";
import { FieldConfig } from "@/services/certificates/types";

export default function CertificateDesignerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: templateId } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dragging state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch Template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/certificate-templates/${templateId}`);
        if (!res.ok) throw new Error("Failed to load template");
        const data = await res.json();
        setTemplate(data.template);
        setFields(data.template.parsedFields || []);
      } catch (err: any) {
        setError(err.message || "Failed to load template");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [templateId]);

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  // Add field to canvas
  const handleAddField = (defKey: string) => {
    const def = AVAILABLE_FIELDS.find((f) => f.key === defKey);
    if (!def) return;

    const newField: FieldConfig = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: def.type,
      key: def.key,
      label: def.label,
      x: 200,
      y: 200,
      width: def.defaultWidth,
      height: def.defaultHeight,
      fontFamily: "Helvetica",
      fontSize: def.defaultFontSize,
      fontWeight: def.defaultFontWeight,
      alignment: def.defaultAlignment,
      color: "#000000",
      autoFit: true,
      minFontSize: 2,
      wrapping: true,
      customText: def.type === "CUSTOM_FIELD" ? "Custom Text" : undefined,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Update selected field property
  const handleUpdateField = (key: keyof FieldConfig, value: any) => {
    if (!selectedFieldId) return;
    setFields((prev) =>
      prev.map((f) => (f.id === selectedFieldId ? { ...f, [key]: value } : f))
    );
  };

  // Delete field
  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  // Save template
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/certificate-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save layout");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save template layout");
    } finally {
      setSaving(false);
    }
  };

  // Dragging logic
  const handleMouseDownField = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setDraggingFieldId(fieldId);

    const field = fields.find((f) => f.id === fieldId);
    if (!field || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = (template?.canvasWidth || 1000) / rect.width;
    const scaleY = (template?.canvasHeight || 707) / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    setDragOffset({
      x: mouseX - field.x,
      y: mouseY - field.y,
    });
  };

  // Resizing state
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const handleMouseDownResize = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setResizingFieldId(fieldId);

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: field.width,
      height: field.height,
    });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = (template?.canvasWidth || 1000) / rect.width;
    const scaleY = (template?.canvasHeight || 707) / rect.height;

    if (resizingFieldId) {
      const deltaX = (e.clientX - resizeStart.x) * scaleX;
      const deltaY = (e.clientY - resizeStart.y) * scaleY;

      const newWidth = Math.max(30, Math.round(resizeStart.width + deltaX));
      const newHeight = Math.max(15, Math.round(resizeStart.height + deltaY));

      setFields((prev) =>
        prev.map((f) => (f.id === resizingFieldId ? { ...f, width: newWidth, height: newHeight } : f))
      );
      return;
    }

    if (draggingFieldId) {
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      let newX = Math.round(mouseX - dragOffset.x);
      let newY = Math.round(mouseY - dragOffset.y);

      // Bound checks
      newX = Math.max(0, Math.min(newX, (template?.canvasWidth || 1000) - 20));
      newY = Math.max(0, Math.min(newY, (template?.canvasHeight || 707) - 20));

      setFields((prev) =>
        prev.map((f) => (f.id === draggingFieldId ? { ...f, x: newX, y: newY } : f))
      );
    }
  };

  const handleMouseUpCanvas = () => {
    setDraggingFieldId(null);
    setResizingFieldId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-xs">
        Loading certificate designer...
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="p-8 text-center text-rose-400 text-xs">
        Error loading template: {error}
      </div>
    );
  }

  const canvasW = template?.canvasWidth || 1000;
  const canvasH = template?.canvasHeight || 707;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1600px] mx-auto gap-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-black/40 border border-white/[0.06] px-5 py-3 rounded-2xl backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/certificates"
            className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {template?.name}
              <span className="text-[10px] font-mono font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {canvasW} × {canvasH} px
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-light truncate max-w-md">
              Drag fields onto canvas to position recipient & certificate metadata.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-400 animate-pulse">
              ✓ Saved Layout
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Template Layout"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs shrink-0">
          {error}
        </div>
      )}

      {/* Main Designer Workbench Grid */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* LEFT PANEL: Available Fields */}
        <div className="col-span-3 bg-black/40 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl flex flex-col min-h-0 overflow-y-auto no-scrollbar">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3">
            Available Fields
          </h3>

          <div className="flex flex-col gap-4">
            {/* Contact Fields */}
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2 font-mono">
                Contact Fields
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_FIELDS.filter((f) => f.type === "CONTACT_FIELD").map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleAddField(f.key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-indigo-500/10 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-medium transition cursor-pointer group"
                  >
                    <Plus className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Certificate Fields */}
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2 font-mono">
                Certificate Fields
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_FIELDS.filter((f) => f.type === "CERTIFICATE_FIELD").map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleAddField(f.key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-purple-500/10 hover:border-purple-500/30 text-slate-300 hover:text-purple-300 text-xs font-medium transition cursor-pointer group"
                  >
                    <Plus className="w-3 h-3 text-slate-500 group-hover:text-purple-400" />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom & QR Code */}
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-2 font-mono">
                Custom & Verification
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_FIELDS.filter((f) => f.type === "CUSTOM_FIELD" || f.type === "QR_CODE").map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleAddField(f.key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-300 hover:text-amber-300 text-xs font-medium transition cursor-pointer group"
                  >
                    <Plus className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Canvas */}
        <div
          className="col-span-6 bg-black/60 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden select-none min-h-0"
          onClick={() => setSelectedFieldId(null)}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
        >
          <div
            ref={canvasRef}
            style={{
              aspectRatio: `${canvasW} / ${canvasH}`,
              width: "100%",
              maxHeight: "100%",
            }}
            className="relative bg-slate-900 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden cursor-crosshair"
          >
            {/* Background Image */}
            {template?.backgroundStorageKey && (
              <img
                src={template.backgroundStorageKey}
                alt="Certificate Artwork Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Dynamic Fields Overlays */}
            {fields.map((field) => {
              const isSelected = field.id === selectedFieldId;
              const def = AVAILABLE_FIELDS.find((d) => d.key === field.key);
              const previewText =
                field.type === "CUSTOM_FIELD"
                  ? field.customText || "Custom Text"
                  : def?.defaultText || field.label;

              // Scale field coordinates (0-100%)
              const leftPct = (field.x / canvasW) * 100;
              const topPct = (field.y / canvasH) * 100;
              const widthPct = (field.width / canvasW) * 100;
              const heightPct = (field.height / canvasH) * 100;

              return (
                <div
                  key={field.id}
                  onMouseDown={(e) => handleMouseDownField(e, field.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFieldId(field.id);
                  }}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                  }}
                  className={`absolute group cursor-move flex items-center ${
                    field.alignment === "left"
                      ? "justify-start text-left"
                      : field.alignment === "right"
                      ? "justify-end text-right"
                      : "justify-center text-center"
                  } ${
                    isSelected
                      ? "ring-2 ring-indigo-500 bg-indigo-500/10 z-20"
                      : "hover:ring-1 hover:ring-white/40 z-10"
                  }`}
                >
                  {field.type === "QR_CODE" ? (
                    <div className="w-full h-full border border-dashed border-indigo-400 bg-indigo-950/40 flex flex-col items-center justify-center p-1 pointer-events-none">
                      <QrCode className="w-6 h-6 text-indigo-300" />
                      <span className="text-[8px] text-indigo-300 font-mono">QR VERIFY</span>
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
                        {previewText}
                      </text>
                    </svg>
                  )}

                  {/* Controls on active selection */}
                  {isSelected && (
                    <>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                        className="absolute -top-3 -right-3 p-1 rounded-full bg-rose-600 text-white shadow-md hover:scale-110 transition z-30 cursor-pointer"
                        title="Remove field"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Resize Handle (Bottom-Right) */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, field.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-sm cursor-se-resize border border-white z-30 shadow hover:scale-125 transition"
                        title="Drag to resize field bounds"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Field Properties Form */}
        <div className="col-span-3 bg-black/40 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl flex flex-col min-h-0 overflow-y-auto no-scrollbar">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3">
            Field Properties
          </h3>

          {selectedField ? (
            <div className="flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                <span className="font-semibold text-indigo-300">{selectedField.label}</span>
                <span className="text-[9px] font-mono text-slate-500">{selectedField.key}</span>
              </div>

              {/* Custom Text input if Custom Field */}
              {selectedField.type === "CUSTOM_FIELD" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-medium">Custom Text</label>
                  <input
                    type="text"
                    value={selectedField.customText || ""}
                    onChange={(e) => handleUpdateField("customText", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              )}

              {/* Position & Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Position X (px)</label>
                  <input
                    type="number"
                    value={selectedField.x}
                    onChange={(e) => handleUpdateField("x", parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Position Y (px)</label>
                  <input
                    type="number"
                    value={selectedField.y}
                    onChange={(e) => handleUpdateField("y", parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Width (px)</label>
                  <input
                    type="number"
                    value={selectedField.width}
                    onChange={(e) => handleUpdateField("width", parseInt(e.target.value, 10) || 50)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Height (px)</label>
                  <input
                    type="number"
                    value={selectedField.height}
                    onChange={(e) => handleUpdateField("height", parseInt(e.target.value, 10) || 30)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Typography */}
              {selectedField.type !== "QR_CODE" && (
                <>
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.04]">
                    <label className="text-slate-400 font-medium">Font Family</label>
                    <select
                      value={selectedField.fontFamily}
                      onChange={(e) => handleUpdateField("fontFamily", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-slate-900 text-slate-200 text-xs focus:outline-none"
                    >
                      <option value="Helvetica">Helvetica (Sans-Serif)</option>
                      <option value="Times-Roman">Times-Roman (Serif)</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  {/* Font Size & Weight */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-400 font-medium">Font Size (px)</label>
                        <span className="text-[10px] font-mono text-indigo-400 font-bold">
                          {selectedField.fontSize || 16}px
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateField("fontSize", Math.max(2, (selectedField.fontSize || 16) - 1))}
                          className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-slate-300 font-bold flex items-center justify-center transition cursor-pointer select-none"
                          title="Decrease font size"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          min={2}
                          max={200}
                          value={selectedField.fontSize ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              handleUpdateField("fontSize", 2);
                            } else {
                              const val = parseInt(raw, 10);
                              handleUpdateField("fontSize", isNaN(val) ? 2 : Math.max(2, Math.min(200, val)));
                            }
                          }}
                          className="w-full text-center px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs font-mono focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleUpdateField("fontSize", Math.min(200, (selectedField.fontSize || 16) + 1))}
                          className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-slate-300 font-bold flex items-center justify-center transition cursor-pointer select-none"
                          title="Increase font size"
                        >
                          +
                        </button>
                      </div>

                      <input
                        type="range"
                        min={2}
                        max={100}
                        step={1}
                        value={selectedField.fontSize || 16}
                        onChange={(e) => handleUpdateField("fontSize", parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-medium">Font Weight</label>
                      <select
                        value={selectedField.fontWeight}
                        onChange={(e) => handleUpdateField("fontWeight", e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-white/[0.08] bg-slate-900 text-slate-200 text-xs"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 font-medium">Alignment</label>
                    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleUpdateField("alignment", "left")}
                        className={`flex-1 py-1 rounded flex items-center justify-center transition ${
                          selectedField.alignment === "left"
                            ? "bg-indigo-500/20 text-indigo-300 font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateField("alignment", "center")}
                        className={`flex-1 py-1 rounded flex items-center justify-center transition ${
                          selectedField.alignment === "center"
                            ? "bg-indigo-500/20 text-indigo-300 font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateField("alignment", "right")}
                        className={`flex-1 py-1 rounded flex items-center justify-center transition ${
                          selectedField.alignment === "right"
                            ? "bg-indigo-500/20 text-indigo-300 font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Color Picker */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-slate-400 font-medium">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedField.color || "#000000"}
                        onChange={(e) => handleUpdateField("color", e.target.value)}
                        className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-slate-400">{selectedField.color}</span>
                    </div>
                  </div>

                  {/* Auto-Fit Settings */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedField.autoFit !== false}
                        onChange={(e) => handleUpdateField("autoFit", e.target.checked)}
                        className="rounded border-white/[0.2] bg-white/[0.05]"
                      />
                      <span className="text-slate-300 font-medium">Auto-Fit Font Size</span>
                    </label>

                    {selectedField.autoFit !== false && (
                      <div className="flex flex-col gap-1.5 pl-6 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-400">Min Font Size (px)</label>
                          <span className="text-[10px] font-mono text-indigo-400 font-bold">
                            {selectedField.minFontSize !== undefined && selectedField.minFontSize !== null ? selectedField.minFontSize : 2}px
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = selectedField.minFontSize !== undefined && selectedField.minFontSize !== null ? selectedField.minFontSize : 2;
                              handleUpdateField("minFontSize", Math.max(2, cur - 1));
                            }}
                            className="w-6 h-6 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-slate-300 font-bold text-xs flex items-center justify-center transition cursor-pointer select-none"
                            title="Decrease min font size"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min={2}
                            max={100}
                            value={selectedField.minFontSize !== undefined && selectedField.minFontSize !== null ? selectedField.minFontSize : 2}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                handleUpdateField("minFontSize", 2);
                              } else {
                                const val = parseInt(raw, 10);
                                handleUpdateField("minFontSize", isNaN(val) ? 2 : Math.max(2, Math.min(100, val)));
                              }
                            }}
                            className="w-full text-center px-1.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 text-xs font-mono focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const cur = selectedField.minFontSize !== undefined && selectedField.minFontSize !== null ? selectedField.minFontSize : 2;
                              handleUpdateField("minFontSize", Math.min(100, cur + 1));
                            }}
                            className="w-6 h-6 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-slate-300 font-bold text-xs flex items-center justify-center transition cursor-pointer select-none"
                            title="Increase min font size"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                onClick={() => handleDeleteField(selectedField.id)}
                className="flex items-center justify-center gap-2 w-full py-2 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Field from Canvas</span>
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs font-light">
              Select a field on the canvas or click an available field from the left panel to configure positioning & typography properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
