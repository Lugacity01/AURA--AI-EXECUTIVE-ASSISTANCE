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
  Database
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

                {/* Right Side: Video Player Pane */}
                <div className="lg:col-span-7 relative flex flex-col items-center justify-center bg-black/60 overflow-hidden min-h-[400px]">
                  {/* The Video Element */}
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                    src="/demo-simulation.mp4"
                  />
                  
                  {/* Placeholder overlay to show where the video will appear and instruct the user */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-center p-8 bg-[#030014]/40 backdrop-blur-sm rounded-xl border border-white/10 m-6">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                      <Play className="w-5 h-5 text-indigo-400 ml-0.5" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200 mb-2">Simulate AI Workflow</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Your video will play here seamlessly. Just drop your <b>demo-simulation.mp4</b> file into the <b>/public</b> folder.
                    </p>
                  </div>
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

      {/* Workflow Scrollytelling Section */}
      <section id="workflow" className="workflow-section">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="section-header"
        >
          <span className="section-tagline">Automated Pipelinining</span>
          <h3 className="section-title">How Aura Manages Your Inbox</h3>
          <p className="section-description">
            From fetch to final dispatch, see how Aura coordinates security scanners, context archives, and drafted templates.
          </p>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="workflow-grid"
        >
          <motion.div 
            variants={fadeInUp}
            whileHover={{ y: -6, scale: 1.01, borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 10px 30px -10px rgba(99,102,241,0.15)" }}
            className="workflow-card"
          >
            <div>
              <div className="workflow-icon bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Inbox className="w-5 h-5" />
              </div>
              <h4 className="workflow-title">1. Continuous Ingestion</h4>
              <p className="workflow-desc">
                Securely syncs with your Gmail accounts via OAuth. Detects incoming emails and flags them immediately for background analysis.
              </p>
            </div>
            <span className="workflow-module">Module: sync-agent</span>
          </motion.div>

          <motion.div 
            variants={fadeInUp}
            whileHover={{ y: -6, scale: 1.01, borderColor: "rgba(168,85,247,0.25)", boxShadow: "0 10px 30px -10px rgba(168,85,247,0.15)" }}
            className="workflow-card"
          >
            <div>
              <div className="workflow-icon bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="workflow-title">2. Context Synthesis</h4>
              <p className="workflow-desc">
                Cross-references past threads, CRM data, and preferences to build an understanding of the contact relationship. Generates dynamic responses based on custom rules.
              </p>
            </div>
            <span className="workflow-module">Module: rag-synthesis</span>
          </motion.div>

          <motion.div 
            variants={fadeInUp}
            whileHover={{ y: -6, scale: 1.01, borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 10px 30px -10px rgba(99,102,241,0.15)" }}
            className="workflow-card"
          >
            <div>
              <div className="workflow-icon bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="workflow-title">3. Risk Assessment</h4>
              <p className="workflow-desc">
                Analyzes drafts for security flags, commitment risks, or tone anomalies. High-risk items require explicit manual validation before hitting send.
              </p>
            </div>
            <span className="workflow-module">Module: compliance-safety</span>
          </motion.div>
        </motion.div>
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
