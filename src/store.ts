export interface Bookmark {
  id: string;
  name: string;
  url: string;
  /** Favicon as a data URL, captured when the bookmark is saved. */
  icon?: string;
}

// localStorage (not chrome.storage) on purpose: it is synchronous, so bookmarks
// are in the DOM before the first paint.
const KEY = "mivo:bookmarks";

export function loadBookmarks(): Bookmark[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(list: Bookmark[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable: keep working in memory.
  }
}
