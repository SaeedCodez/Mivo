// Dialog stack and popup menus. All of this DOM is built on first use.
import { ICON } from "../icons";

export const html = (markup: string) => {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
};

export const $ = <T extends HTMLElement>(root: ParentNode, selector: string) => root.querySelector(selector) as T;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// --- Dialogs -----------------------------------------------------------------

interface Layer {
  scrim: HTMLElement;
  opener: Element | null;
  onClose?: () => void;
}

const FOCUSABLE = 'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])';
const stack: Layer[] = [];

function onKey(e: KeyboardEvent) {
  if (menu) return; // an open menu handles its own keys
  const top = stack[stack.length - 1];
  if (!top) return;

  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    closeDialog();
  } else if (e.key === "Tab") {
    const items = [...top.scrim.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent);
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
}

/** Opens a dialog on top of any that are already open (which are hidden meanwhile). */
export function showDialog(scrim: HTMLElement, focus: HTMLElement, onClose?: () => void) {
  closeMenu();
  const below = stack[stack.length - 1];
  if (below) below.scrim.hidden = true;
  else document.addEventListener("keydown", onKey, true);

  const layer: Layer = { scrim, opener: document.activeElement, onClose };
  stack.push(layer);

  scrim.addEventListener("mousedown", (e) => {
    if (e.target === scrim && stack[stack.length - 1] === layer) closeDialog();
  });
  scrim.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-close]")) closeDialog();
  });

  document.body.append(scrim);
  focus.focus();
}

export function closeDialog(restoreFocus = true) {
  closeMenu();
  const layer = stack.pop();
  if (!layer) return;
  layer.scrim.remove();
  layer.onClose?.();

  const below = stack[stack.length - 1];
  if (below) below.scrim.hidden = false;
  else document.removeEventListener("keydown", onKey, true);

  if (restoreFocus && layer.opener instanceof HTMLElement && layer.opener.isConnected) layer.opener.focus();
}

// --- Menus -------------------------------------------------------------------

export interface MenuItem {
  label: string;
  icon?: string;
  /** Small text shown before the check mark, e.g. a bookmark count. */
  end?: string;
  danger?: boolean;
  /** Marks the current choice in a picker. */
  selected?: boolean;
  run(): void;
}

export type MenuEntry = MenuItem | "divider";

export interface MenuOptions {
  width?: number;
  /** Treat `x` as the horizontal center of the menu instead of its left edge. */
  center?: boolean;
  focusFirst?: boolean;
  /** Tighter icon/label spacing, used by folder pickers. */
  compact?: boolean;
  onClose?: () => void;
}

let menu: { el: HTMLElement; opener: Element | null; onClose?: () => void; dispose: () => void } | null = null;

export function closeMenu(restoreFocus = false) {
  if (!menu) return;
  const { el, opener, onClose, dispose } = menu;
  menu = null;
  dispose();
  el.remove();
  onClose?.();
  if (restoreFocus && opener instanceof HTMLElement && opener.isConnected) opener.focus();
}

export function openMenu(x: number, y: number, entries: MenuEntry[], opts: MenuOptions = {}) {
  closeMenu();
  const opener = document.activeElement;

  const el = html(`<div class="menu" role="menu" tabindex="-1"></div>`);
  if (opts.width) el.style.width = opts.width + "px";
  if (opts.compact) el.classList.add("menu-compact");

  for (const entry of entries) {
    if (entry === "divider") {
      el.append(html(`<hr class="menu-divider">`));
      continue;
    }
    const button = html(
      `<button class="menu-item${entry.danger ? " is-danger" : ""}${entry.selected ? " is-selected" : ""}" type="button" role="menuitem"></button>`,
    );
    if (entry.icon) button.insertAdjacentHTML("beforeend", entry.icon);
    const label = document.createElement("span");
    label.className = "menu-label";
    label.textContent = entry.label;
    button.append(label);
    if (entry.end) {
      const end = document.createElement("span");
      end.className = "menu-end";
      end.textContent = entry.end;
      button.append(end);
    }
    if (entry.selected) button.insertAdjacentHTML("beforeend", ICON.check);
    button.addEventListener("click", () => {
      closeMenu(true);
      entry.run();
    });
    el.append(button);
  }

  el.style.visibility = "hidden";
  document.body.append(el);
  const { width, height } = el.getBoundingClientRect();
  const left = opts.center ? x - width / 2 : x;
  el.style.left = Math.max(8, Math.min(left, innerWidth - width - 8)) + "px";
  el.style.top = Math.max(8, Math.min(y, innerHeight - height - 8)) + "px";
  el.style.visibility = "";

  const buttons = [...el.querySelectorAll<HTMLElement>(".menu-item")];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeMenu(true);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = buttons.indexOf(document.activeElement as HTMLElement);
      const step = e.key === "ArrowDown" ? 1 : -1;
      buttons[(i + step + buttons.length) % buttons.length]?.focus();
    } else if (e.key === "Tab") {
      closeMenu(true);
    }
  };
  const onOutside = (e: Event) => {
    if (el.contains(e.target as Node)) return;
    // Dismissing the menu by pressing on a dialog's backdrop must not also close the dialog.
    if ((e.target as Element).closest?.(".scrim") === e.target) e.preventDefault();
    closeMenu();
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
    onClose: opts.onClose,
    dispose: () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("contextmenu", onOutside, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("wheel", onClose);
    },
  };

  if (opts.focusFirst) buttons[0]?.focus();
  else el.focus();
}
