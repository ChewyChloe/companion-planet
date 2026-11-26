/* global chrome */
const origin = "https://companion-planet.onrender.com";
const channel = "companion-planet:search-split:v1";
const pending = new Set();
const isSplit = (tab) => Number.isInteger(tab.splitViewId) && tab.splitViewId >= 0;

async function openSearch(leftId, query) {
  if (typeof chrome.tabs.createSplit !== "function") return false;

  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query.trim());
  const key = `search-split:${leftId}`;
  const left = await chrome.tabs.get(leftId);
  if (isSplit(left)) {
    const { [key]: rightId } = await chrome.storage.session.get(key);
    if (!Number.isInteger(rightId)) return false;
    const right = await chrome.tabs.get(rightId);
    if (right.windowId !== left.windowId || right.splitViewId !== left.splitViewId || right.index !== left.index + 1) return false;
    await chrome.tabs.update(rightId, { url: url.href });
    return true;
  }

  const right = await chrome.tabs.create({
    windowId: left.windowId,
    index: left.index + 1,
    pinned: left.pinned,
    openerTabId: left.id,
    active: false,
    url: "about:blank",
  });
  try {
    if (left.groupId >= 0 && right.groupId !== left.groupId) {
      await chrome.tabs.group({ groupId: left.groupId, tabIds: right.id });
    }
    const splitId = await chrome.tabs.createSplit([leftId, right.id]);
    const rightPane = await chrome.tabs.get(right.id);
    const leftPane = await chrome.tabs.get(leftId);
    if (rightPane.splitViewId !== splitId || leftPane.splitViewId !== splitId || rightPane.index !== leftPane.index + 1) {
      throw new Error("Split did not place the search tab on the right");
    }
    await chrome.storage.session.set({ [key]: right.id });
    await chrome.tabs.update(right.id, { url: url.href });
    return true;
  } catch {
    await chrome.tabs.remove(right.id).catch(() => {});
    await chrome.storage.session.remove(key).catch(() => {});
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const tabId = sender.tab?.id;
  if (sender.origin !== origin || sender.frameId !== 0 || !Number.isInteger(tabId)
    || message?.channel !== channel || typeof message.query !== "string"
    || message.query.length > 200 || !message.query.trim()) return;

  if (pending.has(tabId)) {
    reply({ opened: false });
    return;
  }
  pending.add(tabId);
  void openSearch(tabId, message.query)
    .catch(() => false)
    .then((opened) => {
      pending.delete(tabId);
      reply({ opened });
    });
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(`search-split:${tabId}`).catch(() => {});
});
