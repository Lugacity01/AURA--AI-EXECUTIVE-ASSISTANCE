

export interface ContactPlaceholderData {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  department?: string | null;
}


export function replaceContactPlaceholders(text: string | null | undefined, contact?: ContactPlaceholderData | null): string {
  if (!text) return "";

  const name = contact?.name || "there";
  const company = contact?.company || contact?.jobTitle || "your organization";
  const jobTitle = contact?.jobTitle || contact?.company || "Member";
  const department = contact?.department || "Operations";
  const email = contact?.email || "";

  return text
    // Replace Name placeholders
    .replace(/\[Name\]|\[Student's Name\]|\[Student Name\]|\[Recipient Name\]|\[First Name\]/gi, name)
    // Replace Company & Track & Organization placeholders
    .replace(/\[Company\]|\[Track\]|\[Company Name\]|\[Organization\]/gi, company)
    // Replace Job Title & Role & Position placeholders
    .replace(/\[Job Title\]|\[Title\]|\[Role\]|\[Position\]/gi, jobTitle)
    // Replace Department placeholders
    .replace(/\[Department\]|\[Team\]/gi, department)
    // Replace Email placeholders
    .replace(/\[Email\]|\[Email Address\]/gi, email);
}

/**
 * Cleans text for Browser UI rendering.
 * Strips Private Use Area (PUA) character ranges (\uE000-\uF8FF, \uF0000-\uFFFFF)
 * that cause browsers to render text as random dingbat/symbol icons (Apple logo, wrenches, gift boxes, etc.).
 */
export function cleanBrowserText(text: string | null | undefined): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Unescape literal raw Unicode escape strings returned by LLMs/APIs (e.g., "\\uF8FF" or "\\u2019")
  cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return _;
    }
  });

  // 2. Unescape literal escaped newlines ("\\n" -> "\n")
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\\r/g, "");

  // 3. Decode common HTML entities
  const htmlEntityMap: Record<string, string> = {
    "&quot;": '"',
    "&amp;": "&",
    "&#39;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
    "&rsquo;": "'",
    "&lsquo;": "'",
    "&rdquo;": '"',
    "&ldquo;": '"',
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "...",
  };

  cleaned = cleaned.replace(/&(quot|amp|#39|apos|lt|gt|nbsp|rsquo|lsquo|rdquo|ldquo|mdash|ndash|hellip);/gi, (match) => htmlEntityMap[match.toLowerCase()] || match);
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

  // 4. STRIP PRIVATE USE AREA (PUA) CHARACTERS: \uE000-\uF8FF (Apple Logo, Wingdings, Dingbats, Icon Font Offsets)
  cleaned = cleaned.replace(/[\uE000-\uF8FF\uDB80-\uDBFF\uDC00-\uDFFF]/g, "");

  // 5. Unicode NFKC Normalization
  cleaned = cleaned.normalize("NFKC");

  // 6. Remove Zero-Width Spaces & Unprintable Control Glyphs
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u00AD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  return cleaned;
}

/**
 * Cleans text for PDF Document Rendering (converts non-WinAnsi characters to standard ASCII).
 */
export function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return "";

  const browserClean = cleanBrowserText(text);

  return (
    browserClean
      // Smart Double Quotes -> Standard ASCII Double Quote
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      // Smart Single Quotes & Apostrophes -> Standard ASCII Single Quote
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035\u02BC]/g, "'")
      // Em-dash, En-dash -> Standard Hyphen
      .replace(/[\u2013\u2014\u2212\u2010\u2011]/g, "-")
      // Ellipsis -> 3 Dots
      .replace(/\u2026/g, "...")
      // Non-breaking spaces -> Standard Space
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      // Bullet Points -> Standard Bullet
      .replace(/[\u2022\u2023\u2043\u204C\u204D\u2219]/g, "• ")
      // Currency Symbols conversion for Standard PDF Fonts
      .replace(/\u20AC/g, "EUR ")
      .replace(/\u00A3/g, "GBP ")
      .replace(/\u00A5/g, "JPY ")
  );
}

/**
 * Normalizes title strings for headers and clean rendering.
 */
export function sanitizePdfTitle(title: string | null | undefined): string {
  return cleanBrowserText(title).replace(/[\r\n]+/g, " ").trim();
}
