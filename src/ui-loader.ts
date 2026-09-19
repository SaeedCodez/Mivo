import type { UI } from "./types";

// ui.js (dialogs, menus, the Settings screen) is not needed to paint the new tab,
// so it is fetched after the first paint, or on the first interaction.
let load: Promise<UI> | undefined;

export function loadUI(): Promise<UI> {
  load ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "ui.js";
    script.onload = () => resolve(window.mivoUI!);
    script.onerror = () => {
      load = undefined;
      reject(new Error("Could not load ui.js"));
    };
    document.head.append(script);
  });
  return load;
}

export const withUI = (run: (ui: UI) => void) => void loadUI().then(run, () => {});

/** Warms the bundle up once the page has painted, so the first click is instant. */
export function warmUI() {
  const warm = () => void loadUI().catch(() => {});
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 2000 });
  else setTimeout(warm, 500);
}
