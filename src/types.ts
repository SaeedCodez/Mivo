export interface Bookmark {
  id: string;
  name: string;
  url: string;
  /** Favicon as a data URL, captured when the bookmark is saved. */
  icon?: string;
  /** Unset means the bookmark lives on the home screen. */
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface BookmarkDraft {
  name: string;
  url: string;
  icon?: string;
  folderId?: string;
}

/** Bookmark data and the few DOM helpers the on-demand UI bundle needs. */
export interface Store {
  bookmarks(): readonly Bookmark[];
  folders(): readonly Folder[];
  addBookmark(draft: BookmarkDraft): void;
  updateBookmark(id: string, draft: BookmarkDraft): void;
  removeBookmark(id: string): void;
  moveBookmark(id: string, folderId?: string): void;
  addFolder(name: string, memberIds: string[]): Folder;
  updateFolder(id: string, name: string, memberIds: string[]): void;
  removeFolder(id: string, alsoBookmarks: boolean): void;
  subscribe(listener: () => void): () => void;
  tile(bookmark: Bookmark): HTMLAnchorElement;
  navigate(url: string): void;
  openInNewTab(url: string): void;
}

/** Everything that is only needed once the user interacts (ui.js). */
export interface UI {
  addMenu(store: Store, anchor: DOMRect): void;
  bookmarkMenu(store: Store, bookmark: Bookmark, x: number, y: number): void;
  folderMenu(store: Store, folder: Folder, x: number, y: number): void;
  openFolder(store: Store, folder: Folder): void;
}

declare global {
  interface Window {
    mivoUI?: UI;
  }
}
