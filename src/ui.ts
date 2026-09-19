// Entry point of ui.js: dialogs and menus. Loaded after the first paint (or on
// first interaction), so none of it sits on the new tab's critical path.
import { ICON } from "./icons";
import type { UI } from "./types";
import { openBookmarkDialog, openDeleteBookmarkDialog } from "./ui/bookmark-dialog";
import { openDeleteFolderDialog, openFolderDialog, openFolderView, openMovePicker } from "./ui/folder-dialog";
import { openMenu } from "./ui/shell";
import { openSettings } from "./ui/settings";

const ui: UI = {
  addMenu(store, anchor) {
    openMenu(
      anchor.left + anchor.width / 2,
      anchor.bottom + 8,
      [
        { label: "New bookmark", icon: ICON.bookmark, run: () => openBookmarkDialog({ store }) },
        { label: "New folder", icon: ICON.folder, run: () => openFolderDialog({ store }) },
      ],
      { width: 200, center: true },
    );
  },

  bookmarkMenu(store, bookmark, x, y) {
    openMenu(x, y, [
      { label: "Open in new tab", icon: ICON.open, run: () => store.openInNewTab(bookmark.url) },
      { label: "Edit", icon: ICON.edit, run: () => openBookmarkDialog({ store, bookmark }) },
      { label: "Move to folder", icon: ICON.folder, run: () => openMovePicker(store, bookmark, x, y) },
      { label: "Copy link", icon: ICON.link, run: () => void navigator.clipboard?.writeText(bookmark.url) },
      "divider",
      { label: "Delete", icon: ICON.trash, danger: true, run: () => openDeleteBookmarkDialog(store, bookmark) },
    ]);
  },

  folderMenu(store, folder, x, y) {
    openMenu(x, y, [
      { label: "Edit", icon: ICON.edit, run: () => openFolderDialog({ store, folder }) },
      "divider",
      { label: "Delete", icon: ICON.trash, danger: true, run: () => openDeleteFolderDialog(store, folder) },
    ]);
  },

  openFolder: openFolderView,
  openSettings,
};

window.mivoUI = ui;

// Dialog titles use the medium weight, which nothing on the home screen needs.
void document.fonts?.load('500 20px "Space Grotesk"');
