const channel = "companion-planet:search-split:v1";

export type NativeSplitResult = "opened" | "extension-unavailable" | "unsupported" | "occupied" | "failed";

export function openNativeSearchSplit(query: string): Promise<NativeSplitResult> {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    const id = crypto.randomUUID();
    const finish = (result: NativeSplitResult) => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      resolve(result);
    };
    let timeout = window.setTimeout(() => finish("extension-unavailable"), 250);
    function receive({ source, origin: senderOrigin, data }: MessageEvent) {
      if (source !== window || senderOrigin !== origin || data?.channel !== channel || data.id !== id) return;
      if (data.type === "received") {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => finish("failed"), 5000);
      } else if (data.type === "result") {
        const reason = data.reason;
        finish(data.opened === true ? "opened" : reason === "unsupported" || reason === "occupied" ? reason : "failed");
      }
    }
    window.addEventListener("message", receive);
    window.postMessage({ channel, id, type: "request", query }, origin);
  });
}
