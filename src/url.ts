const SCHEME = /^((https?|ftp|file|chrome):\/\/|about:)\S+$/i;
const HOST = /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z\d-]+\.)+[a-z]{2,})(:\d+)?([/?#]\S*)?$/i;

/** Returns a navigable URL for `value`, or null if it doesn't look like one. */
export function toUrl(value: string): string | null {
  if (SCHEME.test(value)) return value;
  if (HOST.test(value)) return (/^(localhost|\d)/i.test(value) ? "http://" : "https://") + value;
  return null;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "https://www.figma.com/files" -> "Figma" */
export function autoName(url: string): string {
  const first = hostOf(url).split(".")[0] ?? "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** First letter/number of a name, for tiles without a favicon. */
export function monogram(name: string): string {
  return (name.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? "•").toUpperCase();
}
