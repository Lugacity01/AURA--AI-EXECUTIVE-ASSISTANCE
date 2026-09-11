import OpenAI from "openai";

export function getAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const isOpenRouter =
    apiKey.startsWith("sk-or") ||
    Boolean(process.env.OPENAI_BASE_URL?.includes("openrouter")) ||
    Boolean(process.env.OPENAI_CHAT_MODEL?.includes("/"));

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
  const isOpenRouter =
    apiKey.startsWith("sk-or") ||
    Boolean(process.env.OPENAI_BASE_URL?.includes("openrouter")) ||
    Boolean(process.env.OPENAI_CHAT_MODEL?.includes("/"));

  // Clean, provider-safe model lists
  const defaultModel = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
  const primaryModel = options.model || process.env.OPENAI_CHAT_MODEL || defaultModel;

  const rawCandidates = isOpenRouter
    ? [primaryModel, "openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct", "openai/gpt-4o"]
    : [primaryModel, "gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];

  // Filter models: if NOT openrouter, remove any slashed model IDs (like google/...) that cause 404 on OpenAI
  const candidateModels = Array.from(
    new Set(
      rawCandidates.filter((m) => {
        if (!m) return false;
        if (!isOpenRouter && m.includes("/")) return false;
        return true;
      })
    )
  );

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

      // If error is 404 (model not found) or 429 (rate limit / quota), try next candidate
      if (
        err.status === 429 ||
        err.status === 404 ||
        /429|404|rate|quota|Provider returned error|too many requests|No endpoints found/i.test(
          err.message || ""
        )
      ) {
        continue;
      }

      // Break on other errors
      throw err;
    }
  }

  throw lastError || new Error("AI service temporary error. Please try again in a moment.");
}
