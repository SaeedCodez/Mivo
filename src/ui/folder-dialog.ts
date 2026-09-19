import { ICON } from "../icons";
import { buildMinis } from "../minis";
import type { Bookmark, Folder, Store } from "../types";
import { hostOf, monogram } from "../url";
import { openBookmarkDialog } from "./bookmark-dialog";
import { $, closeDialog, html, openMenu, plural, showDialog } from "./shell";

interface FolderDialogOptions {
  store: Store;
  /** Editing this folder; otherwise a new one is created. */
  folder?: Folder;
  onCreated?(folder: Folder): void;
}

// --- New / edit ------------------------------------------------------------

export function openFolderDialog({ store, folder, onCreated }: FolderDialogOptions) {
  const edit = !!folder;

  const scrim = html(`
    <div class="scrim">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal-head">
          <div class="modal-titles">
            <h2 class="modal-title" id="dialog-title"></h2>
            <p class="modal-sub"></p>
          </div>
          <button class="icon-btn" type="button" data-close aria-label="Close">${ICON.close}</button>
        </div>
        <hr class="modal-divider">
        <form class="modal-form" novalidate>
          <div class="name-row">
            <div class="folder-preview" aria-hidden="true"></div>
            <div class="field" data-field="name">
              <label class="field-label" for="folder-name">Name</label>
              <input class="field-box" id="folder-name" type="text" placeholder="Folder name" autocomplete="off" spellcheck="false">
              <p class="field-helper" hidden></p>
            </div>
          </div>
          <div class="picker">
            <div class="picker-head"><span class="field-label">Bookmarks</span><span class="picker-count"></span></div>
            <div class="picker-list"></div>
          </div>
          <div class="modal-foot"></div>
        </form>
      </div>
    </div>`);

  $(scrim, ".modal-title").textContent = edit ? "Edit folder" : "New folder";
  $(scrim, ".modal-sub").textContent = edit ? "Rename or change what’s inside." : "Group related bookmarks together.";

  const nameField = $(scrim, '[data-field="name"]');
  const nameInput = $<HTMLInputElement>(scrim, "#folder-name");
  const helper = $(scrim, ".field-helper");
  const preview = $(scrim, ".folder-preview");
  const count = $(scrim, ".picker-count");
  const list = $(scrim, ".picker-list");
  const foot = $(scrim, ".modal-foot");
  const form = $<HTMLFormElement>(scrim, "form");

  foot.innerHTML = edit
    ? `<button class="delete-action" type="button" data-delete>${ICON.trash}<span>Delete</span></button>
       <div class="actions">
         <button class="btn btn-ghost" type="button" data-close>Cancel</button>
         <button class="btn btn-primary" type="submit">Save changes</button>
       </div>`
    : `<span class="hint">Enter to create</span>
       <div class="actions">
         <button class="btn btn-ghost" type="button" data-close>Cancel</button>
         <button class="btn btn-primary" type="submit" disabled>Create folder</button>
       </div>`;
  const submit = $<HTMLButtonElement>(foot, ".btn-primary");

  const bookmarks = store.bookmarks();
  const selected = new Set(bookmarks.filter((b) => folder && b.folderId === folder.id).map((b) => b.id));

  // Keep the list order stable so the preview matches what the tile will show.
  const members = () => bookmarks.filter((b) => selected.has(b.id));

  function rowFor(b: Bookmark) {
    const row = html(`
      <label class="row">
        <input class="row-input" type="checkbox">
        <span class="row-icon"></span>
        <span class="row-name"></span>
        <span class="row-host"></span>
        <span class="checkbox">${ICON.tick}</span>
      </label>`);
    const icon = $(row, ".row-icon");
    if (b.icon) {
      const img = new Image();
      img.src = b.icon;
      img.alt = "";
      icon.append(img);
    } else {
      icon.classList.add("is-mono");
      icon.textContent = monogram(b.name);
    }
    $(row, ".row-name").textContent = b.name;
    $(row, ".row-host").textContent = hostOf(b.url);
    const input = $<HTMLInputElement>(row, "input");
    input.checked = selected.has(b.id);
    input.addEventListener("change", () => {
      if (input.checked) selected.add(b.id);
      else selected.delete(b.id);
      renderSelection();
    });
    return row;
  }

  if (bookmarks.length) list.append(...bookmarks.map(rowFor));
  else list.innerHTML = `<p class="picker-empty">No bookmarks yet.</p>`;

  function renderSelection() {
    count.textContent = selected.size + " selected";
    preview.replaceChildren();
    if (selected.size) preview.append(buildMinis(members()));
    else preview.innerHTML = ICON.plus;
  }

  const trimmed = () => nameInput.value.trim();
  const duplicate = () => {
    const name = trimmed().toLowerCase();
    return !!name && store.folders().some((f) => f.id !== folder?.id && f.name.toLowerCase() === name);
  };

  function validate() {
    const dup = duplicate();
    nameField.classList.toggle("is-error", dup);
    helper.hidden = !dup;
    if (dup) helper.textContent = `A folder named “${trimmed()}” already exists.`;
    submit.disabled = !trimmed() || dup;
    return !submit.disabled;
  }

  nameInput.addEventListener("input", () => validate());

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) {
      nameInput.focus();
      return;
    }
    const ids = [...selected];
    closeDialog();
    if (folder) {
      store.updateFolder(folder.id, trimmed(), ids);
    } else {
      // Not `onCreated?.(store.addFolder(...))`: the call would be skipped along with its arguments.
      const created = store.addFolder(trimmed(), ids);
      onCreated?.(created);
    }
  });

  foot.querySelector("[data-delete]")?.addEventListener("click", () => {
    closeDialog(false);
    if (folder) openDeleteFolderDialog(store, folder);
  });

  if (folder) nameInput.value = folder.name;
  renderSelection();
  validate();

  showDialog(scrim, nameInput);
  nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length);
}

// --- Delete ----------------------------------------------------------------

export function openDeleteFolderDialog(store: Store, folder: Folder) {
  const members = store.bookmarks().filter((b) => b.folderId === folder.id);
  const n = members.length;

  const scrim = html(`
    <div class="scrim">
      <div class="modal modal-md" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal-head">
          <div class="modal-titles">
            <h2 class="modal-title" id="dialog-title">Delete folder?</h2>
            <p class="modal-sub"></p>
          </div>
          <button class="icon-btn" type="button" data-close aria-label="Close">${ICON.close}</button>
        </div>
        <div class="chip">
          <div class="folder-preview is-plain" aria-hidden="true"></div>
          <div class="chip-text"><span class="chip-name"></span><span class="chip-meta"></span></div>
        </div>
        <div class="options"></div>
        <div class="modal-foot modal-foot-end">
          <button class="btn btn-secondary" type="button" data-close>Cancel</button>
          <button class="btn btn-accent" type="button" data-confirm>Delete folder</button>
        </div>
      </div>
    </div>`);

  $(scrim, ".modal-sub").textContent = n ? "Choose what happens to the bookmarks inside." : "This action can’t be undone.";
  $(scrim, ".chip-name").textContent = folder.name;
  $(scrim, ".chip-meta").textContent = plural(n, "bookmark");
  const preview = $(scrim, ".folder-preview");
  if (n) preview.append(buildMinis(members));
  else preview.innerHTML = ICON.folder;

  const options = $(scrim, ".options");
  if (n) {
    options.innerHTML = `
      <label class="option">
        <input class="option-input" type="radio" name="mode" value="keep" checked>
        <span class="radio"></span>
        <span class="option-text"><span class="option-title">Keep bookmarks</span><span class="option-sub"></span></span>
      </label>
      <label class="option">
        <input class="option-input" type="radio" name="mode" value="delete">
        <span class="radio"></span>
        <span class="option-text"><span class="option-title">Delete everything</span><span class="option-sub"></span></span>
      </label>`;
    const subs = options.querySelectorAll(".option-sub");
    subs[0]!.textContent = `Move the ${plural(n, "bookmark")} back to the home screen.`;
    subs[1]!.textContent = `Remove the folder and its ${plural(n, "bookmark")}.`;
  } else {
    options.remove();
  }

  $(scrim, "[data-confirm]").addEventListener("click", () => {
    const mode = scrim.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value;
    closeDialog();
    store.removeFolder(folder.id, mode === "delete");
  });

  showDialog(scrim, $(scrim, ".btn-secondary"));
}

// --- Folder contents -------------------------------------------------------

export function openFolderView(store: Store, folder: Folder) {
  const scrim = html(`
    <div class="scrim">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal-head">
          <div class="modal-titles">
            <h2 class="modal-title" id="dialog-title"></h2>
            <p class="modal-sub"></p>
          </div>
          <button class="icon-btn" type="button" data-close aria-label="Close">${ICON.close}</button>
        </div>
        <hr class="modal-divider">
        <div class="folder-grid"></div>
        <div class="modal-foot modal-foot-end">
          <button class="btn btn-ghost" type="button" data-add>Add bookmark</button>
          <button class="btn btn-ghost" type="button" data-edit>Edit folder</button>
        </div>
      </div>
    </div>`);

  const title = $(scrim, ".modal-title");
  const sub = $(scrim, ".modal-sub");
  const grid = $(scrim, ".folder-grid");

  function render() {
    const current = store.folders().find((f) => f.id === folder.id);
    if (!current) {
      closeDialog(false);
      return;
    }
    const members = store.bookmarks().filter((b) => b.folderId === folder.id);
    title.textContent = current.name;
    sub.textContent = plural(members.length, "bookmark");
    if (members.length) grid.replaceChildren(...members.map(store.tile));
    else grid.innerHTML = `<p class="picker-empty">This folder is empty.</p>`;
  }

  grid.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLAnchorElement>(".tile");
    if (!el || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const b = store.bookmarks().find((x) => x.id === el.dataset.id);
    if (b) store.navigate(b.url);
  });

  grid.addEventListener("contextmenu", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLAnchorElement>(".tile");
    const b = el && store.bookmarks().find((x) => x.id === el.dataset.id);
    if (!el || !b) return;
    e.preventDefault();
    let { clientX: x, clientY: y } = e;
    if (!x && !y) {
      const rect = el.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    window.mivoUI?.bookmarkMenu(store, b, x, y);
  });

  $(scrim, "[data-edit]").addEventListener("click", () => openFolderDialog({ store, folder }));
  $(scrim, "[data-add]").addEventListener("click", () => openBookmarkDialog({ store, folderId: folder.id }));

  const unsubscribe = store.subscribe(render);
  render();
  showDialog(scrim, $(scrim, ".icon-btn"), unsubscribe);
}

/** Lists folders to move a bookmark into; shared by the context menu. */
export function openMovePicker(store: Store, bookmark: Bookmark, x: number, y: number) {
  const count = (id: string) => store.bookmarks().filter((b) => b.folderId === id).length;
  openMenu(x, y, [
    { label: "No folder", selected: !bookmark.folderId, run: () => store.moveBookmark(bookmark.id, undefined) },
    ...store.folders().map((f) => ({
      label: f.name,
      end: String(count(f.id)),
      selected: f.id === bookmark.folderId,
      run: () => store.moveBookmark(bookmark.id, f.id),
    })),
    "divider",
    {
      label: "New folder",
      icon: ICON.plus,
      run: () => openFolderDialog({ store, onCreated: (f) => store.moveBookmark(bookmark.id, f.id) }),
    },
  ], { compact: true });
}
