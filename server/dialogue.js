import { companionName } from "../shared/dialogue.js";
import { fetch as networkFetch, EnvHttpProxyAgent } from "undici";
const dispatcher = new EnvHttpProxyAgent();
const providerFetch = (url, options) =>
  networkFetch(url, { ...options, dispatcher });
import {
  fallback,
  validateReply,
  urgent,
  intents,
  actions,
} from "../shared/dialogue.js";
export { fallback, validateReply, urgent } from "../shared/dialogue.js";
const errorBodyLimit = 8_192;

async function readProviderError(response) {
  const reader = response.body?.getReader();
  if (!reader) return {};
  const decoder = new TextDecoder();
  let text = "", bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > errorBodyLimit) return {};
      text += decoder.decode(value, { stream: true });
    }
    const error = JSON.parse(text + decoder.decode())?.error;
    return error && typeof error === "object" ? error : {};
  } catch {
    return {};
  } finally {
    void reader.cancel().catch(() => {});
  }
}

function providerDiagnostic(requestUrl, model, error, sensitiveValues) {
  const url = new URL(requestUrl);
  const secrets = [...new Set([
    ...sensitiveValues, url.username, url.password,
    ...url.searchParams.values(), url.hash.slice(1),
  ].flatMap((value) => {
    if (typeof value !== "string" || !value.trim()) return [];
    const trimmed = value.trim();
    return [value, trimmed, encodeURIComponent(trimmed.toWellFormed()), JSON.stringify(trimmed).slice(1, -1)];
  }))].sort((a, b) => b.length - a.length);
  const clean = (value, limit) => {
    if (typeof value !== "string") return undefined;
    let safe = value;
    const marker = "\u0000";
    for (const secret of secrets) safe = safe.replaceAll(secret, marker);
    return safe
      .replace(/https?:\/\/[^\s<>"']+/gi, (text) => {
        try { return new URL(text).origin; } catch { return marker; }
      })
      .replace(/\b(?:Bearer|Basic)[ \t]+[^\s,;"']+/gi, marker)
      .replace(/\b(?:gsk_|sk-|AIza|ghp_|gho_|github_pat_|xox[baprs]-)[\w-]+/gi, marker)
      .replace(/\b(?:api[-_ ]?key|authorization|access[-_ ]?token|password|secret)\s*["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, marker)
      .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, marker)
      .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, marker)
      .replaceAll(marker, "[redacted]")
      .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
      .slice(0, limit);
  };
  return {
    code: Number.isFinite(error.code) ? error.code : clean(error.code, 80),
    type: clean(error.type, 80),
    message: clean(error.message, 320),
    // Only the origin and redacted path are useful for diagnosing a route.
    url: clean(url.origin, 160) + clean(url.pathname, 240),
    model: clean(model, 120),
  };
}

/**
 * @param {{message: string, phase: string, hour: number, history?: {role: string, content: string}[], companionId?: string}} context
 */
export async function getReply(
  { message, phase, hour, history = [], companionId = "nebula" },
  {
    fetcher = providerFetch,
    apiKey = process.env.LLM_API_KEY,
    baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1",
    model = process.env.LLM_MODEL || "gpt-4o-mini",
    timeout = 8000,
  } = {},
) {
  const backup = fallback(message, phase, hour);
  if (urgent(message)) return { ...backup, provider: "safety" };
  if (!apiKey) return { ...backup, provider: "mock" };
  try {
    const endpoint = new URL(baseUrl);
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/chat/completions`;
    const response = await fetcher(
      endpoint.href,
      {
        method: "POST",
        signal: AbortSignal.timeout(timeout),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.6,
          max_tokens: 250,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `你是同頻星球的${companionName(companionId)}，非真人。用溫柔繁體中文簡短回應，不診斷心理狀態，不索取個資。當前狀態 ${phase}，本地時間 ${hour} 點。專注中最多一句，不延伸提問。不能操作計時器或系統。只輸出 JSON：reply_text(240字以內), user_intent(${intents.join("|")}), emotion(neutral|caring|happy|calm), suggested_action(${actions.join("|")})。`,
            },
            ...history.slice(-6),
            { role: "user", content: message },
          ],
        }),
      },
    );
    if (!response.ok) {
      const error = await readProviderError(response);
      const diagnostic = providerDiagnostic(endpoint, model, error, [
        apiKey, message, ...history.map((entry) => entry.content),
      ]);
      console.warn(`[LLM] provider_http_${response.status} ${JSON.stringify({
        status: response.status,
        ...diagnostic,
      })}`);
      return { ...backup, provider: "fallback" };
    }
    const data = await response.json();
    const result = validateReply(
      JSON.parse(data.choices?.[0]?.message?.content),
    );
    if (phase === "focus") {
      result.suggested_action = "listen";
      result.reply_text = result.reply_text.split(/(?<=[。！？])/)[0];
    }
    console.info("[LLM] reply_ok");
    return { ...result, provider: "llm" };
  } catch (error) {
    const reason = error?.name === "TimeoutError" || error?.name === "AbortError"
      ? "timeout" : error instanceof SyntaxError ? "invalid_json" : "request_or_response_failed";
    console.warn(`[LLM] ${reason}`);
    return { ...backup, provider: "fallback" };
  }
}
