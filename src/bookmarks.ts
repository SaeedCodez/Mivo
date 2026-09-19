import { ICON } from "./icons";
import { buildMinis } from "./minis";
import { load, save } from "./store";
import type { Bookmark, BookmarkDraft, Folder, Store, UI } from "./types";
import { monogram } from "./url";

const section = document.getElementById("bookmarks") as HTMLElement;
const grid = document.getElementById("shortcuts") as HTMLElement;
const addButton = document.getElementById("add") as HTMLButtonElement;

let { bookmarks, folders } = load();
let onCount: (count: number) => void = () => {};
const listeners = new Set<() => void>();

// --- Tiles -------------------------------------------------------------------

function tile(b: Bookmark): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "tile";
  a.href = b.url;
  a.dataset.id = b.id;
  a.draggable = false;

  if (b.icon) {
    const img = new Image(40, 40);
    img.className = "tile-icon";
    img.src = b.icon;
    img.alt = "";
    img.draggable = false;
    a.append(img);
  } else {
    const mono = document.createElement("span");
    mono.className = "tile-mono";
    mono.textContent = monogram(b.name);
    a.append(mono);
  }

  const name = document.createElement("span");
  name.className = "tile-name";
  name.textContent = b.name;
  a.append(name);
  return a;
}

function folderTile(f: Folder): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tile tile-folder";
  button.dataset.folder = f.id;
  button.setAttribute("aria-haspopup", "dialog");

  const members = bookmarks.filter((b) => b.folderId === f.id);
  if (members.length) {
    button.append(buildMinis(members));
  } else {
    const empty = document.createElement("div");
    empty.className = "minis minis-empty";
    empty.innerHTML = ICON.folder;
    button.append(empty);
  }

  const name = document.createElement("span");
  name.className = "tile-name";
  name.textContent = f.name;
  button.append(name);
  return button;
}

function render() {
  const root = bookmarks.filter((b) => !b.folderId);
  grid.replaceChildren(...root.map(tile), ...folders.map(folderTile));
  section.classList.toggle("is-empty", root.length + folders.length === 0);
  onCount(bookmarks.length);
}

// --- Store -------------------------------------------------------------------

function commit() {
  save(bookmarks, folders);
  render();
  listeners.forEach((fn) => fn());
}

const navigate = (url: string) => {
  if (typeof chrome !== "undefined" && chrome.tabs) chrome.tabs.update({ url });
  else location.href = url;
};

const openInNewTab = (url: string) => {
  if (typeof chrome !== "undefined" && chrome.tabs) chrome.tabs.create({ url });
  else window.open(url, "_blank");
};

const store: Store = {
  bookmarks: () => bookmarks,
  folders: () => folders,

  addBookmark(draft: BookmarkDraft) {
    bookmarks = [...bookmarks, { id: crypto.randomUUID(), ...draft }];
    commit();
  },
  updateBookmark(id, draft) {
    bookmarks = bookmarks.map((b) => (b.id === id ? { ...b, ...draft } : b));
    commit();
  },
  removeBookmark(id) {
    bookmarks = bookmarks.filter((b) => b.id !== id);
    commit();
  },
  moveBookmark(id, folderId) {
    bookmarks = bookmarks.map((b) => (b.id === id ? { ...b, folderId } : b));
    commit();
  },

  addFolder(name, memberIds) {
    const folder = { id: crypto.randomUUID(), name };
    folders = [...folders, folder];
    bookmarks = bookmarks.map((b) => (memberIds.includes(b.id) ? { ...b, folderId: folder.id } : b));
    commit();
    return folder;
  },
  updateFolder(id, name, memberIds) {
    folders = folders.map((f) => (f.id === id ? { ...f, name } : f));
    bookmarks = bookmarks.map((b) => {
      if (memberIds.includes(b.id)) return { ...b, folderId: id };
      return b.folderId === id ? { ...b, folderId: undefined } : b;
    });
    commit();
  },
  removeFolder(id, alsoBookmarks) {
    folders = folders.filter((f) => f.id !== id);
    bookmarks = alsoBookmarks
      ? bookmarks.filter((b) => b.folderId !== id)
      : bookmarks.map((b) => (b.folderId === id ? { ...b, folderId: undefined } : b));
    commit();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },

  tile,
  navigate,
  openInNewTab,
};

// --- On-demand UI --------------------------------------------------------------

let uiLoad: Promise<UI> | undefined;

function loadUI(): Promise<UI> {
  uiLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "ui.js";
    script.onload = () => resolve(window.mivoUI!);
    script.onerror = () => {
      uiLoad = undefined;
      reject(new Error("Could not load ui.js"));
    };
    document.head.append(script);
  });
  return uiLoad;
}

const withUI = (run: (ui: UI) => void) => void loadUI().then(run, () => {});

export function initBookmarks(countChanged: (count: number) => void) {
  onCount = countChanged;
  addButton.insertAdjacentHTML("afterbegin", ICON.plus);
  render();

  // Warm up the dialogs once the page has painted, so the first click is instant.
  const warm = () => void loadUI().catch(() => {});
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 2000 });
  else setTimeout(warm, 500);

  addButton.addEventListener("click", () => {
    const anchor = addButton.getBoundingClientRect();
    withUI((ui) => ui.addMenu(store, anchor));
  });

  const target = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>(".tile");

  grid.addEventListener("click", (e) => {
    const el = target(e);
    if (!el) return;

    if (el.dataset.folder) {
      const f = folders.find((x) => x.id === el.dataset.folder);
      if (f) withUI((ui) => ui.openFolder(store, f));
      return;
    }

    // Plain clicks go through the tabs API so chrome:// links work too;
    // modified clicks keep the browser's native behavior.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const b = bookmarks.find((x) => x.id === el.dataset.id);
    if (!b) return;
    e.preventDefault();
    navigate(b.url);
  });

  grid.addEventListener("contextmenu", (e) => {
    const el = target(e);
    if (!el) return;
    e.preventDefault();

    let { clientX: x, clientY: y } = e;
    if (!x && !y) {
      // Opened from the keyboard: anchor to the tile itself.
      const rect = el.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    if (el.dataset.folder) {
      const f = folders.find((z) => z.id === el.dataset.folder);
      if (f) withUI((ui) => ui.folderMenu(store, f, x, y));
      return;
    }
    const b = bookmarks.find((z) => z.id === el.dataset.id);
    if (b) withUI((ui) => ui.bookmarkMenu(store, b, x, y));
  });
}
