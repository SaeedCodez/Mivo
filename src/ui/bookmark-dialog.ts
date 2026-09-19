import { fetchFavicon } from "../favicon";
import { ICON } from "../icons";
import type { Bookmark, Store } from "../types";
import { autoName, hostOf, monogram, toUrl } from "../url";
import { openFolderDialog } from "./folder-dialog";
import { $, closeDialog, html, openMenu, showDialog, type MenuEntry } from "./shell";

interface BookmarkDialogOptions {
  store: Store;
  /** Editing this bookmark; otherwise a new one is created. */
  bookmark?: Bookmark;
  /** Folder to preselect for a new bookmark. */
  folderId?: string;
}

export function openBookmarkDialog({ store, bookmark, folderId: initialFolder }: BookmarkDialogOptions) {
  const edit = !!bookmark;

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
          <div class="field" data-field="url">
            <label class="field-label" for="bookmark-url">URL</label>
            <input class="field-box" id="bookmark-url" type="text" inputmode="url" placeholder="https://example.com" autocomplete="off" spellcheck="false" autocapitalize="off">
            <p class="field-helper" hidden>Enter a valid URL, e.g. https://figma.com</p>
          </div>
          <div class="name-row">
            <div class="fav-preview" aria-hidden="true"></div>
            <div class="field">
              <label class="field-label" for="bookmark-name">Name</label>
              <input class="field-box" id="bookmark-name" type="text" placeholder="Site name" autocomplete="off" spellcheck="false">
            </div>
          </div>
          <div class="field">
            <span class="field-label" id="folder-label">Folder</span>
            <button class="field-box select" type="button" aria-haspopup="menu" aria-labelledby="folder-label folder-value">
              <span class="select-value" id="folder-value"></span>${ICON.chevron}
            </button>
          </div>
          <div class="modal-foot"></div>
        </form>
      </div>
    </div>`);

  $(scrim, ".modal-title").textContent = edit ? "Edit bookmark" : "Add bookmark";
  $(scrim, ".modal-sub").textContent = edit ? "Changes apply instantly." : "Save a site to your New Tab.";

  const urlField = $(scrim, '[data-field="url"]');
  const urlInput = $<HTMLInputElement>(scrim, "#bookmark-url");
  const nameInput = $<HTMLInputElement>(scrim, "#bookmark-name");
  const helper = $(scrim, ".field-helper");
  const preview = $(scrim, ".fav-preview");
  const select = $<HTMLButtonElement>(scrim, ".select");
  const selectValue = $(scrim, ".select-value");
  const foot = $(scrim, ".modal-foot");
  const form = $<HTMLFormElement>(scrim, "form");

  foot.innerHTML = edit
    ? `<button class="delete-action" type="button" data-delete>${ICON.trash}<span>Delete</span></button>
       <div class="actions">
         <button class="btn btn-ghost" type="button" data-close>Cancel</button>
         <button class="btn btn-primary" type="submit">Save changes</button>
       </div>`
    : `<span class="hint">Enter to save</span>
       <div class="actions">
         <button class="btn btn-ghost" type="button" data-close>Cancel</button>
         <button class="btn btn-primary" type="submit" disabled>Save</button>
       </div>`;
  const save = $<HTMLButtonElement>(foot, ".btn-primary");

  let nameTouched = edit;
  let icon = bookmark?.icon;
  let iconFor = bookmark?.url ?? "";
  let iconLoad: Promise<void> = Promise.resolve();
  let timer = 0;
  let folderId = bookmark ? bookmark.folderId : initialFolder;

  const parsed = () => toUrl(urlInput.value.trim());

  function renderPreview() {
    const url = parsed();
    preview.className = "fav-preview";
    preview.replaceChildren();
    if (!url) {
      preview.innerHTML = ICON.plus;
    } else if (icon && iconFor === url) {
      const img = new Image();
      img.src = icon;
      img.alt = "";
      preview.classList.add("has-icon");
      preview.append(img);
    } else {
      preview.classList.add("is-mono");
      preview.textContent = monogram(nameInput.value || autoName(url));
    }
  }

  function loadIcon(url: string) {
    iconFor = url;
    icon = undefined;
    iconLoad = fetchFavicon(url).then((found) => {
      if (iconFor !== url) return;
      icon = found;
      renderPreview();
    });
  }

  function setError(on: boolean) {
    urlField.classList.toggle("is-error", on);
    helper.hidden = !on;
  }

  function renderSelect() {
    const folder = store.folders().find((f) => f.id === folderId);
    if (!folder) folderId = undefined;
    selectValue.textContent = folder ? folder.name : "No folder";
    select.classList.toggle("is-empty", !folder);
  }

  function openPicker() {
    const rect = select.getBoundingClientRect();
    const count = (id: string) => store.bookmarks().filter((b) => b.folderId === id).length;
    const entries: MenuEntry[] = [
      { label: "No folder", selected: !folderId, run: () => pick(undefined) },
      ...store.folders().map((f) => ({
        label: f.name,
        end: String(count(f.id)),
        selected: f.id === folderId,
        run: () => pick(f.id),
      })),
      "divider",
      {
        label: "New folder",
        icon: ICON.plus,
        run: () => openFolderDialog({ store, onCreated: (f) => pick(f.id) }),
      },
    ];
    select.classList.add("is-open");
    openMenu(rect.left, rect.bottom + 8, entries, {
      width: rect.width,
      compact: true,
      onClose: () => select.classList.remove("is-open"),
    });
  }

  function pick(id: string | undefined) {
    folderId = id;
    renderSelect();
  }

  select.addEventListener("click", openPicker);

  urlInput.addEventListener("input", () => {
    const url = parsed();
    if (url) {
      setError(false);
      if (!nameTouched) nameInput.value = autoName(url);
      if (url !== iconFor) {
        iconFor = url;
        icon = undefined;
        clearTimeout(timer);
        timer = window.setTimeout(() => loadIcon(url), 200);
      }
    } else {
      if (!nameTouched) nameInput.value = "";
      iconFor = "";
      icon = undefined;
      clearTimeout(timer);
    }
    save.disabled = !url;
    renderPreview();
  });
  urlInput.addEventListener("blur", () => {
    if (urlInput.value.trim() && !parsed()) setError(true);
  });
  nameInput.addEventListener("input", () => {
    nameTouched = true;
    renderPreview();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = parsed();
    if (!url) {
      setError(true);
      urlInput.focus();
      return;
    }
    if (timer) {
      clearTimeout(timer);
      timer = 0;
      loadIcon(url);
    }
    await iconLoad;
    const draft = {
      name: nameInput.value.trim() || autoName(url),
      url,
      icon: iconFor === url ? icon : undefined,
      folderId,
    };
    closeDialog();
    if (bookmark) store.updateBookmark(bookmark.id, draft);
    else store.addBookmark(draft);
  });

  foot.querySelector("[data-delete]")?.addEventListener("click", () => {
    closeDialog(false);
    if (bookmark) openDeleteBookmarkDialog(store, bookmark);
  });

  if (bookmark) {
    urlInput.value = bookmark.url;
    nameInput.value = bookmark.name;
    if (!bookmark.icon) loadIcon(bookmark.url);
  }
  renderSelect();
  renderPreview();

  const focus = edit ? nameInput : urlInput;
  showDialog(scrim, focus, () => clearTimeout(timer));
  focus.setSelectionRange(focus.value.length, focus.value.length);
}

export function openDeleteBookmarkDialog(store: Store, bookmark: Bookmark) {
  const scrim = html(`
    <div class="scrim">
      <div class="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal-head">
          <div class="modal-titles">
            <h2 class="modal-title" id="dialog-title">Delete bookmark?</h2>
            <p class="modal-sub">This action can’t be undone.</p>
          </div>
          <button class="icon-btn" type="button" data-close aria-label="Close">${ICON.close}</button>
        </div>
        <div class="chip">
          <div class="chip-icon"></div>
          <div class="chip-text"><span class="chip-name"></span><span class="chip-meta"></span></div>
        </div>
        <div class="modal-foot modal-foot-end">
          <button class="btn btn-secondary" type="button" data-close>Cancel</button>
          <button class="btn btn-accent" type="button" data-confirm>Delete</button>
        </div>
      </div>
    </div>`);

  const chipIcon = $(scrim, ".chip-icon");
  if (bookmark.icon) {
    const img = new Image();
    img.src = bookmark.icon;
    img.alt = "";
    chipIcon.append(img);
  } else {
    chipIcon.classList.add("is-mono");
    chipIcon.textContent = monogram(bookmark.name);
  }
  $(scrim, ".chip-name").textContent = bookmark.name;
  const folder = store.folders().find((f) => f.id === bookmark.folderId);
  $(scrim, ".chip-meta").textContent = hostOf(bookmark.url) + (folder ? " · " + folder.name : "");

  $(scrim, "[data-confirm]").addEventListener("click", () => {
    closeDialog();
    store.removeBookmark(bookmark.id);
  });

  showDialog(scrim, $(scrim, ".btn-secondary"));
}
