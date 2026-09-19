import { openBookmarkDialog, openDeleteDialog, openMenu } from "./dialogs";
import { ICON } from "./icons";
import { loadBookmarks, saveBookmarks, type Bookmark } from "./store";
import { monogram } from "./url";

const section = document.getElementById("bookmarks") as HTMLElement;
const grid = document.getElementById("shortcuts") as HTMLElement;
const addButton = document.getElementById("add") as HTMLButtonElement;

let bookmarks = loadBookmarks();
let onCount: (count: number) => void = () => {};

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

function render() {
  grid.replaceChildren(...bookmarks.map(tile));
  section.classList.toggle("is-empty", bookmarks.length === 0);
  onCount(bookmarks.length);
}

function commit(next: Bookmark[]) {
  bookmarks = next;
  saveBookmarks(bookmarks);
  render();
}

const navigate = (url: string) => {
  if (typeof chrome !== "undefined" && chrome.tabs) chrome.tabs.update({ url });
  else location.href = url;
};

function add() {
  openBookmarkDialog({
    onSave: (draft) => commit([...bookmarks, { id: crypto.randomUUID(), ...draft }]),
  });
}

function edit(b: Bookmark) {
  openBookmarkDialog({
    bookmark: b,
    onSave: (draft) => commit(bookmarks.map((x) => (x.id === b.id ? { ...x, ...draft } : x))),
    onDelete: () => remove(b),
  });
}

function remove(b: Bookmark) {
  openDeleteDialog(b, () => commit(bookmarks.filter((x) => x.id !== b.id)));
}

function openInNewTab(url: string) {
  if (typeof chrome !== "undefined" && chrome.tabs) chrome.tabs.create({ url });
  else window.open(url, "_blank");
}

export function initBookmarks(countChanged: (count: number) => void) {
  onCount = countChanged;
  addButton.insertAdjacentHTML("afterbegin", ICON.plus);
  render();

  addButton.addEventListener("click", add);

  const find = (e: Event) => {
    const el = (e.target as HTMLElement).closest<HTMLAnchorElement>(".tile");
    return el && bookmarks.find((b) => b.id === el.dataset.id);
  };

  grid.addEventListener("click", (e) => {
    // Plain clicks go through the tabs API so chrome:// links work too;
    // modified clicks keep the browser's native behavior.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const b = find(e);
    if (!b) return;
    e.preventDefault();
    navigate(b.url);
  });

  grid.addEventListener("contextmenu", (e) => {
    const b = find(e);
    if (!b) return;
    e.preventDefault();

    let { clientX: x, clientY: y } = e;
    if (!x && !y) {
      // Opened from the keyboard: anchor to the tile itself.
      const rect = (e.target as HTMLElement).closest(".tile")!.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    openMenu(x, y, [
      { label: "Open in new tab", icon: ICON.open, run: () => openInNewTab(b.url) },
      { label: "Edit", icon: ICON.edit, run: () => edit(b) },
      { label: "Copy link", icon: ICON.link, run: () => void navigator.clipboard?.writeText(b.url) },
      { label: "Delete", icon: ICON.trash, danger: true, run: () => remove(b) },
    ]);
  });
}
