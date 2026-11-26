export function googleSearchUrl(query: string) {
  return `https://www.google.com/search?${new URLSearchParams({ q: query })}`;
}

export function openSearchWindow(url: string) {
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
  const width = Math.min(screen.availWidth, Math.max(520, Math.round(screen.availWidth * .48)));
  const height = Math.min(1000, Math.round(screen.availHeight * .9));
  const left = (screen.availLeft ?? 0) + screen.availWidth - width;
  const top = (screen.availTop ?? 0) + Math.round((screen.availHeight - height) / 2);
  // Open synchronously during the submit gesture and drop the opener before navigating.
  const popup = window.open("about:blank", "_blank", `popup,width=${width},height=${height},left=${left},top=${top}`);
  if (!popup) return false;
  popup.opener = null;
  popup.location.replace(url);
  return true;
}
