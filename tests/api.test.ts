import { it, expect } from "vitest";
import { fallbackLines } from "../shared/fallback-lines.js";
import { startServer } from "../server/index.js";
it("serves mock chat; rejects unsafe origin and invalid payloads", async () => {
  const server = await startServer({ port: 0 });
  const address = server.address() as { port: number };
  const root = `http://127.0.0.1:${address.port}`;
  try {
    expect((await fetch(root + "/api/health")).ok).toBe(true);
    const body = { message: "今天好累", phase: "idle", hour: 12 };
    const post = (value: unknown, origin = root) =>
      fetch(root + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(value),
      });
    expect((await post({ ...body, message: "x".repeat(601) })).status).toBe(
      400,
    );
    expect((await post(body, "https://evil.example")).status).toBe(403);
    const reply = await (await post(body)).json();
    expect(reply.user_intent).toBe("tired");
    expect(reply).toMatchObject({ intent: "tired", mood: "sleepy", suggested_action: "rest" });
    expect(fallbackLines.find(line => line.id === reply.id)?.intent).toBe("tired");
    const history = [{ role: "user", content: "明天考試" }, ...Array.from({ length: 4 }, () => [
      { role: "assistant", content: "我在這裡" },
      { role: "user", content: "嗯嗯" },
    ]).flat(), { role: "assistant", content: "我聽著" }];
    const next = { ...body, message: "可是我還沒讀完", history };
    expect(await (await post(next)).json()).toMatchObject({ intent: "exam" });
    expect((await post({ ...next, history: [...history, history[0]] })).status).toBe(400);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it("allows embedded GLB texture fetches without allowing remote connections", async () => {
  const server = await startServer({ port: 0, staticFiles: true });
  const address = server.address() as { port: number };
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    const policy = response.headers.get("content-security-policy") || "";
    expect(policy.split(";").map((rule) => rule.trim())).toContain(
      "connect-src 'self' blob:",
    );
    expect(policy).toContain("script-src 'self';");
    expect(policy).not.toContain("connect-src *");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it("restricts the desktop loopback service and supports offline chat", async () => {
  const token = "desktop-session-test";
  const server = await startServer({ port: 0, desktopToken: token, enableProvider: false });
  const { port } = server.address() as { port: number };
  const root = `http://127.0.0.1:${port}`;
  const desktop = { "X-Companion-Desktop": token };
  try {
    expect((await fetch(root + "/api/health")).status).toBe(403);
    expect((await fetch(root + "/api/health", { headers: { ...desktop, Origin: "https://example.com" } })).status).toBe(403);
    expect((await fetch(`http://localhost:${port}/api/health`, { headers: desktop })).status).toBe(403);
    expect(await (await fetch(root + "/api/health", { headers: desktop })).json()).toEqual({
      ok: true, provider: "mock",
    });
    const reply = await fetch(root + "/api/chat", {
      method: "POST",
      headers: { ...desktop, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "今天好累", phase: "idle", hour: 12 }),
    });
    expect(await reply.json()).toMatchObject({ provider: "mock", intent: "tired" });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
