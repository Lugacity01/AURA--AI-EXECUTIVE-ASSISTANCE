"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Sparkles,
  ShieldCheck,
  Users,
  Settings,
  LayoutDashboard,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  MessageSquare,
  Clock,
  CornerDownLeft
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [showSessionExpired, setShowSessionExpired] = useState(false);

  const { data: stats = { unread: 0, inbox: 0, starred: 0, trash: 0, needsApproval: 0 } } = useQuery<{ unread: number; inbox: number; starred: number; trash: number; needsApproval: number }>({
    queryKey: ["inboxStats"],
    queryFn: async () => {
      const res = await fetch("/api/inbox/stats");
      if (res.status === 401) {
        setShowSessionExpired(true);
        throw new Error("Session expired");
      }
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    enabled: !!session && !showSessionExpired,
    retry: false
  });

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdSearch, setCmdSearch] = useState("");
  const [cmdSelectedIndex, setCmdSelectedIndex] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  React.useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCmdPalette(prev => !prev);
        setCmdSearch("");
        setCmdSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#030307] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "US";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, badge: stats.inbox > 0 ? String(stats.inbox) : undefined },
    { name: "AI Chat", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Drafts", href: "/dashboard/drafts", icon: Sparkles },
    { name: "Approvals", href: "/dashboard/approvals", icon: ShieldCheck, badge: stats.needsApproval > 0 ? String(stats.needsApproval) : undefined },
    { name: "Contacts", href: "/dashboard/memory", icon: Users },
    { name: "Activity", href: "/dashboard/activity", icon: Clock },
    { name: "Settings", href: "/dashboard/integrations", icon: Settings },
  ];

  const paletteItems = [
    { category: "Navigation", label: "Go to Dashboard Overview", type: "page", value: "/dashboard" },
    { category: "Navigation", label: "Go to Inbox Queue", type: "page", value: "/dashboard/inbox" },
    { category: "Navigation", label: "Go to AI Chat Console", type: "page", value: "/dashboard/chat" },
    { category: "Navigation", label: "Go to Drafts Hub", type: "page", value: "/dashboard/drafts" },
    { category: "Navigation", label: "Go to Approvals Center", type: "page", value: "/dashboard/approvals" },
    { category: "Navigation", label: "Go to Contacts Memory", type: "page", value: "/dashboard/memory" },
    { category: "Navigation", label: "Go to Activity Center", type: "page", value: "/dashboard/activity" },
    { category: "Navigation", label: "Go to System Settings", type: "page", value: "/dashboard/integrations" },
    { category: "AI Commands", label: "/summarize - Summarize unread inbox emails", type: "action", value: "summarize" },
    { category: "AI Commands", label: "/escalate - Escalate high-risk priorities", type: "action", value: "escalate" },
    { category: "AI Commands", label: "/archive - Batch archive newsletter threads", type: "action", value: "archive" },
  ].filter(item => 
    item.label.toLowerCase().includes(cmdSearch.toLowerCase()) || 
    item.category.toLowerCase().includes(cmdSearch.toLowerCase())
  );

  const handlePaletteAction = (item: typeof paletteItems[0]) => {
    setShowCmdPalette(false);
    if (item.type === "page") {
      router.push(item.value);
    } else {
      alert(`Executed command action: ${item.label}`);
    }
  };

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCmdSelectedIndex(prev => (prev + 1) % paletteItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCmdSelectedIndex(prev => (prev - 1 + paletteItems.length) % paletteItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (paletteItems[cmdSelectedIndex]) {
        handlePaletteAction(paletteItems[cmdSelectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowCmdPalette(false);
    }
  };

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#030307] text-slate-100 flex relative overflow-hidden">

      {/* Background elements */}
      <div className="bg-grid absolute inset-0 z-0 pointer-events-none" />
      <div className="glowing-orb orb-purple opacity-20" />
      <div className="glowing-orb orb-blue opacity-15" />

      {/* Sidebar - Desktop */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col border-r border-white/[0.06] bg-black/35 backdrop-blur-xl relative z-20 shrink-0 h-screen select-none justify-between"
      >
        <div>
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.04]">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold tracking-tight text-white"
                >
                  Aura
                </motion.span>
              )}
            </Link>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md hover:bg-white/[0.04] text-slate-400 hover:text-white"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

        {/* Quick Search trigger button */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <button 
            onClick={() => { setShowCmdPalette(true); setCmdSearch(""); }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 transition-all text-[11px] font-medium tracking-wide group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              {!collapsed && <span>Search Aura...</span>}
            </div>
            {!collapsed && (
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] font-mono text-slate-500 group-hover:text-indigo-400">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1.5">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className="group">
                  <div className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${active
                    ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 shadow-inner"
                    : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm font-medium tracking-wide truncate"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </div>
                    {!collapsed && item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-white/[0.04] flex flex-col gap-2 relative">
          
          {/* Popup Dropdown Profile Menu */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`absolute z-30 bg-[#0c0c14] border border-white/[0.06] rounded-xl p-3.5 shadow-2xl flex flex-col gap-3 ${
                  collapsed ? "bottom-4 left-20 w-48" : "bottom-20 left-4 right-4"
                }`}
              >
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-xs font-semibold text-slate-200 truncate">{session?.user?.name || "User"}</span>
                  <span className="text-[10px] text-slate-500 truncate mt-0.5">{session?.user?.email || "user@email.com"}</span>
                </div>
                <div className="h-[1px] bg-white/[0.06]" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all text-xs font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Exit Workspace</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowProfileMenu(prev => !prev)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-all text-left w-full cursor-pointer"
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt={session.user.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-semibold text-indigo-300 shrink-0">
                {initials}
              </div>
            )}
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col min-w-0 text-left"
              >
                <span className="text-xs font-semibold text-slate-200 truncate">{session?.user?.name || "User"}</span>
                <span className="text-[10px] text-slate-500 truncate">{session?.user?.email || "user@email.com"}</span>
              </motion.div>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">

        {/* Top Navbar */}
        <header className="h-16 border-b border-white/[0.06] bg-black/20 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold tracking-wide text-slate-300 uppercase font-mono">
              Workspace Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync lights */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold tracking-wider uppercase font-mono select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Sync Active
            </div>

            <button className="p-2 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] text-slate-400 hover:text-white transition-all relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            </button>
          </div>
        </header>

        {/* Child Router Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-[#050510] relative">
          <div className="p-6 md:p-8 w-full mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer Navigation overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop click dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[280px] bg-[#070710] border-r border-white/[0.08] flex flex-col justify-between h-full z-10 p-6"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="font-bold text-white text-lg">Aura</span>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1 rounded-md hover:bg-white/[0.04] text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-1.5">
                  {navigation.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                      >
                        <div className={`flex items-center justify-between p-3 rounded-xl ${active
                          ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                          : "text-slate-400 hover:text-slate-200"
                          }`}>
                          <div className="flex items-center gap-3">
                            <item.icon className="w-5 h-5" />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-white/[0.06] pt-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt={session.user.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-semibold text-indigo-300">
                      {initials}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200">{session?.user?.name || "User"}</span>
                    <span className="text-[10px] text-slate-500">{session?.user?.email || "user@email.com"}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all text-left text-xs font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Exit Workspace
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Global Command Palette backdrop modal */}
      <AnimatePresence>
        {showCmdPalette && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowCmdPalette(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              className="w-full max-w-lg bg-[#070712] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[380px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Input box */}
              <div className="p-4 border-b border-white/[0.04] flex items-center gap-3 relative shrink-0">
                <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search files, commands, actions..."
                  value={cmdSearch}
                  onChange={(e) => { setCmdSearch(e.target.value); setCmdSelectedIndex(0); }}
                  onKeyDown={handlePaletteKeyDown}
                  className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:ring-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-500 uppercase">ESC to close</span>
                </div>
              </div>

              {/* Results list */}
              <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.01]">
                {paletteItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No matching actions found.
                  </div>
                ) : (
                  <div>
                    {/* Group items by category */}
                    {Array.from(new Set(paletteItems.map(i => i.category))).map(cat => (
                      <div key={cat} className="mb-2">
                        <span className="text-[9px] font-bold text-indigo-400 font-mono tracking-widest uppercase block px-3 py-1.5">{cat}</span>
                        {paletteItems.filter(i => i.category === cat).map(item => {
                          const index = paletteItems.indexOf(item);
                          const active = index === cmdSelectedIndex;
                          return (
                            <div
                              key={item.label}
                              onClick={() => handlePaletteAction(item)}
                              className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition-all duration-150 cursor-pointer text-left ${
                                active 
                                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 shadow-inner" 
                                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]"
                              }`}
                            >
                              <span className="font-medium">{item.label}</span>
                              {active && (
                                <span className="flex items-center gap-1 text-[9px] font-mono text-indigo-400 font-bold shrink-0">
                                  SELECT <CornerDownLeft className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Expired Modal */}
      <AnimatePresence>
        {showSessionExpired && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-6 text-center shadow-2xl flex flex-col gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-white tracking-wide font-display">Session Expired</h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  Your login session has expired due to inactivity. Please sign in again to resume workspace operations.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                Sign In Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
