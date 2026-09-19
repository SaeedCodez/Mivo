import type { Bookmark } from "./types";
import { monogram } from "./url";

/**
 * The 40x40 grid of small icons shown on folder tiles and folder previews:
 * up to 4 icons, or 3 icons plus a "+N" tile when there are 5 or more.
 */
export function buildMinis(members: readonly Bookmark[]): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "minis";

  const overflow = members.length > 4;
  const shown = overflow ? members.slice(0, 3) : members;

  for (const b of shown) {
    const mini = document.createElement("span");
    mini.className = "mini";
    if (b.icon) {
      const img = new Image(18, 18);
      img.src = b.icon;
      img.alt = "";
      img.draggable = false;
      mini.append(img);
    } else {
      mini.textContent = monogram(b.name);
    }
    grid.append(mini);
  }

  if (overflow) {
    const more = document.createElement("span");
    more.className = "mini mini-more";
    more.textContent = "+" + (members.length - 3);
    grid.append(more);
  }
  return grid;
}
