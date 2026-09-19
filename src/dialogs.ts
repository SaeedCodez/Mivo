// Modals and the context menu. Their DOM is built on first use, so none of it
// costs anything while a new tab is loading.
import { fetchFavicon } from "./favicon";
import { ICON } from "./icons";
import type { Bookmark } from "./store";
import { autoName, hostOf, monogram, toUrl } from "./url";

const html = (markup: string) => {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
};

const $ = <T extends HTMLElement>(root: ParentNode, selector: string) => root.querySelector(selector) as T;

const FOCUSABLE = 'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])';

// --- Modal shell -----------------------------------------------------------

let active: { scrim: HTMLElement; opener: Element | null; dispose: () => void } | null = null;

function closeDialog(restoreFocus = true) {
  if (!active) return;
  const { scrim, opener, dispose } = active;
  active = null;
  dispose();
  scrim.remove();
  if (restoreFocus && opener instanceof HTMLElement && opener.isConnected) opener.focus();
}

function showDialog(scrim: HTMLElement, focus: HTMLElement) {
  closeMenu();
  closeDialog(false);
  const opener = document.activeElement;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
    } else if (e.key === "Tab") {
      const items = [...scrim.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  const onDown = (e: MouseEvent) => {
    if (e.target === scrim) closeDialog();
  };

  document.addEventListener("keydown", onKey, true);
  scrim.addEventListener("mousedown", onDown);
  scrim.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-close]")) closeDialog();
  });

  active = {
    scrim,
    opener,
    dispose: () => document.removeEventListener("keydown", onKey, true),
  };
  document.body.append(scrim);
  focus.focus();
}

export const isDialogOpen = () => active !== null;

// --- Add / edit ------------------------------------------------------------

export interface BookmarkDraft {
  name: string;
  url: string;
  icon?: string;
}

interface BookmarkDialogOptions {
  bookmark?: Bookmark;
  onSave(draft: BookmarkDraft): void;
  onDelete?(): void;
}

export function openBookmarkDialog({ bookmark, onSave, onDelete }: BookmarkDialogOptions) {
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
    closeDialog();
    onSave({ name: nameInput.value.trim() || autoName(url), url, icon: iconFor === url ? icon : undefined });
  });

  foot.querySelector("[data-delete]")?.addEventListener("click", () => {
    closeDialog(false);
    onDelete?.();
  });

  if (bookmark) {
    urlInput.value = bookmark.url;
    nameInput.value = bookmark.name;
    if (!bookmark.icon) loadIcon(bookmark.url);
  }
  renderPreview();

  const focus = edit ? nameInput : urlInput;
  showDialog(scrim, focus);
  focus.setSelectionRange(focus.value.length, focus.value.length);
}

// --- Delete ----------------------------------------------------------------

export function openDeleteDialog(bookmark: Bookmark, onConfirm: () => void) {
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
  $(scrim, ".chip-meta").textContent = hostOf(bookmark.url);

  $(scrim, "[data-confirm]").addEventListener("click", () => {
    closeDialog();
    onConfirm();
  });

  showDialog(scrim, $(scrim, ".btn-secondary"));
}

// --- Context menu ----------------------------------------------------------

export interface MenuItem {
  label: string;
  icon: string;
  danger?: boolean;
  run(): void;
}

let menu: { el: HTMLElement; opener: Element | null; dispose: () => void } | null = null;

export function closeMenu(restoreFocus = false) {
  if (!menu) return;
  const { el, opener, dispose } = menu;
  menu = null;
  dispose();
  el.remove();
  if (restoreFocus && opener instanceof HTMLElement && opener.isConnected) opener.focus();
}

export function openMenu(x: number, y: number, items: MenuItem[]) {
  closeMenu();
  const opener = document.activeElement;

  const el = html(`<div class="menu" role="menu" tabindex="-1"></div>`);
  items.forEach((item, i) => {
    if (item.danger && i > 0) el.append(html(`<hr class="menu-divider">`));
    const button = html(
      `<button class="menu-item${item.danger ? " is-danger" : ""}" type="button" role="menuitem">${item.icon}<span></span></button>`,
    );
    $(button, "span").textContent = item.label;
    button.addEventListener("click", () => {
      closeMenu();
      item.run();
    });
    el.append(button);
  });

  el.style.visibility = "hidden";
  document.body.append(el);
  const { width, height } = el.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(x, innerWidth - width - 8)) + "px";
  el.style.top = Math.max(8, Math.min(y, innerHeight - height - 8)) + "px";
  el.style.visibility = "";

  const buttons = [...el.querySelectorAll<HTMLElement>(".menu-item")];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = buttons.indexOf(document.activeElement as HTMLElement);
      const step = e.key === "ArrowDown" ? 1 : -1;
      buttons[(i + step + buttons.length) % buttons.length]?.focus();
    } else if (e.key === "Tab") {
      closeMenu();
    }
  };
  const onOutside = (e: Event) => {
    if (!el.contains(e.target as Node)) closeMenu();
  };
  const onClose = () => closeMenu();

  document.addEventListener("keydown", onKey, true);
  document.addEventListener("pointerdown", onOutside, true);
  document.addEventListener("contextmenu", onOutside, true);
  window.addEventListener("blur", onClose);
  window.addEventListener("resize", onClose);
  window.addEventListener("wheel", onClose, { passive: true });

  menu = {
    el,
    opener,
    dispose: () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("contextmenu", onOutside, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("wheel", onClose);
    },
  };
  el.focus();
}
