import { Response } from "undici";
import { describe, it, expect } from "vitest";
import {
  initialTimer,
  startTimer,
  pause,
  resume,
  tick,
  chooseAction,
  allowedAction,
  restoreTimer,
} from "../src/domain";
import { validateReply, fallback, getReply } from "../server/dialogue.js";
describe("deadline timer", () => {
  it("starts, pauses and resumes without losing remaining time", () => {
    const s = startTimer(initialTimer, 25, 1000);
    expect(s.deadline).toBe(1501000);
    const p = pause(s, 61000);
    expect(p.remaining).toBe(1440000);
    expect(p.running).toBe(false);
    expect(tick(p, 200000)).toEqual(p);
    expect(resume(p, 200000).deadline).toBe(1640000);
  });
  it("completes focus once and moves to break", () => {
    const s = startTimer(initialTimer, 1, 0);
    const done = tick(s, 120000);
    expect(done.phase).toBe("break");
    expect(done.completed).toBe(1);
    expect(tick(done, 130000).completed).toBe(1);
  });
  it("restarts focus and finishes a break", () => {
    const running = startTimer(initialTimer, 1, 0, "break");
    const b = tick(running, 60000);
    expect(b.phase).toBe("idle");
    expect(startTimer(b, 5, 70000).deadline).toBe(370000);
  });
  it("restores elapsed background time and rejects invalid storage", () => {
    expect(restoreTimer(startTimer(initialTimer, 1, 1000), 62000).phase).toBe(
      "break",
    );
    expect(restoreTimer({ phase: "invalid" }, 0)).toEqual(initialTimer);
    expect(restoreTimer({ ...initialTimer, completed: NaN }, 0)).toEqual(
      initialTimer,
    );
  });
  it("handles pause precisely at the deadline", () => {
    expect(pause(startTimer(initialTimer, 1, 0), 60000).phase).toBe("break");
  });
});
describe("behavior controller rules", () => {
  it("chooses bounded state-specific activity", () => {
    expect(chooseAction("focus", 0.9)).toBe("read");
    expect(chooseAction("break", 0.2)).toBe("rest");
    expect(chooseAction("break", 0.9)).toBe("stretch");
    expect(chooseAction("idle", 0.25)).toBe("walk");
    expect(chooseAction("idle", 0.01)).not.toBe(chooseAction("idle", 0.5));
  });
  it("rejects unknown action and restricts distractions while focusing", () => {
    expect(allowedAction("run_shell", "idle")).toBe("idle");
    expect(allowedAction("happy", "focus")).toBe("listen");
    expect(allowedAction("approach", "idle")).toBe("approach");
  });
});
describe("dialogue validation and fallback", () => {
  it("validates complete structured responses only", () => {
    expect(() =>
      validateReply({ reply_text: "hello", user_intent: "hack" }),
    ).toThrow();
    expect(() =>
      validateReply({ ...fallback("嗨"), suggested_action: "execute" }),
    ).toThrow();
    expect(validateReply(fallback("嗨")).user_intent).toBe("chat");
  });
  it("detects intents without executing timer changes", () => {
    expect(fallback("我要開始讀書").user_intent).toBe("start_focus");
    expect(fallback("好累").user_intent).toBe("tired");
    expect(fallback("想休息").user_intent).toBe("take_break");
    expect(fallback("安靜").user_intent).toBe("be_quiet");
    expect(fallback("鼓勵我").user_intent).toBe("encourage");
    expect(fallback("嗨", "focus").suggested_action).toBe("listen");
  });
  it("supports mock without credentials", async () => {
    expect(
      (
        await getReply(
          { message: "嗨", phase: "idle", hour: 12 },
          { apiKey: "" },
        )
      ).provider,
    ).toBe("mock");
  });
  it("falls back on provider failures and malformed output", async () => {
    for (const fetcher of [
      async () => {
        throw Error("timeout");
      },
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"bad":true}' } }],
          }),
        ),
    ]) {
      expect(
        (
          await getReply(
            { message: "好累", phase: "idle", hour: 12 },
            { apiKey: "test", fetcher },
          )
        ).provider,
      ).toBe("fallback");
    }
  });
  it("does not send urgent harm messages to the provider", async () => {
    let called = false;
    const r = await getReply(
      { message: "我不想活了", phase: "focus", hour: 12 },
      {
        apiKey: "test",
        fetcher: async () => {
          called = true;
          throw Error();
        },
      },
    );
    expect(called).toBe(false);
    expect(r.provider).toBe("safety");
    expect(r.reply_text).toContain("119");
  });
});
it("resolves a focus deadline even when reopened a day later", () => {
  expect(
    restoreTimer(startTimer(initialTimer, 25, 1000), 1000 + 86400000).completed,
  ).toBe(1);
});
it("accepts a valid provider reply and constrains focus response", async () => {
  const data = {
    ...fallback("嗨"),
    reply_text: "我在。還想聊什麼？",
    suggested_action: "happy",
  };
  const r = await getReply(
    { message: "嗨", phase: "focus", hour: 12 },
    {
      apiKey: "test",
      fetcher: async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(data) } }],
          }),
        ),
    },
  );
  expect(r.provider).toBe("llm");
  expect(r.reply_text).toBe("我在。");
  expect(r.suggested_action).toBe("listen");
});
