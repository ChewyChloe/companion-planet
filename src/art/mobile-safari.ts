export function usesMobileSafariRendering() {
  const { userAgent, platform, maxTouchPoints } = navigator;
  // iPadOS can advertise a desktop user agent.
  const appleMobile = /iPhone|iPad|iPod/u.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);
  return appleMobile && /Safari\//u.test(userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA/u.test(userAgent);
}
