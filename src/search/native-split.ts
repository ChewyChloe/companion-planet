const channel = "companion-planet:search-split:v1";

export function openNativeSearchSplit(query: string): Promise<boolean> {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    const id = crypto.randomUUID();
    const finish = (opened: boolean) => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      resolve(opened);
    };
    let timeout = window.setTimeout(() => finish(false), 250);
    function receive({ source, origin: senderOrigin, data }: MessageEvent) {
      if (source !== window || senderOrigin !== origin || data?.channel !== channel || data.id !== id) return;
      if (data.type === "received") {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => finish(false), 5000);
      } else if (data.type === "result") {
        finish(data.opened === true);
      }
    }
    window.addEventListener("message", receive);
    window.postMessage({ channel, id, type: "request", query }, origin);
  });
}
