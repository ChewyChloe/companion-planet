import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

const origin = "https://companion-planet.onrender.com";
const worker = readFileSync(new URL("../extensions/search-split/worker.js", import.meta.url), "utf8");

function setup() {
  const left = { id: 4, windowId: 1, index: 1, pinned: false, groupId: -1, splitViewId: -1 };
  const right = { ...left, id: 5, index: 2 };
  const saved: Record<string, number> = {};
  const tabs = {
    get: vi.fn(async (id: number) => ({ ...(id === left.id ? left : right) })),
    create: vi.fn(async () => ({ ...right })),
    createSplit: vi.fn(async () => {
      left.splitViewId = right.splitViewId = 9;
      return 9;
    }),
    update: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    onRemoved: { addListener: vi.fn() },
  };
  const listener = vi.fn();
  runInNewContext(worker, {
    URL,
    chrome: {
      tabs,
      storage: { session: {
        get: async (key: string) => ({ [key]: saved[key] }),
        set: async (value: Record<string, number>) => { Object.assign(saved, value); },
        remove: async (key: string) => { delete saved[key]; },
      } },
      runtime: { onMessage: { addListener: listener } },
    },
  });
  const receive = listener.mock.calls[0][0];
  const message = { channel: "companion-planet:search-split:v1", query: "星光 & 月亮" };
  const sender = { origin, frameId: 0, tab: { id: left.id } };
  return { left, right, tabs, receive, message, sender, send: () => new Promise(resolve => receive(message, sender, resolve)) };
}

it("opens the right-hand native pane and reuses it on the next search", async () => {
  const { send, tabs, message } = setup();
  expect(await send()).toEqual({ opened: true });
  expect(tabs.create).toHaveBeenCalledWith(expect.objectContaining({ index: 2, active: false }));
  expect(tabs.createSplit).toHaveBeenCalledWith([4, 5]);
  expect(tabs.update).toHaveBeenCalledWith(5, { url: "https://www.google.com/search?q=%E6%98%9F%E5%85%89+%26+%E6%9C%88%E4%BA%AE" });
  message.query = "later";
  expect(await send()).toEqual({ opened: true });
  expect(tabs.create).toHaveBeenCalledTimes(1);
  expect(tabs.update).toHaveBeenLastCalledWith(5, { url: "https://www.google.com/search?q=later" });
});

it("leaves an unrelated split alone and cleans up a failed split attempt", async () => {
  const { left, tabs, send } = setup();
  left.splitViewId = 20;
  expect(await send()).toEqual({ opened: false });
  expect(tabs.create).not.toHaveBeenCalled();
  left.splitViewId = -1;
  tabs.createSplit.mockRejectedValueOnce(new Error("unavailable"));
  expect(await send()).toEqual({ opened: false });
  expect(tabs.remove).toHaveBeenCalledWith(5);
  expect(tabs.update).not.toHaveBeenCalled();
});

it("ignores requests from other origins or child frames", () => {
  const { tabs, message, sender, receive } = setup();
  const reply = vi.fn();
  receive(message, { ...sender, origin: "https://example.com" }, reply);
  receive(message, { ...sender, frameId: 2 }, reply);
  expect(reply).not.toHaveBeenCalled();
  expect(tabs.create).not.toHaveBeenCalled();
});
