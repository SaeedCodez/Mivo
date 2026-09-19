// Runs synchronously at the end of <body>, so the first paint already has the
// time and the bookmarks. Keep the work in here small: it is on the critical
// path of every new tab.
import { initBookmarks } from "./bookmarks";
import { toUrl } from "./url";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const timeEl = $("time");
const dateEl = $("date");
const greetingEl = $("greeting");

const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

function greeting(hour: number): string {
  if (hour < 5) return "GOOD NIGHT";
  if (hour < 12) return "GOOD MORNING";
  if (hour < 18) return "GOOD AFTERNOON";
  if (hour < 22) return "GOOD EVENING";
  return "GOOD NIGHT";
}

function set(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

let timer = 0;

function tick() {
  const now = new Date();
  set(timeEl, pad(now.getHours()) + ":" + pad(now.getMinutes()));
  set(dateEl, DAYS[now.getDay()] + " · " + now.getDate() + " " + MONTHS[now.getMonth()]);
  set(greetingEl, greeting(now.getHours()));

  // Wake up once per minute, right on the boundary.
  clearTimeout(timer);
  timer = window.setTimeout(tick, 60000 - (now.getTime() % 60000) + 20);
}

tick();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});

// --- Footer meta + bookmarks ------------------------------------------------

const metaEl = $("meta");
let tabCount = 0;
let bookmarkCount = 0;

function renderMeta() {
  const parts: string[] = [];
  if (tabCount) parts.push(tabCount + (tabCount === 1 ? " TAB" : " TABS"));
  if (bookmarkCount) parts.push(bookmarkCount + (bookmarkCount === 1 ? " BOOKMARK" : " BOOKMARKS"));
  set(metaEl, parts.join(" · "));
}

initBookmarks((count) => {
  bookmarkCount = count;
  renderMeta();
});

// Counting tabs needs no permission; it just isn't available on a plain web page.
if (typeof chrome !== "undefined" && chrome.tabs) {
  chrome.tabs.query({}).then((tabs) => {
    tabCount = tabs.length;
    renderMeta();
  });
}

// --- Search ---------------------------------------------------------------

const form = $<HTMLFormElement>("search");
const input = $<HTMLInputElement>("q");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;

  const url = toUrl(value);
  if (url) chrome.tabs.update({ url });
  else chrome.search.query({ text: value, disposition: "CURRENT_TAB" });
});

document.addEventListener("keydown", (e) => {
  const typing = (e.target as HTMLElement).closest("input, textarea, [contenteditable]");
  if (e.key === "/" && !typing && !document.querySelector(".scrim") && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    input.focus();
  } else if (e.key === "Escape" && document.activeElement === input) {
    input.blur();
  }
});
