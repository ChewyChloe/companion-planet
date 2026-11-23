import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getReply } from "./dialogue.js";
import { loopbackHosts, localOrigins } from "./access.js";
export async function startServer({
  port = Number(process.env.PORT) || 3001,
  host = "127.0.0.1",
  staticFiles = false,
  allowedHosts = loopbackHosts,
  allowedOrigins = /** @type {string[]} */ ([]),
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (req, res, next) => {
    if (!allowedHosts.includes(req.hostname))
      return res.status(403).json({ error: "Host rejected" });
    const origin = req.headers.origin;
    const own = `http://${req.headers.host}`;
    if (origin && origin !== own && !allowedOrigins.includes(origin))
      return res.status(403).json({ error: "Origin rejected" });
    next();
  });
  app.use(express.json({ limit: "8kb" }));
  const calls = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of calls)
      if (now - value.at > 60_000) calls.delete(key);
  }, 60_000);
  sweep.unref();
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, provider: process.env.LLM_API_KEY ? "llm" : "mock" }),
  );
  app.post("/api/chat", async (req, res) => {
    const { message, phase, hour, history = [] } = req.body || {};
    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 600 ||
      !["idle", "focus", "break"].includes(phase) ||
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Array.isArray(history) ||
      history.length > 6 ||
      history.some(
        (x) =>
          !x ||
          !["user", "assistant"].includes(x.role) ||
          typeof x.content !== "string" ||
          x.content.length > 600,
      )
    )
      return res.status(400).json({ error: "Invalid input" });
    const ip = req.ip;
    const now = Date.now();
    const old = calls.get(ip);
    const count =
      old && now - old.at < 60_000
        ? { at: old.at, count: old.count + 1 }
        : { at: now, count: 1 };
    calls.set(ip, count);
    if (count.count > 20) return res.status(429).json({ error: "請稍候再試" });
    res.json(await getReply({ message: message.trim(), phase, hour, history }));
  });
  if (staticFiles) {
    app.use((_req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      );
      next();
    });
    const directory = fileURLToPath(new URL("../dist", import.meta.url));
    app.use(express.static(directory));
    app.get("/", (_req, res) =>
      res.sendFile(path.join(directory, "index.html")),
    );
  }
  app.use((err, _req, res, _next) => {
    void _next;
    res
      .status(err.status || 500)
      .json({ error: "Request could not be processed" });
  });
  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  server.on("close", () => clearInterval(sweep));
  return server;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  startServer({ allowedOrigins: localOrigins(5173) }).then((server) =>
    console.log(`Companion API listening on ${server.address().port}`),
  );
