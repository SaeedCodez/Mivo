import { ICON } from "../icons";
import type { BackgroundInfo, ClockFont, SettingsStore, TileStyle } from "../types";
import { $, html } from "./shell";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
/** Stored copies are capped so a huge photo never slows the new tab down. */
const MAX_WIDTH = 2560;
const MAX_HEIGHT = 1600;
const KEEP_ORIGINAL_UNDER = 1024 * 1024;

const CLOCK: { value: ClockFont; name: string; meta: string }[] = [
  { value: "dot", name: "Dot Matrix", meta: "Doto" },
  { value: "mono", name: "Mono", meta: "Space Mono" },
];

const TILES: { value: TileStyle; name: string; meta: string }[] = [
  { value: "favicon", name: "Favicon", meta: "Site icon" },
  { value: "letter", name: "Letter", meta: "Doto initial" },
];

// Simple stand-ins for the sample sites' own icons, so nothing is fetched.
const SAMPLES = [
  {
    name: "Figma",
    letter: "F",
    icon: `<svg class="tile-icon" viewBox="0 0 40 40" aria-hidden="true"><g transform="translate(10.5 5.75) scale(.5)"><path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/><path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/><path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/><path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/><path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/></g></svg>`,
  },
  {
    name: "GitHub",
    letter: "G",
    icon: `<svg class="tile-icon" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="8" fill="#0d0d0d"/><path transform="translate(6 6) scale(1.75)" fill="#fff" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`,
  },
  {
    name: "Notion",
    letter: "N",
    icon: `<svg class="tile-icon" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="8" fill="#fff"/><rect x="7.5" y="7.5" width="25" height="25" rx="3" fill="#fff" stroke="#000" stroke-width="2.5"/><path d="M15 27V13l10 14V13" fill="none" stroke="#000" stroke-width="2.5"/></svg>`,
  },
];

const formatBytes = (n: number) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

const ERRORS = {
  type: "Choose a JPG, PNG or WEBP image.",
  size: "That file is over 10 MB.",
  read: "That image couldn’t be read.",
  save: "The image couldn’t be saved.",
} as const;

class UploadError extends Error {
  constructor(readonly kind: keyof typeof ERRORS) {
    super(kind);
  }
}

/** Validates the file and returns the blob to store: the original, or a smaller copy of it. */
async function prepare(file: File): Promise<{ image: Blob; info: BackgroundInfo }> {
  if (!ACCEPT.includes(file.type)) throw new UploadError("type");
  if (file.size > MAX_BYTES) throw new UploadError("size");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UploadError("read");
  }

  const info = { name: file.name, width: bitmap.width, height: bitmap.height, bytes: file.size };
  const scale = Math.min(1, MAX_WIDTH / bitmap.width, MAX_HEIGHT / bitmap.height);
  let image: Blob = file;

  if (scale < 1 || file.size > KEEP_ORIGINAL_UNDER) {
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    try {
      const smaller = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
      if (smaller.size < file.size) image = smaller;
    } catch {
      // Keep the original.
    }
  }
  bitmap.close();
  return { image, info };
}

export function openSettings(store: SettingsStore) {
  const opener = document.activeElement;
  const page = [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !el.matches(".bg, script"));

  const view = html(`
    <div class="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header class="header">
        <div class="brand"><span class="brand-dot"></span>MIVO</div>
        <button class="icon-btn" type="button" data-close aria-label="Close settings">${ICON.close}</button>
      </header>
      <div class="settings-body">
        <div class="settings-content">
          <h1 class="settings-title" id="settings-title">Settings</h1>
          <hr class="settings-divider">
          <section class="setting" data-section="clock" aria-labelledby="clock-heading">
            <div class="setting-head">
              <div class="setting-text"><h2 class="setting-heading" id="clock-heading">Clock font</h2><p class="setting-desc">Choose how the time is displayed on your New Tab.</p></div>
              <span class="save" hidden><i class="save-dot"></i>Saved</span>
            </div>
            <div class="cards" role="radiogroup" aria-labelledby="clock-heading"></div>
          </section>
          <hr class="settings-divider">
          <section class="setting" data-section="tiles" aria-labelledby="tiles-heading">
            <div class="setting-head">
              <div class="setting-text"><h2 class="setting-heading" id="tiles-heading">Bookmark style</h2><p class="setting-desc">Choose how bookmarks appear on your New Tab.</p></div>
              <span class="save" hidden><i class="save-dot"></i>Saved</span>
            </div>
            <div class="cards" role="radiogroup" aria-labelledby="tiles-heading"></div>
          </section>
          <hr class="settings-divider">
          <section class="setting" data-section="background" aria-labelledby="background-heading">
            <div class="setting-head">
              <div class="setting-text"><h2 class="setting-heading" id="background-heading">Background</h2><p class="setting-desc">Upload your own image. A black cover is placed over it so everything stays readable.</p></div>
              <span class="save" hidden><i class="save-dot"></i>Saved</span>
            </div>
            <div class="upload"></div>
            <p class="upload-error" role="alert" hidden></p>
            <input type="file" accept="${ACCEPT.join(",")}" hidden>
          </section>
          <p class="settings-hint">Changes are saved automatically</p>
        </div>
      </div>
    </div>`);

  // --- Saved indicator ---------------------------------------------------

  const timers = new Map<HTMLElement, number>();
  function flashSaved(section: string) {
    const badge = $(view, `[data-section="${section}"] .save`);
    badge.hidden = false;
    clearTimeout(timers.get(badge));
    timers.set(badge, window.setTimeout(() => (badge.hidden = true), 2000));
  }

  // --- Option cards ------------------------------------------------------

  function card(group: string, value: string, name: string, meta: string, preview: HTMLElement, checked: boolean) {
    const el = html(`
      <label class="card">
        <input class="option-input" type="radio" name="${group}" value="${value}">
        <span class="card-preview"></span>
        <span class="card-foot">
          <span class="card-info"><span class="card-name"></span><span class="card-meta"></span></span>
          <span class="radio"></span>
        </span>
      </label>`);
    $(el, ".card-preview").append(preview);
    $(el, ".card-name").textContent = name;
    $(el, ".card-meta").textContent = meta;
    $<HTMLInputElement>(el, "input").checked = checked;
    return el;
  }

  const clockCards = $(view, '[data-section="clock"] .cards');
  clockCards.append(
    ...CLOCK.map((o) => {
      const sample = html(`<span class="sample-time sample-${o.value}">09:41</span>`);
      return card("clock", o.value, o.name, o.meta, sample, store.get().clock === o.value);
    }),
  );
  clockCards.addEventListener("change", (e) => {
    store.set({ clock: (e.target as HTMLInputElement).value as ClockFont });
    flashSaved("clock");
    renderBackground();
  });

  const tileCards = $(view, '[data-section="tiles"] .cards');
  tileCards.append(
    ...TILES.map((o) => {
      const sample = html(`<span class="sample-tiles"></span>`);
      for (const s of SAMPLES) {
        const tile = html(`<span class="tile"></span>`);
        tile.insertAdjacentHTML("beforeend", o.value === "favicon" ? s.icon : `<span class="tile-mono">${s.letter}</span>`);
        const label = document.createElement("span");
        label.className = "tile-name";
        label.textContent = s.name;
        tile.append(label);
        sample.append(tile);
      }
      return card("tiles", o.value, o.name, o.meta, sample, store.get().tiles === o.value);
    }),
  );
  tileCards.addEventListener("change", (e) => {
    store.set({ tiles: (e.target as HTMLInputElement).value as TileStyle });
    flashSaved("tiles");
  });

  // --- Background --------------------------------------------------------

  const upload = $(view, ".upload");
  const errorEl = $(view, ".upload-error");
  const fileInput = $<HTMLInputElement>(view, 'input[type="file"]');

  const showError = (message?: string) => {
    errorEl.hidden = !message;
    errorEl.textContent = message ?? "";
  };

  async function choose(file: File | undefined) {
    if (!file) return;
    showError();
    try {
      const { image, info } = await prepare(file);
      try {
        await store.setBackground(image, info);
      } catch {
        throw new UploadError("save");
      }
      flashSaved("background");
    } catch (err) {
      showError(ERRORS[err instanceof UploadError ? err.kind : "read"]);
    }
  }

  fileInput.addEventListener("change", () => {
    void choose(fileInput.files?.[0]);
    fileInput.value = "";
  });

  function renderBackground() {
    const info = store.background();
    const hadFocus = view.contains(document.activeElement) && upload.contains(document.activeElement);

    if (!info) {
      upload.className = "upload dropzone";
      upload.innerHTML = `
        ${ICON.upload}
        <div class="drop-text">
          <p class="drop-title">Drag &amp; drop an image here</p>
          <p class="drop-hint">JPG, PNG or WEBP · up to 10 MB</p>
        </div>
        <button class="btn btn-secondary" type="button" data-choose>Choose file</button>`;
    } else {
      upload.className = "upload bg-card";
      upload.innerHTML = `
        <div class="bg-thumb"><span class="bg-time"></span></div>
        <div class="bg-info">
          <div class="bg-details">
            <p class="bg-file"></p>
            <p class="bg-meta"></p>
            <p class="bg-note">A black cover at 60% is applied over the image so the clock and bookmarks stay readable.</p>
          </div>
          <div class="bg-actions">
            <button class="btn btn-secondary" type="button" data-choose>Replace</button>
            <button class="btn btn-ghost" type="button" data-remove>Remove</button>
          </div>
        </div>`;
      const thumb = $(upload, ".bg-thumb");
      const shown = store.backgroundUrl();
      if (shown) thumb.style.backgroundImage = `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.6)),url(${shown})`;
      const time = $(upload, ".bg-time");
      time.textContent = "09:41";
      time.classList.add("sample-" + store.get().clock);
      $(upload, ".bg-file").textContent = info.name;
      $(upload, ".bg-meta").textContent = `${info.width} × ${info.height} · ${formatBytes(info.bytes)}`;
    }
    if (hadFocus) $<HTMLElement>(upload, "button").focus();
  }

  upload.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-remove]")) {
      showError();
      store.clearBackground().then(
        () => flashSaved("background"),
        () => showError(ERRORS.save),
      );
    } else if (target.closest("[data-choose]") || target.closest(".dropzone")) {
      fileInput.click();
    }
  });

  upload.addEventListener("dragenter", (e) => e.preventDefault());
  upload.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (upload.classList.contains("dropzone")) upload.classList.add("is-over");
  });
  upload.addEventListener("dragleave", (e) => {
    if (!upload.contains(e.relatedTarget as Node | null)) upload.classList.remove("is-over");
  });
  upload.addEventListener("drop", (e) => {
    e.preventDefault();
    upload.classList.remove("is-over");
    void choose(e.dataTransfer?.files[0]);
  });

  // A file dropped anywhere else would make the browser navigate to it.
  const swallow = (e: Event) => {
    if (!upload.contains(e.target as Node)) e.preventDefault();
  };

  renderBackground();
  const unsubscribe = store.subscribe(renderBackground);

  // --- Open / close ------------------------------------------------------

  function close() {
    unsubscribe();
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("dragover", swallow);
    window.removeEventListener("drop", swallow);
    timers.forEach((id) => clearTimeout(id));
    view.remove();
    for (const el of page) el.inert = false;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  view.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-close]")) close();
  });
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("dragover", swallow);
  window.addEventListener("drop", swallow);

  for (const el of page) el.inert = true;
  document.body.append(view);
  $<HTMLElement>(view, "[data-close]").focus();
}
