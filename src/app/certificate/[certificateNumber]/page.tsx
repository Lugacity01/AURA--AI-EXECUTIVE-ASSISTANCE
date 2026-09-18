"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ShieldAlert, Award, Calendar, UserCheck, Building } from "lucide-react";

export default function PublicCertificateVerificationPage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const { certificateNumber } = use(params);

  const { data: verificationData, isLoading, error } = useQuery({
    queryKey: ["verifyCertificate", certificateNumber],
    queryFn: async () => {
      const res = await fetch(`/api/certificates/verify/${certificateNumber}`);
      if (!res.ok) throw new Error("Failed to perform verification lookup");
      const data = await res.json();
      return data.verification;
    },
  });

  return (
    <div className="min-h-screen bg-[#030307] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="bg-grid absolute inset-0 pointer-events-none opacity-40" />
      <div className="glowing-orb orb-purple opacity-20" />

      <div className="w-full max-w-xl bg-black/50 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative z-10 flex flex-col gap-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-sm">Aura Verification Portal</span>
              <p className="text-[10px] text-slate-400 font-mono">OFFICIAL DLT RECORD</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-slate-400">
            <span>ID:</span>
            <span className="text-indigo-400 font-bold">{certificateNumber}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono animate-pulse">
            Performing verification query...
          </div>
        ) : error || !verificationData?.found ? (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Invalid Certificate Record</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                No active certificate record could be found matching reference number <span className="font-mono text-slate-200">{certificateNumber}</span>.
              </p>
            </div>
          </div>
        ) : verificationData.status === "REVOKED" ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <XCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">Certificate Revoked</h3>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  This certificate was officially revoked by the issuing authority and is no longer valid.
                </p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 text-xs opacity-75">
              <div className="flex justify-between border-b border-white/[0.04] pb-3">
                <span className="text-slate-400">Recipient Name</span>
                <span className="font-semibold text-slate-200">{verificationData.recipientName}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-3">
                <span className="text-slate-400">Certificate Title</span>
                <span className="font-semibold text-slate-200">{verificationData.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Issue Date</span>
                <span className="font-mono text-slate-300">
                  {new Date(verificationData.issueDate!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Active Status Badge */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-emerald-300">Authentic & Verified</h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  This certificate has been verified as authentic and validly issued by Aura AI.
                </p>
              </div>
            </div>

            {/* Certificate Meta Details */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-5 text-xs">
              <div className="flex flex-col gap-1 border-b border-white/[0.04] pb-4">
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                  Issued To
                </span>
                <span className="text-lg font-bold text-white">{verificationData.recipientName}</span>
                {verificationData.recipientCompany && (
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    {verificationData.recipientCompany}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 border-b border-white/[0.04] pb-4">
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">
                  Certificate Title
                </span>
                <span className="text-base font-bold text-slate-100">{verificationData.title}</span>
                {verificationData.description && (
                  <p className="text-xs text-slate-400 font-light mt-1 leading-relaxed">
                    "{verificationData.description}"
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Issue Date</span>
                  <span className="font-mono text-slate-200">
                    {new Date(verificationData.issueDate!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>

                {verificationData.issuerName && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Issued By</span>
                    <span className="font-semibold text-slate-200">{verificationData.issuerName}</span>
                    {verificationData.issuerTitle && (
                      <span className="text-[10px] text-slate-400">{verificationData.issuerTitle}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/[0.06] pt-4 text-center">
          <span className="text-[10px] text-slate-500 font-mono">
            Verified by Aura Executive Assistant Platform • All Rights Reserved
          </span>
        </div>
      </div>
    </div>
  );
}
