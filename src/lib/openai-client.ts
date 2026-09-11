import OpenAI from "openai";

export function getAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const isOpenRouter = apiKey.startsWith("sk-or");

  return new OpenAI({
    apiKey,
    baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
  });
}

export async function createAICompletion(options: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  response_format?: { type: "json_object" | "text" };
  model?: string;
}) {
  const openai = getAIClient();
  const apiKey = process.env.OPENAI_API_KEY || "";
  const isOpenRouter = apiKey.startsWith("sk-or");

  // Determine priority model stack
  const primaryModel =
    options.model ||
    process.env.OPENAI_CHAT_MODEL ||
    (isOpenRouter ? "google/gemini-2.0-flash-001" : "gpt-4o");

  const fallbackModels = isOpenRouter
    ? ["google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct", "gpt-4o-mini"]
    : ["gpt-4o-mini", "gpt-3.5-turbo"];

  const candidateModels = Array.from(new Set([primaryModel, ...fallbackModels]));

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      console.log(`[AI Client] Attempting completion with model: ${model}`);
      const params: any = {
        model,
        messages: options.messages,
      };

      if (options.response_format) {
        params.response_format = options.response_format;
      }

      const response = await openai.chat.completions.create(params);
      return response;
    } catch (err: any) {
      console.warn(`[AI Client Error with model ${model}]:`, err.message || err);
      lastError = err;

      // If it's a 429 or provider error, try next fallback model
      if (err.status === 429 || /429|rate|quota|Provider returned error|too many requests/i.test(err.message || "")) {
        continue;
      }

      // If error is not a 429, break and throw immediately
      throw err;
    }
  }

  throw lastError || new Error("429 Provider returned error: AI service quota or rate limit exceeded.");
}
