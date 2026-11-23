import { it, expect } from "vitest";
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
    expect(reply.reply_text).toContain("辛苦");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
