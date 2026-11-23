import { startServer } from "./index.js";
import { webAccess } from "./access.js";
const port = Number(process.env.PORT) || 8080;
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid PORT");
const access = webAccess(port, process.env.WEB_ORIGINS || "");
startServer({ port, host: "0.0.0.0", staticFiles: true, ...access })
  .then(() => {
    console.log(`Companion Planet web server listening on port ${port}`);
    console.log(
      "Same-Wi-Fi addresses:",
      access.allowedOrigins
        .filter((origin) => origin.startsWith("http:"))
        .join(", "),
    );
  })
  .catch((error) => {
    console.error("Web startup failed:", error.message);
    process.exitCode = 1;
  });
