/**
 * Global Font Character & Browser Text Sanitizer Engine
 * Curbs raw unicode escape sequences, HTML entities, unprintable glyph boxes,
 * and font character rendering artifacts across the entire browser codebase.
 */

/**
 * Cleans text specifically for Browser UI rendering (inputs, previews, textareas, cards).
 * Fixes literal unicode escapes (\u2019), HTML entities (&quot;, &rsquo;), zero-width characters,
 * and unprintable font glyph artifacts.
 */
export function cleanBrowserText(text: string | null | undefined): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Unescape literal raw Unicode escape strings returned by LLMs/APIs (e.g., "\\u2019" -> "’")
  cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return _;
    }
  });

  // 2. Unescape literal escaped newlines ("\\n" -> "\n")
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\\r/g, "");

  // 3. Decode common HTML entities that render as raw character text in React/DOM
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

  // 4. Unicode NFKC Normalization
  cleaned = cleaned.normalize("NFKC");

  // 5. Remove Zero-Width Spaces, Soft Hyphens & Unprintable Control Glyphs that trigger missing font box icons in browsers
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
