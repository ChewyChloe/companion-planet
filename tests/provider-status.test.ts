import { Response } from "undici";
import { it, expect, vi } from "vitest";
import { getReply } from "../server/dialogue.js";

it("logs bounded Groq diagnostics without exposing credentials or conversation", async () => {
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    const key = "private-test-key";
    const message = "private-user-message";
    const previous = "private-history-item";
    const baseUrl = "https://api.groq.com/openai/v1?token=private-query-value";
    const model = "llama-3.1-8b-instant";
    const result = await getReply({
      message, phase: "idle", hour: 12,
      history: [{ role: "assistant", content: previous }],
    }, {
      apiKey: key, baseUrl, model,
      fetcher: async (url: string) => {
        expect(url).toBe("https://api.groq.com/openai/v1/chat/completions?token=private-query-value");
        return new Response(JSON.stringify({
          error: {
            code: "model_not_found",
            type: "invalid_request_error",
            message: `Model unavailable. Authorization: Bearer ${key}; ${message}; ${previous}; private-query-value; gsk_some-other-key\n${"x".repeat(400)}`,
          },
          raw: "private-provider-body",
        }), { status: 404 });
      },
    });
    expect(result.provider).toBe("fallback");
    expect(JSON.stringify(result)).not.toContain("Model unavailable");
    expect(log).toHaveBeenCalledOnce();
    const line = log.mock.calls[0][0] as string;
    expect(line).toMatch(/^\[LLM\] provider_http_404 /);
    expect(line).not.toMatch(/private-|gsk_|\n/);
    const diagnostic = JSON.parse(line.slice(line.indexOf("{")));
    expect(diagnostic).toMatchObject({
      status: 404, code: "model_not_found", type: "invalid_request_error",
      url: "https://api.groq.com/openai/v1/chat/completions", model,
    });
    expect(diagnostic.message).toContain("Model unavailable");
    expect(diagnostic.message).toContain("[redacted]");
    expect(diagnostic.message).toHaveLength(320);
  } finally {
    log.mockRestore();
  }
});

it.each(["sensitive-provider-body", "a".repeat(9000)])(
  "keeps the HTTP diagnostic when the body is unreadable or too large",
  async (body) => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = await getReply({ message: "你好", phase: "idle", hour: 12 }, {
        apiKey: "private-test-key",
        fetcher: async () => new Response(body, { status: 401 }),
      });
      expect(result.provider).toBe("fallback");
      expect(log.mock.calls).toEqual([[
        '[LLM] provider_http_401 {"status":401,"url":"https://api.openai.com/v1/chat/completions","model":"gpt-4o-mini"}',
      ]]);
    } finally {
      log.mockRestore();
    }
  },
);
