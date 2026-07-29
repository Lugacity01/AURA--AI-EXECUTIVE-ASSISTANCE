import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-client";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030307",
};

export const metadata: Metadata = {
  title: "Aura | Premium AI Executive Assistant",
  description: "Aura is a calm, intelligent workspace that helps modern teams, founders, and professionals organize communication, automate repetitive workflows, and delegate tasks safely with built-in risk checks.",
  keywords: ["AI Assistant", "Executive Assistant", "Inbox Zero", "AI Email", "Smart Automation", "Aura AI"],
  authors: [{ name: "Aura AI Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased bg-[#030307] text-slate-100 overflow-x-hidden min-h-screen">
        {/* Background Grids & Orbs */}
        <div className="bg-grid absolute inset-0 z-0 pointer-events-none" />
        <div className="glowing-orb orb-purple opacity-30" />
        <div className="glowing-orb orb-blue opacity-25" />
        <div className="glowing-orb orb-pink opacity-20" />

        <div className="relative z-10">
          <QueryProvider>
            {children}
          </QueryProvider>
        </div>
      </body>
    </html>
  );
}
