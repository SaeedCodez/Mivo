import type { Bookmark, Folder } from "./types";

// localStorage (not chrome.storage) on purpose: it is synchronous, so bookmarks
// are in the DOM before the first paint.
const BOOKMARKS = "mivo:bookmarks";
const FOLDERS = "mivo:folders";

function read<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: keep working in memory.
  }
}

export function load(): { bookmarks: Bookmark[]; folders: Folder[] } {
  const folders = read<Folder>(FOLDERS);
  const ids = new Set(folders.map((f) => f.id));
  const bookmarks = read<Bookmark>(BOOKMARKS).map((b) =>
    b.folderId && !ids.has(b.folderId) ? { ...b, folderId: undefined } : b,
  );
  return { bookmarks, folders };
}

export function save(bookmarks: readonly Bookmark[], folders: readonly Folder[]) {
  write(BOOKMARKS, bookmarks);
  write(FOLDERS, folders);
}
