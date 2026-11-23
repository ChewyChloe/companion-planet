import { it, expect } from "vitest";
import { parseOrigins, localOrigins, webAccess } from "../server/access.js";
import { startServer } from "../server/index.js";
import { request } from "node:http";
it("accepts explicit deployment origins, rejects credentials and non-origin URLs", () => {
  expect(
    parseOrigins("https://planet.example, http://192.168.1.20:8080"),
  ).toEqual(["https://planet.example", "http://192.168.1.20:8080"]);
  for (const value of [
    "https://user:secret@example.com",
    "javascript:alert(1)",
    "https://example.com/private",
  ])
    expect(() => parseOrigins(value)).toThrow();
  expect(localOrigins(5173, {})).toEqual(["http://localhost:5173"]);
  expect(webAccess(8080, "https://planet.example").allowedHosts).toContain(
    "planet.example",
  );
});
it("serves chat through a configured HTTPS origin without trusting arbitrary hosts", async () => {
  const server = await startServer({
    port: 0,
    allowedHosts: ["127.0.0.1", "planet.example"],
    allowedOrigins: ["https://planet.example"],
  });
  const port = (server.address() as { port: number }).port;
  const send = (
    pathname: string,
    host: string,
    origin?: string,
    body?: object,
  ) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port,
          path: pathname,
          method: body ? "POST" : "GET",
          headers: {
            Host: host,
            ...(origin ? { Origin: origin } : {}),
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ status: res.statusCode!, body: data }));
        },
      );
      req.on("error", reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  try {
    const chat = await send(
      "/api/chat",
      "planet.example",
      "https://planet.example",
      { message: "好累", phase: "idle", hour: 12 },
    );
    expect(chat.status).toBe(200);
    expect(JSON.parse(chat.body).user_intent).toBe("tired");
    expect((await send("/api/health", "evil.example")).status).toBe(403);
    expect(
      (
        await send("/api/chat", "planet.example", "https://evil.example", {
          message: "嗨",
          phase: "idle",
          hour: 12,
        })
      ).status,
    ).toBe(403);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
