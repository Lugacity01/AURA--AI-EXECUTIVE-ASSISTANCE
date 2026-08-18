"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Sparkles,
  ShieldCheck,
  Send,
  Users,
  Settings,
  ArrowRight,
  Check,
  Play,
  Menu,
  X,
  ChevronRight,
  Clock,
  Lock,
  AlertCircle,
  ExternalLink,
  Cpu,
  Layers,
  Database,
  FileText,
  Upload
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12
    }
  }
};

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleWorkspaceAccess = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (session) {
      router.push("/dashboard");
    } else {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [draftContent, setDraftContent] = useState("");

  const fullDraftText = "Hi David, thanks for reaching out. The Q3 investor deck has been finalized and uploaded to our partner folder. I have checked our calendar and we are available on Tuesday at 10:00 AM PST or Thursday at 2:00 PM PST. Please let me know what works best for you.";

  // Auto-run interactive demo steps
  useEffect(() => {
    if (demoStep === 1) {
      setIsTyping(true);
      setDraftContent("");
      let index = 0;
      const interval = setInterval(() => {
        if (index < fullDraftText.length) {
          setDraftContent((prev) => prev + fullDraftText.charAt(index));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(interval);
          setDemoStep(2); // Move to ready state
        }
      }, 15);
      return () => clearInterval(interval);
    }
  }, [demoStep]);

  const handleResetDemo = () => {
    setDemoStep(0);
    setDraftContent("");
  };

  const handleStartDrafting = () => {
    setDemoStep(1);
  };

  const handleApprove = () => {
    setDemoStep(3); // Approved and sending
    setTimeout(() => {
      setDemoStep(4); // Sent
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#030014] text-slate-200 font-sans antialiased w-full stack-container">
      {/* Inline Layout Override Engine to bypass Turbopack / local caching compilation bugs */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}} />

      {/* Top Header Navigation */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="nav-header"
      >
        <div className="nav-container">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
            </div>
            <span className="font-bold text-lg text-white font-sans tracking-tight">Aura</span>
          </div>

          {/* Links - Desktop */}
          <nav className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#workflow" className="nav-link">Workflow</a>
            <a href="#security" className="nav-link">Trust & Safety</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="nav-link flex items-center gap-1">
              Docs <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Actions - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/dashboard"
              onClick={handleWorkspaceAccess}
              className="px-4 py-1.5 rounded-full text-xs font-semibold border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Enter Workspace
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#030014] pt-24 px-6 flex flex-col gap-6 md:hidden border-b border-white/[0.06]"
          >
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Workflow
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Trust & Safety
            </a>
            <Link
              href="/dashboard"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleWorkspaceAccess(e);
              }}
              className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-center shadow-lg shadow-indigo-500/20"
            >
              Enter Workspace
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="hero-container">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="hero-title"
        >
          Your AI Executive Assistant for <span className="hero-title-gradient">Modern Work</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="hero-description"
        >
          Aura reads, summarizes, risk-scans, and drafts context-aware replies for your emails. You maintain complete control with one-click approvals.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="hero-ctas"
        >
          <Link
            href="/dashboard"
            onClick={handleWorkspaceAccess}
            className="cta-primary"
          >
            Enter Workspace
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#workflow"
            className="cta-secondary"
          >
            Explore Features
          </a>
        </motion.div>
      </section>

      {/* Interactive Mock Window Demo Section */}
      <section className="demo-section">
        {/* Soft atmospheric background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="demo-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [15, -4, 15]
            }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 6,
                ease: "easeInOut"
              },
              default: {
                duration: 0.8,
                delay: 0.4
              }
            }}
            className="w-full relative z-20"
          >
            <div className="glass-panel w-full overflow-hidden border border-white/[0.08] shadow-2xl bg-[#06060f]/90 relative rounded-[20px]">
              {/* Fake Window Header bar */}
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-black/45">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-indigo-500/70" />
                  <span className="text-xs text-slate-500 ml-4 font-mono select-none tracking-wider">WORKSPACE // INCOMING_TRIAGE</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase font-mono">Gmail Sync Active</span>
                </div>
              </div>

              {/* Split Demo Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
                {/* Left Side: Email Triage List */}
                <div className="lg:col-span-5 border-r border-white/[0.06] p-5 flex flex-col gap-4 text-left bg-black/10">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-widest font-mono">Inbox Triage Queue</span>

                  {/* Selected Email Mock */}
                  <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wide uppercase text-indigo-400 font-mono">Needs Triage</span>
                      <span className="text-[10px] text-slate-500 font-mono">10m ago</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">David Chen</span>
                    <span className="text-xs font-medium text-slate-300">Update on Q3 funding & partner meeting schedule</span>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-light">
                      Hey team, just wanted to check if you have finalized the deck and schedule for the partner review next week. Let me know when works best.
                    </p>
                  </div>

                  {/* Other Queue Mocks */}
                  <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] opacity-50 flex flex-col gap-2 cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wide uppercase text-slate-400 font-mono">Processed</span>
                      <span className="text-[10px] text-slate-500 font-mono">1h ago</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-300">Vercel Webhook</span>
                    <span className="text-xs text-slate-400">Deployment successful for project 'aura-dashboard'</span>
                  </div>

                  <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] opacity-30 flex flex-col gap-2 cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wide uppercase text-amber-500 font-mono">Flagged Risk</span>
                      <span className="text-[10px] text-slate-500 font-mono">3h ago</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-300">Stripe Billing</span>
                    <span className="text-xs text-slate-400">Urgent: Subscription payment failed</span>
                  </div>
                </div>

                {/* Right Side: Interactive AI Assistant pane */}
                <div className="lg:col-span-7 p-6 flex flex-col justify-between text-left">
                  {demoStep === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                        <Play className="w-5 h-5 text-indigo-400 ml-0.5 animate-pulse" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-200 mb-2">Simulate AI Workflow</h4>
                      <p className="text-xs text-slate-400 max-w-sm mb-6">
                        Click below to see Aura analyze the email, reference conversation memory, and generate a draft.
                      </p>
                      <button
                        onClick={handleStartDrafting}
                        className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center gap-1.5"
                      >
                        Start Agent Analysis <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {demoStep >= 1 && (
                    <div className="flex-1 flex flex-col gap-4">
                      {/* Meta information tags */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[10px] text-indigo-400 font-semibold font-mono">Confidence: 94%</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[10px] text-indigo-400 font-semibold font-mono">Risk Scan: Low</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">Rule Checked: Meet Coordination</span>
                        </div>
                      </div>

                      {/* Memory Context box */}
                      <div className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-mono leading-none">
                          Context Loaded: David prefers afternoon calendars. Last interaction on Jul 20.
                        </span>
                      </div>

                      {/* Draft content box */}
                      <div className="flex-1 p-4 rounded-xl border border-white/[0.06] bg-black/40 text-xs font-mono relative min-h-[160px] flex flex-col justify-between">
                        <div className="text-slate-300 leading-relaxed font-light">
                          {draftContent}
                          {isTyping && <span className="cursor-blink" />}
                        </div>

                        <div className="text-[10px] text-slate-500 border-t border-white/[0.04] pt-2 flex items-center justify-between">
                          <span>Draft Type: Contextual Reply</span>
                          {isTyping && <span>Typing...</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions Drawer */}
                  {demoStep >= 2 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {demoStep === 2 && <span>Review generated response before sending.</span>}
                        {demoStep === 3 && <span className="text-indigo-400 animate-pulse">Routing response...</span>}
                        {demoStep === 4 && <span className="text-indigo-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Approved & Dispatched via Gmail</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {demoStep === 2 && (
                          <>
                            <button
                              onClick={handleResetDemo}
                              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
                            >
                              Reset
                            </button>
                            <button
                              onClick={handleApprove}
                              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.97] transition-all"
                            >
                              Approve & Send <Send className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {demoStep === 3 && (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                            <span className="w-3 h-3 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
                            Sending
                          </div>
                        )}
                        {demoStep === 4 && (
                          <button
                            onClick={handleResetDemo}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
                          >
                            Triage Next Email
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Statistics metrics bar */}
      <section className="stats-section">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="stats-grid"
        >
          <motion.div variants={fadeInUp} className="stat-item">
            <span className="stat-value">128k+</span>
            <span className="stat-label">Emails Triaged Today</span>
          </motion.div>
          <motion.div variants={fadeInUp} className="stat-item">
            <span className="stat-value text-indigo-400">99.8%</span>
            <span className="stat-label">Approval Accuracy</span>
          </motion.div>
          <motion.div variants={fadeInUp} className="stat-item">
            <span className="stat-value">3h 24m</span>
            <span className="stat-label">Avg Daily Time Saved</span>
          </motion.div>
          <motion.div variants={fadeInUp} className="stat-item">
            <span className="stat-value text-purple-400">100%</span>
            <span className="stat-label">Secure OAuth Integration</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Workflow Section - 100% Full-Width Edge-to-Edge White Canvas Stage */}
      <section id="workflow" className="workflow-section w-full bg-slate-50 border-y border-slate-200/80 py-16 sm:py-28 my-16 sm:my-28 text-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-12 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-10 sm:mb-16 text-center max-w-3xl mx-auto"
          >
            <h3 className="text-2xl sm:text-5xl font-extrabold tracking-tight !text-slate-900 mb-3 sm:mb-4 font-sans leading-tight">
              How Aura Powers Executive Workflows
            </h3>
            <p className="!text-slate-600 text-sm sm:text-lg max-w-xl mx-auto font-normal leading-relaxed font-sans">
              Tap or click any phase below to inspect real-time security scanning, brand-compliant document rendering, and microsecond campaign dispatch in action.
            </p>
          </motion.div>

          {/* 2-Column Interactive Split Showcase Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            
            {/* Left Column: Interactive Step Triggers */}
            <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-4">
              {/* Step 1 Selector */}
              <button
                onClick={() => setActivePipelineStep(0)}
                onMouseEnter={() => setActivePipelineStep(0)}
                className={`text-left p-4 sm:p-6 rounded-2xl transition-all duration-300 border ${
                  activePipelineStep === 0
                    ? "bg-white border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.01] sm:scale-[1.02]"
                    : "bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activePipelineStep === 0 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Inbox className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm sm:text-base">01. Contact Memory & Ingestion</span>
                  </div>
                  {activePipelineStep === 0 && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-0 sm:pl-11">
                  Syncs Gmail OAuth and contact rosters. Automatically groups recipients and indexes thread context into memory.
                </p>
              </button>

              {/* Step 2 Selector */}
              <button
                onClick={() => setActivePipelineStep(1)}
                onMouseEnter={() => setActivePipelineStep(1)}
                className={`text-left p-4 sm:p-6 rounded-2xl transition-all duration-300 border ${
                  activePipelineStep === 1
                    ? "bg-white border-purple-500 shadow-xl shadow-purple-500/10 scale-[1.01] sm:scale-[1.02]"
                    : "bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activePipelineStep === 1 ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm sm:text-base">02. A4 Brand PDF Engine</span>
                  </div>
                  {activePipelineStep === 1 && <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping shrink-0" />}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-0 sm:pl-11">
                  Auto-fits personalized letters onto corporate A4 letterhead graphics with precision coordinate layout & font scaling.
                </p>
              </button>

              {/* Step 3 Selector */}
              <button
                onClick={() => setActivePipelineStep(2)}
                onMouseEnter={() => setActivePipelineStep(2)}
                className={`text-left p-4 sm:p-6 rounded-2xl transition-all duration-300 border ${
                  activePipelineStep === 2
                    ? "bg-white border-emerald-500 shadow-xl shadow-emerald-500/10 scale-[1.01] sm:scale-[1.02]"
                    : "bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activePipelineStep === 2 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm sm:text-base">03. Risk Audit & Dispatch</span>
                  </div>
                  {activePipelineStep === 2 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-0 sm:pl-11">
                  Scans confidence metrics, locks high-risk drafts behind verification gates, and dispatches attachments at microsecond speed.
                </p>
              </button>
            </div>

            {/* Right Column: Dynamic Live Preview Display Terminal Stage */}
            <div className="lg:col-span-7">
              <div className="bg-[#0A0D18] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-2xl relative min-h-[320px] sm:min-h-[380px] flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />

                {/* Stage Header bar */}
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/80 mb-4 sm:mb-6 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] sm:text-xs text-slate-400 font-mono ml-2 tracking-wider uppercase">
                      AURA PIPELINE // STAGE 0{activePipelineStep + 1}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[9px] sm:text-[10px] font-mono font-semibold">
                    LIVE SIMULATION ACTIVE
                  </span>
                </div>

                {/* Stage Dynamic Content Render */}
                <AnimatePresence mode="wait">
                  {activePipelineStep === 0 && (
                    <motion.div
                      key="step-0"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-3 sm:gap-4"
                    >
                      <div className="flex items-center justify-between bg-slate-900/80 p-3 sm:p-4 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                            SJ
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-white truncate">Sarah Johnson</div>
                            <div className="text-[10px] sm:text-xs text-slate-400 truncate">sarah@techlead.io • Frontend Cohort</div>
                          </div>
                        </div>
                        <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono shrink-0">
                          Synced
                        </span>
                      </div>

                      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] sm:text-xs text-slate-300 font-mono space-y-1.5 sm:space-y-2">
                        <div className="text-indigo-400 font-semibold">// CONTACT_MEMORY_INDEX</div>
                        <div>• OAuth Token: Active (Google OAuth 2.0)</div>
                        <div>• Total Contact Rosters: 1,280 Grouped Contacts</div>
                        <div>• Preferred Channel: Email & Official PDF Selection Letter</div>
                      </div>
                    </motion.div>
                  )}

                  {activePipelineStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center gap-3 p-2"
                    >
                      <div className="relative bg-white shadow-2xl rounded p-3 text-zinc-900 text-[8px] w-64 border border-zinc-300 font-sans">
                        <div className="border-b border-indigo-100 pb-1 mb-2 font-mono font-bold text-[7px] text-indigo-900">
                          OFFICIAL A4 LETTERHEAD GRAPHIC
                        </div>
                        <div className="border border-dashed border-indigo-500 bg-indigo-50/50 p-2 rounded text-[7px] leading-tight">
                          <strong>Dear Sarah Johnson,</strong><br />
                          We are pleased to inform you that you have been selected for Cohort 1.0...
                        </div>
                      </div>
                      <div className="text-[10px] text-purple-400 font-mono bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                        Auto-Fit: 11pt Font • Line Height: 1.4 • X: 70pt | Y: 180pt
                      </div>
                    </motion.div>
                  )}

                  {activePipelineStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] sm:text-xs font-mono text-slate-400 block uppercase">Compliance & Security Score</span>
                          <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">99.8% VERIFIED</span>
                        </div>
                        <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 animate-pulse shrink-0" />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-[11px] sm:text-xs font-mono">
                        <div className="p-2.5 sm:p-3 bg-slate-900/40 rounded-lg border border-slate-800 text-slate-300">
                          <span className="text-slate-500 block text-[9px] sm:text-[10px]">ENCRYPTION</span> AES-256 GCM
                        </div>
                        <div className="p-2.5 sm:p-3 bg-slate-900/40 rounded-lg border border-slate-800 text-slate-300">
                          <span className="text-slate-500 block text-[9px] sm:text-[10px]">QUEUE SPEED</span> Microsecond Dispatch
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Stage Footer Status */}
                <div className="pt-3 sm:pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 mt-4 sm:mt-6">
                  <span>STAGE STATUS: <strong className="text-emerald-400">READY</strong></span>
                  <span>LATENCY: <strong className="text-indigo-400">&lt; 12ms</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (Bento panels) */}
      <section id="features" className="features-section">
        <div className="features-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <span className="section-tagline block text-center">Modular Architecture</span>
            <h3 className="section-title text-center">Engineered for absolute control</h3>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="bento-grid"
          >
            {/* Box 1 (8 columns) */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.01, borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
              className="bento-card bento-span-8"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full filter blur-3xl pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity" />
              <div>
                <Cpu className="w-8 h-8 text-indigo-400 mb-6" />
                <h4 className="bento-title">Context-Aware AI Drafting</h4>
                <p className="bento-desc max-w-xl">
                  Aura doesn't just reply; it reads. It queries search history, indexes documents, matches styles, and proposes replies that read like a human assistant draft.
                </p>
              </div>
              <div className="bento-footer">
                <span>// CUSTOM_INSTRUCTIONS</span>
                <span>// STYLES_MATCHING</span>
              </div>
            </motion.div>

            {/* Box 2 (4 columns) */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.01, borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
              className="bento-card bento-span-4"
            >
              <div>
                <ShieldCheck className="w-8 h-8 text-indigo-400 mb-6" />
                <h4 className="bento-title">Approval Gate</h4>
                <p className="bento-desc">
                  A strict risk engine validates confidence metrics. Low confidence drafts are marked for manual validation, locking outgoing drafts behind verification cards.
                </p>
              </div>
              <span className="bento-footer">// TRUST_FIRST_RULES</span>
            </motion.div>

            {/* Box 3 (4 columns) */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.01, borderColor: "rgba(168,85,247,0.25)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
              className="bento-card bento-span-4"
            >
              <div>
                <Users className="w-8 h-8 text-purple-400 mb-6" />
                <h4 className="bento-title">Relationship Memory</h4>
                <p className="bento-desc">
                  Automatically extracts contact profiles, company mappings, communication frequencies, and custom preferences based on historic exchanges.
                </p>
              </div>
              <span className="bento-footer">// CONTACT_INTELLIGENCE</span>
            </motion.div>

            {/* Box 4 (8 columns) */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.01, borderColor: "rgba(168,85,247,0.25)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
              className="bento-card bento-span-8"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full filter blur-3xl pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity" />
              <div>
                <Layers className="w-8 h-8 text-purple-400 mb-6" />
                <h4 className="bento-title">Enterprise Integrations</h4>
                <p className="bento-desc max-w-xl">
                  Aura acts as an orchestration node for your digital environment. Synchronize schedules with Google Calendar, coordinate team notifications on Slack, and save notes to Notion.
                </p>
              </div>
              <div className="bento-footer">
                <span>// GOOGLE_CALENDAR</span>
                <span>// SLACK</span>
                <span>// NOTION_WORKSPACE</span>
              </div>
            </motion.div>

            {/* Featured Box 5 (12 columns) - Official A4 Letterhead & Dynamic PDF Engine */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.005, borderColor: "rgba(99,102,241,0.4)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
              className="bento-card bento-span-12 relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-black/80 to-purple-950/40 border border-indigo-500/30"
            >
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4 font-mono">
                    <Sparkles className="w-3.5 h-3.5" /> NEW: ENTERPRISE BRAND ENGINE
                  </div>
                  <h4 className="bento-title text-2xl lg:text-3xl text-white mb-3">Official A4 Letterhead & PDF Engine</h4>
                  <p className="bento-desc max-w-xl text-slate-300 text-sm leading-relaxed mb-6">
                    Preserve corporate brand identity effortlessly. Upload official company A4 letterhead graphics (JPEG, PNG, WebP) containing headers, watermarks, and footers. Aura dynamically auto-fits personalized document text inside your brand's exact usable coordinates with real-time visual canvas editing.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-6">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Full-Bleed A4 Background
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" /> ⚡ Auto-Fit Typography
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-purple-400" /> Live Interactive Canvas
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Microsecond Bulk Dispatch
                    </div>
                  </div>

                  <div className="bento-footer">
                    <span>// FULL_BLEED_A4</span>
                    <span>// BOUNDING_BOX_TYPOGRAPHY</span>
                    <span>// BRAND_PRESERVATION</span>
                  </div>
                </div>

                {/* Right Side: Scaled Mini A4 Visual Mockup */}
                <div className="lg:col-span-5 flex justify-center">
                  <div className="relative bg-zinc-950 p-4 rounded-xl border border-indigo-500/40 shadow-2xl overflow-hidden group/canvas">
                    <div
                      className="relative bg-white shadow-xl rounded border border-zinc-300 transition-transform duration-500 group-hover/canvas:scale-[1.02]"
                      style={{ width: "240px", height: "339px" }}
                    >
                      {/* Fake Top Header Banner */}
                      <div className="p-3 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/50">
                        <span className="font-bold text-[9px] text-indigo-950 tracking-wider font-mono">ACME CORP // OFFICIAL LETTERHEAD</span>
                        <span className="text-[7px] text-indigo-500 uppercase font-semibold font-mono">A4 Canvas</span>
                      </div>

                      {/* Bounding Box Overlay */}
                      <div
                        className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 rounded p-1.5 transition-all"
                        style={{ top: "18%", left: "12%", width: "76%", height: "65%" }}
                      >
                        <div className="text-[7px] leading-tight text-zinc-900 font-sans whitespace-pre-wrap">
                          <strong className="text-indigo-900 block mb-1">Dear Sarah Johnson,</strong>
                          We are pleased to inform you that you have been selected for Cohort 1.0 of the Leadership Tech Bootcamp.

                          Your selection marks the beginning of an exciting journey designed to strengthen your skills and build real-world experience.

                          Warm regards,
                          AURA Executive Assistant
                        </div>
                      </div>

                      {/* Fake Footer */}
                      <div className="absolute bottom-2 inset-x-0 text-[6px] text-zinc-400 text-center font-mono border-t border-zinc-200 pt-1 mx-3">
                        Confidential & Proprietary • ACME Corp 2026
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section id="security" className="security-section">
        <div className="security-grid">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="security-info"
          >
            <span className="section-tagline">Security & Privacy</span>
            <h3 className="section-title">Designed to protect your information</h3>
            <p className="section-description mt-4">
              Aura connects directly via certified Google OAuth. Your emails are never stored permanently on our servers, and your data is never used to train global public AI models. All pipeline flows run inside sandboxed environments with strict data isolation.
            </p>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="security-list"
            >
              <motion.div variants={fadeInUp} className="security-item">
                <div className="security-icon-wrapper">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="security-item-title">ISO 27001 Compliant Sandboxes</h5>
                  <p className="security-item-desc">All data fetching is fully partitioned and encrypted in transit and at rest.</p>
                </div>
              </motion.div>
              <motion.div variants={fadeInUp} className="security-item">
                <div className="security-icon-wrapper">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="security-item-title">Zero-Retention Indexing</h5>
                  <p className="security-item-desc">Only context vector tokens are retained for memory lookup; email content is cached temporarily.</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Graphical Display of security nodes */}
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            whileHover={{ scale: 1.01, borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
            className="security-panel"
          >
            <span className="security-panel-title">Compliance & Trust Audit</span>

            <div className="security-panel-rows">
              <div className="security-panel-row">
                <span className="security-row-label">Data Encryption Protocol</span>
                <span className="security-row-value text-indigo-400 font-mono">AES-256 GCM</span>
              </div>
              <div className="security-panel-row">
                <span className="security-row-label">API Connection Authorization</span>
                <span className="security-row-value text-indigo-400 font-mono">OAuth 2.0 (Google Secure Auth)</span>
              </div>
              <div className="security-panel-row">
                <span className="security-row-label">LLM Security Boundary</span>
                <span className="security-row-value text-indigo-400 font-mono">Zero Data Training Agreement</span>
              </div>
              <div className="security-panel-row">
                <span className="security-row-label">Safety Guardrails Override</span>
                <span className="security-row-value text-indigo-400 font-mono">Manual Approval Only</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 text-center font-mono uppercase tracking-wider">
              System Status: Secure and Active
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="cta-section">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          whileHover={{ scale: 1.01, borderColor: "rgba(255,255,255,0.15)", boxShadow: "0 20px 50px rgba(99,102,241,0.15)" }}
          className="cta-box"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50 blur-xl pointer-events-none" />

          <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-6">
            Ready to supercharge your email workflows?
          </h3>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-10 font-light">
            Bring Aura into your workday and reclaim hours of routine administration.
          </p>

          <Link
            href="/dashboard"
            onClick={handleWorkspaceAccess}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold bg-white hover:bg-slate-100 text-black shadow-lg shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Launch Assistant Workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-container">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-300 font-sans tracking-tight">Aura Assistant</span>
          </div>
          <p className="font-light text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} Aura Inc. Crafted for premium performance. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
