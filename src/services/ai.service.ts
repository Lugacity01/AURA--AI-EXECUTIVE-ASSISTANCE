export interface RiskAssessment {
  risk: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  explainer: string[];
}

export interface GeneratedDrafts {
  draft: string;
  brief: string;
  formal: string;
  polite: string;
  confidence: number;
}

export class AIService {
  /**
   * Identifies email conversation intent based on keywords.
   */
  static classifyIntent(body: string): string {
    const text = body.toLowerCase();
    if (text.includes("pricing") || text.includes("deck") || text.includes("slide") || text.includes("calendar") || text.includes("meet")) {
      return "Schedule Sync";
    }
    if (text.includes("contract") || text.includes("agreement") || text.includes("liability") || text.includes("msa")) {
      return "Contract Audit";
    }
    if (text.includes("pr ") || text.includes("merged") || text.includes("dependabot") || text.includes("deploy")) {
      return "System Notice";
    }
    return "General Inquiry";
  }

  /**
   * Assesses risk based on attachments, domain trust, and sensitive indicators.
   */
  static assessRisk(body: string, fromEmail: string, subject: string): RiskAssessment {
    const text = (body + " " + subject).toLowerCase();
    
    // Microsoft Pricing/MSA check
    if (fromEmail.includes("microsoft") || text.includes("msa") || text.includes("billing cycle")) {
      return {
        risk: "HIGH",
        reason: "Contract attachment detected and financial pricing commitments found.",
        explainer: [
          "External recipient detected",
          "Legal contract keywords found",
          "Financial pricing commitments found"
        ]
      };
    }

    // High risk contract/legal audit check
    if (text.includes("contract") || text.includes("liability") || text.includes("pricing update")) {
      return {
        risk: "HIGH",
        reason: "Contains contract liabilities & pricing adjustment requests.",
        explainer: [
          "API partnership bindings",
          "Section 4 legal review requested",
          "Contract negotiation thread"
        ]
      };
    }

    // Default low risk
    return {
      risk: "LOW",
      reason: "Typical internal schedule alignment or trusted communication.",
      explainer: [
        "Trusted client contact",
        "Calendar scheduling intent",
        "No financial liabilities found"
      ]
    };
  }

  /**
   * Generates mock draft variations for email replies.
   */
  static generateDrafts(body: string, senderName: string): GeneratedDrafts {
    const text = body.toLowerCase();
    
    if (text.includes("strategy") || text.includes("slide")) {
      return {
        draft: `Hi ${senderName}, thanks for the note. I've reviewed the strategy slides as well and agree we should align. I'm available today at 2:00 PM or 4:30 PM PST. I'll send over a calendar invite once you confirm what works best.`,
        brief: `Hi ${senderName}, I can align on pricing today. Available at 2:00 PM or 4:30 PM PST. Let me know which works.`,
        formal: `Dear ${senderName}, thank you for your message. I have reviewed the Q3 strategy slides and agree that aligning on pricing is essential. I am available for a brief discussion today at either 2:00 PM or 4:30 PM PST. Please let me know which time fits your schedule, and I will dispatch a meeting invitation.`,
        polite: `Hi ${senderName}, thanks so much for looking over the Q3 slides. I would love to align on the pricing details today. I am free at 2:00 PM or 4:30 PM PST. Looking forward to speaking soon!`,
        confidence: 96
      };
    }

    if (text.includes("partner sync") || text.includes("tuesday")) {
      return {
        draft: `Hi ${senderName}, thanks for reaching out. Yes, Tuesday at 10:00 AM PST works perfectly. I will send over a Calendar invite with the meeting details.`,
        brief: `Hi ${senderName}, Tuesday at 10 AM PST works. Calendar invite on its way.`,
        formal: `Dear ${senderName}, thank you for your query. I can confirm that Tuesday morning at 10:00 AM PST is suitable for our team. I will send a calendar invitation with Google Meet links shortly.`,
        polite: `Hi ${senderName}, thanks for checking in! Tuesday morning at 10:00 AM PST works great for our team. Looking forward to syncing up on the budget.`,
        confidence: 92
      };
    }

    if (text.includes("msa") || text.includes("billing")) {
      return {
        draft: `Dear ${senderName}, thank you. We confirm the signed MSA details and will align next year's billing cycles to Net-30 as requested. The invoice templates have been attached.`,
        brief: `Hello, net-30 billing cycle is active for next year billing sheets. Signed MSA confirmed.`,
        formal: `Dear ${senderName}, thank you for confirming the agreements. We have logged the signed MSA and set terms to Net-30.`,
        polite: `Hi ${senderName}, thanks for the update! We are happy to set billing cycles to Net-30 and proceed under the MSA terms.`,
        confidence: 96
      };
    }

    // Default reply
    return {
      draft: `Hi ${senderName}, thank you. I will review your message and coordinate with our team. We'll get back to you with comments soon.`,
      brief: `Hi ${senderName}, reviewing details now. Feedback soon.`,
      formal: `Dear ${senderName}, thank you for your email. I will inspect the details and coordinate response comments with our department.`,
      polite: `Hi ${senderName}, thank you for sharing this! I will check the details with our team and get back to you as soon as possible.`,
      confidence: 80
    };
  }
}
