// Preferences and the background image. This is part of the critical path: the
// clock font and the tile style are applied before the first paint, and the
// image is read from IndexedDB (the only place a blob this size fits) right away.
import type { BackgroundInfo, Settings, SettingsStore } from "./types";

const SETTINGS = "mivo:settings";
const BACKGROUND = "mivo:background";
const IMAGE_KEY = "background";

const root = document.documentElement;
const layer = document.getElementById("bg") as HTMLElement;

function readJSON(key: string): Record<string, unknown> {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the preference lasts until the tab closes.
  }
}

function readInfo(): BackgroundInfo | undefined {
  const v = readJSON(BACKGROUND);
  if (typeof v.name !== "string" || typeof v.width !== "number" || typeof v.height !== "number" || typeof v.bytes !== "number") return;
  return { name: v.name, width: v.width, height: v.height, bytes: v.bytes };
}

const saved = readJSON(SETTINGS);
let current: Settings = {
  clock: saved.clock === "mono" ? "mono" : "dot",
  tiles: saved.tiles === "letter" ? "letter" : "favicon",
};
let info = readInfo();
let url: string | undefined;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());
root.dataset.clock = current.clock;

/** Tiles and the search field drop their borders once a background image is set. */
function flagBackground() {
  if (info) root.dataset.bg = "";
  else delete root.dataset.bg;
}
flagBackground();

// --- Image storage ---------------------------------------------------------

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("mivo", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("kv", mode);
      const req = op(tx.objectStore("kv"));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Puts `image` behind the page under a 60% black cover, or removes the background. */
function show(image?: Blob) {
  if (url) URL.revokeObjectURL(url);
  url = image && URL.createObjectURL(image);
  layer.classList.remove("is-ready");

  if (!url) {
    layer.style.backgroundImage = "";
    notify();
    return;
  }
  const shown = url;
  const img = new Image();
  img.src = shown;
  // Decode first, so the fade-in never waits on the image.
  img.decode().then(
    () => {
      if (url !== shown) return;
      layer.style.backgroundImage = `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.6)),url(${shown})`;
      layer.classList.add("is-ready");
      notify();
    },
    () => {},
  );
}

if (info) {
  run<unknown>("readonly", (s) => s.get(IMAGE_KEY)).then(
    (image) => {
      if (image instanceof Blob) show(image);
      else {
        info = undefined;
        localStorage.removeItem(BACKGROUND);
        flagBackground();
        notify();
      }
    },
    () => {},
  );
}

// --- Store -----------------------------------------------------------------

export const settings: SettingsStore = {
  get: () => current,

  set(patch) {
    current = { ...current, ...patch };
    root.dataset.clock = current.clock;
    writeJSON(SETTINGS, current);
    notify();
  },

  background: () => info,
  backgroundUrl: () => url,

  async setBackground(image, next) {
    await run("readwrite", (s) => s.put(image, IMAGE_KEY));
    info = next;
    writeJSON(BACKGROUND, next);
    flagBackground();
    show(image);
  },

  async clearBackground() {
    await run("readwrite", (s) => s.delete(IMAGE_KEY));
    info = undefined;
    localStorage.removeItem(BACKGROUND);
    flagBackground();
    show();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
