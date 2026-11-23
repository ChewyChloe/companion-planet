import { networkInterfaces } from "node:os";
export const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];
export function parseOrigins(value = "") {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((value) => {
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        throw new Error("WEB_ORIGINS must contain HTTP(S) origins only");
      return url.origin;
    });
}
export function localOrigins(port, interfaces = networkInterfaces()) {
  return [
    "localhost",
    ...new Set(
      Object.values(interfaces)
        .flat()
        .filter(Boolean)
        .map((item) =>
          item.family === "IPv6" ? `[${item.address}]` : item.address,
        )
        .filter((address) => !address.includes("%")),
    ),
  ].map((host) => `http://${host}:${port}`);
}
export function webAccess(port, configured = "") {
  const origins = [...localOrigins(port), ...parseOrigins(configured)];
  return {
    allowedOrigins: origins,
    allowedHosts: [
      ...new Set([
        ...loopbackHosts,
        ...origins.map((origin) => new URL(origin).hostname),
      ]),
    ],
  };
}
