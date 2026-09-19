// Reads the icon Chrome already has for a page (needs the "favicon" permission)
// and returns it as a data URL, so tiles never wait on a lookup when a tab opens.

const SIZE = 64;

const iconRequest = (pageUrl: string) =>
  chrome.runtime.getURL("/_favicon/") + `?pageUrl=${encodeURIComponent(pageUrl)}&size=${SIZE}`;

const toBytes = async (res: Response) => new Uint8Array(await (await res.blob()).arrayBuffer());

let fallback: Promise<Uint8Array> | undefined;

/** Chrome answers with a generic globe when it has no icon; remember its bytes. */
const fallbackBytes = () => (fallback ??= fetch(iconRequest("https://mivo.invalid/")).then(toBytes));

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export async function fetchFavicon(pageUrl: string): Promise<string | undefined> {
  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) return undefined;
  try {
    const res = await fetch(iconRequest(pageUrl));
    const blob = await res.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (same(bytes, await fallbackBytes())) return undefined;
    return await toDataUrl(blob);
  } catch {
    return undefined;
  }
}
