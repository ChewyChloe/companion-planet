import { Response } from "undici";
import { describe, expect, it, vi } from "vitest";
import { actions, classifyDialogue, fallback, urgent, validateReply } from "../shared/dialogue.js";
import { fallbackLines } from "../shared/fallback-lines.js";
import { getReply } from "../server/dialogue.js";
import { allowedAction } from "../src/domain";

type Turn = { role: string; content: string };
const turn = (content: string): Turn => ({ role: "user", content });
const steady = { random: () => 0.7 };

describe("local companion dialogue", () => {
  it("has distinct authored lines, varied phrasing and kaomoji with valid animation metadata", () => {
    const texts = fallbackLines.map(line => line.text.replace(/[\p{P}\s]/gu, ""));
    expect(fallbackLines.length).toBeGreaterThanOrEqual(150);
    expect(new Set(texts).size).toBe(fallbackLines.length);
    expect(new Set(fallbackLines.map(line => line.id)).size).toBe(fallbackLines.length);
    expect(fallbackLines.every(line => line.intent && line.emotion && actions.includes(line.animation)
      && /[\p{Script=Han}]/u.test(line.text))).toBe(true);
    const decorated = fallbackLines.filter(line => line.kaomoji);
    expect(decorated.length / fallbackLines.length).toBeGreaterThanOrEqual(.25);
    expect(decorated.length / fallbackLines.length).toBeLessThanOrEqual(.40);
    expect(new Set(decorated.map(line => line.kaomoji)).size).toBe(decorated.length);
    expect(new Set(fallbackLines.map(({ text }) => /[。！？～…!?]$/.exec(text)?.[0] ?? "none")).size)
      .toBeGreaterThanOrEqual(5);
  });

  it.each([
    ["哈囉～", "greeting"], ["哈", "greeting"], ["終於成功了！", "joy"],
    ["今天心情不好", "sad"], ["我不開心", "sad"], ["明天考試好焦慮", "exam-worry"],
    ["好睏，等下還要上班", "tired"], ["沒有人可以聊，覺得委屈", "lonely"],
    ["剛到公司，要改簡報", "study"], ["抱抱我", "affection"], ["幫我打氣", "encourage"],
    ["我不累，只是慌張", "anxious"], ["我沒有焦慮，也不孤單", "unknown"],
    ["不用安靜，我好開心", "joy"], ["不用幫我開始讀書", "unknown"],
    ["不要休息，我想複習", "study"], ["紫色盒子", "unknown"],
  ])("recognizes %s as %s", (message, intent) => {
    expect(classifyDialogue(message).intent).toBe(intent);
  });

  it("carries recent topics and intent into a follow-up without guessing on unrelated input", () => {
    const history = [
      turn("期末考讓我好焦慮"),
      { role: "assistant", content: "我聽著" },
      turn("嗯嗯"),
    ];
    expect(classifyDialogue("可是我還沒讀完", history)).toMatchObject({
      topic: "exam", intent: "exam", continued: true,
    });
    expect(classifyDialogue("還是那樣", history)).toMatchObject({
      intent: "exam-worry", continued: true,
    });
    expect(classifyDialogue("一顆橘子", history).intent).toBe("unknown");
    expect(classifyDialogue("可是我還沒讀完", [...history, ...Array(5).fill(turn("嗯"))]).topic)
      .not.toBe("exam");
  });

  it("keeps sentence openings, lines and kaomoji fresh within a rolling window", () => {
    const history: Turn[] = [];
    const recent: (typeof fallbackLines)[number][] = [];
    const opening = (value: string) => value.split(/[，、。！？…～?!]/, 1)[0].slice(0, 4);
    for (let i = 0; i < 24; i++) {
      const reply = fallback("哈囉", "idle", 12, { history, random: () => 0, companionId: "fern" });
      const line = fallbackLines.find(item => item.id === reply.id)!;
      expect(recent.some(item => item.id === reply.id)).toBe(false);
      expect(recent.some(item => opening(item.text) === opening(line.text))).toBe(false);
      if (line.kaomoji) expect(recent.some(item => item.kaomoji === line.kaomoji)).toBe(false);
      recent.push(line);
      history.push(turn("哈囉"), { role: "assistant", content: reply.reply_text });
      if (recent.length > 5) recent.shift();
    }
  });

  it("applies role, timer and time context and carries the reaction into UI validation", () => {
    const nebula = fallback("嗨", "idle", 12, { random: () => 0, companionId: "nebula" });
    const fern = fallback("嗨", "idle", 12, { random: () => 0, companionId: "fern" });
    expect(nebula.reply_text).not.toBe(fern.reply_text);
    expect(fallback("abcdef", "break", 12, steady).intent).toBe("resting");
    expect(fallback("abcdef", "idle", 23, steady).intent).toBe("night");
    expect(fallback("嗨", "focus", 12, steady)).toMatchObject({ intent: "focus", suggested_action: "listen", mood: null });
    const reaction = validateReply(fallback("我好難過", "idle", 12, steady));
    expect(reaction.mood).toBe("sad");
    expect(allowedAction(reaction.suggested_action, "idle")).toBe("idle");
    expect(allowedAction("unknown-animation", "idle")).toBe("idle");
    expect(fallback("開始專注", "focus", 12, steady).user_intent).toBe("chat");
  });

  it("keeps urgent messages outside the pool", () => {
    for (const message of ["我不想活了", "有人正在攻擊我", "我被困在火場"]) {
      expect(urgent(message)).toBe(true);
      const reply = fallback(message);
      expect(reply.id).toBeUndefined();
      expect(reply.reply_text).toContain("119");
      expect(reply.suggested_action).toBe("listen");
    }
  });
});

describe("provider fallback integration", () => {
  it.each([404, 429, "timeout"] as const)("uses the same contextual library for %s", async failure => {
    const fetcher = vi.fn(async () => {
      if (failure === "timeout") throw new DOMException("timeout", "TimeoutError");
      return new Response(JSON.stringify({ error: { code: "provider_error" } }), { status: failure });
    });
    const result = await getReply({
      message: "可是我還沒讀完", phase: "idle", hour: 12,
      history: [turn("明天有期末考")], companionId: "fern",
    }, { apiKey: "test-secret", fetcher });
    expect(result).toMatchObject({ provider: "fallback", intent: "exam", suggested_action: "listen" });
    expect(result.reply_text).not.toContain("provider_error");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
