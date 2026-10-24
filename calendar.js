// Calendar tab: type any date -> the day's commemorations, mode, fasting, readings and appointed hymns.
// The data comes from the calgen-based engine (engine/calendar.mjs, schema "liturgical-day/1.0"); this file is only the UI.
// Hooks for the other workstreams (all optional, see docs/CALENDAR_API.md):
//   window.LCalendarHooks.readingBody(reading, day) -> Promise<string|HTMLElement|null>   (English scripture text, Armenian text, audio)
//   window.LCalendarHooks.afterRender(day, rootElement)
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const hymnalRoot = $("hymnalRoot"), calendarRoot = $("calendarRoot");
const tabs = { hymnal: $("tabHymnal"), calendar: $("tabCalendar") };
let engine = null, enginePromise = null;

function showTab(name, push) {
  const cal = name === "calendar";
  hymnalRoot.hidden = cal;
  calendarRoot.hidden = !cal;
  Object.entries(tabs).forEach(([k, b]) => { b.classList.toggle("active", k === name); b.setAttribute("aria-pressed", k === name ? "true" : "false"); });
  const u = new URL(location.href);
  if (cal) u.searchParams.set("tab", "calendar"); else { u.searchParams.delete("tab"); u.searchParams.delete("date"); }
  if (push !== false) history.replaceState(null, "", u.pathname + u.search + u.hash);
  if (cal && !$("calResult").dataset.rendered) initialDay();
}
window.LCSShowHymnal = () => showTab("hymnal");
tabs.hymnal.addEventListener("click", () => showTab("hymnal"));
tabs.calendar.addEventListener("click", () => showTab("calendar"));

function todayIso() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.getUTCFullYear().toString().padStart(4, "0") + "-" + String(t.getUTCMonth() + 1).padStart(2, "0") + "-" + String(t.getUTCDate()).padStart(2, "0");
}

async function getEngine() {
  if (engine) return engine;
  if (!enginePromise) {
    enginePromise = import("./engine/calendar.mjs").then((mod) => mod.createCalendar({
      baseUrl: new URL("engine/", location.href).href,
      dataUrl: new URL("data/calendar/", location.href).href,
    })).then((e) => (engine = e));
  }
  return enginePromise;
}

function chip(text, cls) { return `<span class="cal-chip ${cls || ""}">${esc(text)}</span>`; }

function renderHymn(h, i) {
  const links = (h.links || []).map((l, j) => {
    const label = (l.incipit || "").slice(0, 60) + (l.pages && l.pages.length ? " (p." + l.pages[0] + ")" : "");
    return `<button type="button" class="cal-link" data-hymn-id="${esc(l.hymnId)}" data-page="${esc((l.pages && l.pages[0]) || "")}">${esc(label)}</button>`;
  }).join(" ");
  const st = h.status === "linked_high" ? "" : chip(h.status.replace(/_/g, " "), "warn");
  return `<li><span class="script-original" lang="hy">${esc(h.incipit)}</span> ${h.type ? chip(h.type) : ""} ${h.mode ? chip("Mode " + h.mode) : ""} ${st}
    ${links ? `<div class="cal-links">${links}</div>` : ""}${h.note ? `<div class="cal-note">${esc(h.note)}</div>` : ""}<div class="cal-hymn-ai" id="cal-hai-${i}"></div></li>`;
}

function renderDay(day) {
  if (day.error) return `<div class="empty-state">${esc(day.error)}</div>`;
  let h = `<article class="reading-card cal-day" data-date="${esc(day.date)}">`;
  h += `<div class="reading-category">${esc(day.weekday || "")} &middot; ${esc(day.date)}${day.provisional ? " &middot; " + chip("some rules provisional", "warn") : ""} <button type="button" class="cal-link" id="calShare">Copy link to this day</button></div>`;
  (day.commemorations || []).forEach((c) => {
    h += `<div class="cal-comm"><div class="reading-heading script-original" lang="hy">${esc(c.armenian || c.bookHeadingArmenian || "")}</div>`;
    if (c.english) h += `<div class="reading-heading-en">${esc(c.english)} ${c.englishStatus && c.englishStatus !== "sourced" ? chip("composed name", "warn") : chip("published name")}</div>`;
    if (c.role) h += `<div class="cal-note">${esc(c.role)}${c.ruleStatus ? " &middot; rule: " + esc(c.ruleStatus) : ""}</div>`;
    h += `</div>`;
  });
  if (!(day.commemorations || []).length) h += `<div class="empty-state">No commemoration could be derived for this day.</div>`;
  h += `<div class="ornament">֍</div>`;
  h += `<div class="cal-facts">`;
  if (day.mode) h += chip("Mode of the day: " + (day.mode.armenian || day.mode.number));
  if (day.fasting) h += chip(day.fasting.label + (day.fasting.name ? " (" + day.fasting.name + ")" : ""), day.fasting.provisional ? "warn" : "");
  if (day.easter) h += chip("Easter " + day.easter);
  h += `</div>`;

  h += `<h3 class="cal-h">Readings</h3>`;
  if ((day.readings || []).length) {
    const rdItem = (r, i) => `<li class="cal-reading" data-ri="${i}"><div><strong>${esc(r.citationEn || r.citationKey || "")}</strong> <span class="script-original" lang="hy">${esc(r.verbatimArmenian || "")}</span> ${r.service && r.service.label ? chip(r.service.label, r.service.confident ? "" : "warn") : ""} ${r.needsPageCheck ? chip("needs page check", "warn") : ""}</div>
        <div class="cal-reading-body" id="cal-rb-${i}"></div></li>`;
    const idx = day.readings.map((r, i) => i);
    const main = idx.filter((i) => day.readings[i].service && day.readings[i].service.class === "jashoo");
    const rest = idx.filter((i) => main.indexOf(i) < 0);
    const showAll = !main.length;
    if (main.length) h += `<div class="cal-note">Divine Liturgy (Jashoo) readings</div>`;
    h += `<ul class="cal-readings">` + (showAll ? idx : main).map((i) => rdItem(day.readings[i], i)).join("") + `</ul>`;
    if (rest.length && !showAll) {
      h += `<button type="button" class="nav-btn" id="calShowAll" aria-expanded="false">Show all other readings of the day (${rest.length})</button>`;
      h += `<ul class="cal-readings" id="calOtherReadings" hidden>` + rest.map((i) => rdItem(day.readings[i], i)).join("") + `</ul>`;
    }
  } else h += `<div class="empty-state">No readings are appointed or none could be resolved for this day.</div>`;

  if ((day.chants || []).length) {
    h += `<h3 class="cal-h">Chants and psalms</h3><ul class="cal-chants">` + day.chants.map((c) => `<li>${esc(c.kind || "")} ${esc(c.service || "")} <span class="script-original" lang="hy">${esc(c.verbatim || c.incipit || "")}</span></li>`).join("") + `</ul>`;
  }
  h += `<h3 class="cal-h">Hymns appointed (Sharagnots)</h3>`;
  if ((day.hymns || []).length) h += `<ul class="cal-hymns">` + day.hymns.map(renderHymn).join("") + `</ul>`;
  else h += `<div class="empty-state">The book names no hymns for this day.</div>`;
  if ((day.canons || []).length) {
    h += `<h3 class="cal-h">Canons</h3><ul class="cal-canons">` + day.canons.map((c) => `<li><span class="script-original" lang="hy">${esc(c.canonTitle || "")}</span> ${c.mapped ? "" : chip("not mapped", "warn")}
      ${(c.sections || []).map((s) => `<button type="button" class="cal-link" data-page="${esc((s.pages && s.pages[0]) || "")}">scan p.${esc((s.pages && s.pages[0]) || "?")}</button>`).join(" ")}</li>`).join("") + `</ul>`;
  }
  if ((day.unresolved || []).length) {
    h += `<details class="cal-unresolved"><summary>Unresolved or provisional (${day.unresolved.length})</summary><ul>` + day.unresolved.map((u) => `<li><strong>${esc(u.field)}</strong>: ${esc(u.reason)}</li>`).join("") + `</ul></details>`;
  }
  h += `<p class="cal-foot">Computed by the calgen rules from the Tonatsoyts. Schema ${esc(day.schema || "")}.</p></article>`;
  return h;
}

async function showDay(input, push) {
  const out = $("calResult");
  out.dataset.rendered = "1";
  out.innerHTML = '<div class="empty-state">Computing&hellip;</div>';
  let eng;
  try { eng = await getEngine(); }
  catch (e) {
    out.innerHTML = '<div class="empty-state">The calendar engine could not be loaded (' + esc(e && e.message ? e.message : e) + "). The Hymnal tab still works.</div>";
    return;
  }
  const day = eng.resolveDay(input);
  out.innerHTML = renderDay(day);
  if (day.civil && day.date) {
    $("calDate").value = day.date; $("calDateText").value = day.date;
    if (push !== false) { const u = new URL(location.href); u.searchParams.set("tab", "calendar"); u.searchParams.set("date", day.date); history.replaceState(null, "", u.pathname + u.search + u.hash); }
  }
  const hooks = window.LCalendarHooks || {};
  if (hooks.readingBody) {
    (day.readings || []).forEach(async (r, i) => {
      const slot = document.getElementById("cal-rb-" + i);
      try {
        const body = await hooks.readingBody(r, day);
        if (body && slot) { if (typeof body === "string") slot.innerHTML = body; else slot.appendChild(body); }
      } catch (e) { if (slot) slot.innerHTML = '<span class="cal-note">Reading text unavailable.</span>'; }
    });
  }
  if (hooks.hymnExtra) {
    (day.hymns || []).forEach(async (h, i) => {
      const slot = document.getElementById("cal-hai-" + i);
      try { const html = await hooks.hymnExtra(h); if (slot && html) slot.innerHTML = html; } catch (e) { /* optional */ }
    });
  }
  const sa = $("calShowAll");
  if (sa) sa.addEventListener("click", () => { const o = $("calOtherReadings"); o.hidden = !o.hidden; sa.setAttribute("aria-expanded", String(!o.hidden)); sa.textContent = o.hidden ? sa.textContent.replace("Hide", "Show") : sa.textContent.replace("Show", "Hide"); });
  const sh = $("calShare");
  if (sh) sh.addEventListener("click", () => { const u = new URL(location.href); u.searchParams.set("tab", "calendar"); u.searchParams.set("date", day.date); const t = u.toString(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { sh.textContent = "Link copied"; }).catch(() => { window.prompt("Copy this link", t); }); });
  if (hooks.afterRender) hooks.afterRender(day, out);
}

$("calForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const typed = $("calDateText").value.trim() || $("calDate").value;
  showDay(typed || todayIso());
});
$("calDate").addEventListener("change", () => { $("calDateText").value = $("calDate").value; if ($("calDate").value) showDay($("calDate").value); });
$("calPrev").addEventListener("click", () => showDay(addDays($("calDate").value || todayIso(), -1)));
$("calNext").addEventListener("click", () => showDay(addDays($("calDate").value || todayIso(), 1)));
$("calToday").addEventListener("click", () => showDay(todayIso()));
calendarRoot.addEventListener("click", (ev) => {
  const b = ev.target.closest && ev.target.closest(".cal-link");
  if (!b) return;
  const hid = b.getAttribute("data-hymn-id");
  if (hid && window.LCS && window.LCS.openByHymnId(hid)) return;
  const page = b.getAttribute("data-page");
  if (page && window.ScanViewer) window.ScanViewer.show(page, null, b);
});
function initialDay() {
  const q = new URL(location.href).searchParams.get("date");
  showDay(q || todayIso(), false);
}
const qs = new URL(location.href).searchParams;
const wantHymnal = qs.get("tab") === "hymnal" || location.hash.length > 1 || qs.get("scan");
if (!wantHymnal) showTab("calendar", false);
