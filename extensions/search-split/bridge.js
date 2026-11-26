/* global chrome */
const channel = "companion-planet:search-split:v1";

window.addEventListener("message", ({ origin, source, data }) => {
  if (source !== window || origin !== location.origin || data?.channel !== channel
    || data.type !== "request" || typeof data.id !== "string"
    || typeof data.query !== "string" || data.query.length > 200 || !data.query.trim()) return;

  const reply = (type, opened) => window.postMessage({ channel, id: data.id, type, opened }, location.origin);
  reply("received");
  chrome.runtime.sendMessage({ channel, query: data.query })
    .then((response) => reply("result", response?.opened === true))
    .catch(() => reply("result", false));
});
