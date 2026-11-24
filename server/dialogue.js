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
    const response = await fetcher(
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
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
      console.warn(`[LLM] provider_http_${response.status}`);
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
