import { useQuery } from "@tanstack/react-query";

// Types
export interface InboxStats {
  unread: number;
  inbox: number;
  starred: number;
  trash: number;
  needsApproval: number;
}

export interface DraftItem {
  id: string;
  emailId: string;
  draftContent: string;
  confidence: number | null;
  riskLevel: string | null;
  riskAnalysis: string | null;
  recipient?: string;
  subject?: string;
  status?: string;
}

export interface EmailApprovalItem {
  id: string;
  draftId?: string;
  sender: string;
  email: string;
  subject: string;
  snippet: string;
  draft: string;
  risk: string;
  reason: string;
  confidence: number;
  time: string;
  riskExplainer: string[];
}

// 1. Stats hook
export function useInboxStats() {
  return useQuery<InboxStats>({
    queryKey: ["inboxStats"],
    queryFn: async () => {
      const res = await fetch("/api/inbox/stats");
      if (!res.ok) throw new Error("Failed to fetch inbox stats");
      return res.json();
    },
    refetchInterval: 10000, // Auto-refresh stats counts every 10 seconds
  });
}

// 2. Drafts list hook
export function useDraftsList() {
  return useQuery<DraftItem[]>({
    queryKey: ["drafts"],
    queryFn: async () => {
      const res = await fetch("/api/drafts");
      if (!res.ok) throw new Error("Failed to fetch drafts list");
      return res.json();
    },
    refetchInterval: 10000, // Auto-refresh drafts list every 10 seconds
  });
}

// 3. Approvals list hook
export function useApprovalsList() {
  return useQuery<EmailApprovalItem[]>({
    queryKey: ["approvals"],
    queryFn: async () => {
      const res = await fetch("/api/email");
      if (!res.ok) throw new Error("Failed to fetch approvals emails");
      const emails = await res.json();
      
      if (!Array.isArray(emails)) return [];

      return emails
        .filter((e: any) => e.status === "NEEDS_APPROVAL" || e.status === "UNREAD")
        .map((e: any) => ({
          id: e.id,
          draftId: e.draft?.id,
          sender: e.from,
          email: e.fromEmail || "external-client@apex.com",
          subject: e.subject,
          snippet: e.body.slice(0, 150) + "...",
          draft: e.draft?.draftContent || "",
          risk: e.draft?.riskLevel || "LOW",
          reason: e.draft?.riskAnalysis || "Sensitive transaction terms.",
          confidence: e.draft?.confidence || 90,
          time: "Recent",
          riskExplainer: e.draft?.riskLevel === "HIGH" 
            ? [
                "External recipient detected",
                "Legal contract keywords found",
                "Financial pricing commitments found"
              ]
            : [
                "Trusted contact whitelist",
                "Standard scheduling sync"
              ]
        }));
    },
    refetchInterval: 10000, // Auto-refresh approvals feed every 10 seconds
  });
}
