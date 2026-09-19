// Runs synchronously at the end of <body>, so the first paint already has the
// correct time. Keep this file tiny: it is on the critical path of every new tab.

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

// --- Search ---------------------------------------------------------------

const form = $<HTMLFormElement>("search");
const input = $<HTMLInputElement>("q");

const HAS_SCHEME = /^([a-z][a-z\d+.-]*:\/\/|about:)/i;
const LOOKS_LIKE_HOST =
  /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z\d-]+\.)+[a-z]{2,})(:\d+)?([/?#]\S*)?$/i;

function toUrl(value: string): string | null {
  if (HAS_SCHEME.test(value)) return value;
  if (LOOKS_LIKE_HOST.test(value)) {
    const local = /^(localhost|\d)/i.test(value);
    return (local ? "http://" : "https://") + value;
  }
  return null;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;

  const url = toUrl(value);
  if (url) chrome.tabs.update({ url });
  else chrome.search.query({ text: value, disposition: "CURRENT_TAB" });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== input && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    input.focus();
  } else if (e.key === "Escape" && document.activeElement === input) {
    input.blur();
  }
});
