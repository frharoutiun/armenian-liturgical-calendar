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
  if (push !== false) window.scrollTo(0, 0);
}
// Search is reachable from every page: the top-bar box opens the Hymnal and runs the existing corpus search.
function goSearch(q) {
  showTab("hymnal");
  const si = $("searchInput"), panel = $("searchPanel"), tg = $("searchToggle");
  if (panel && panel.hidden && tg) tg.click();
  if (!si) return;
  si.value = q || "";
  si.dispatchEvent(new Event("input", { bubbles: true }));
  si.scrollIntoView({ block: "center" });
  si.focus();
}
$("globalSearchForm").addEventListener("submit", (ev) => { ev.preventDefault(); goSearch($("globalSearch").value.trim()); });
document.addEventListener("click", (ev) => {
  const a = ev.target.closest && ev.target.closest("[data-goto]");
  if (!a) return;
  ev.preventDefault();
  if (a.getAttribute("data-goto") === "search") { window.scrollTo(0, 0); $("globalSearch").focus(); }
  else showTab(a.getAttribute("data-goto"));
});
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

// ---- hymns -------------------------------------------------------------------------------------------
// Accepts the resolver's new shape (h.resolved = {hymnId, sectionId, sectionTitle, page, ...}, h.candidates) and the old one
// (h.links[] with pages[]). A hymn is shown with ONE scan page only when it is resolved; otherwise it is flagged for review
// and the possible matches are kept behind a toggle (never as equal page numbers).
const cleanTitle = (t) => String(t || "").replace(/\s*\n\s*/g, " ").trim();
function hymnView(h) {
  const r = h.resolved || null;
  const links = h.links || [];
  const first = (x) => (x && x.page != null ? x.page : x && x.pages && x.pages.length ? x.pages[0] : null);
  let chosen = null;
  if (r && first(r) != null) chosen = { hymnId: r.hymnId, sectionId: r.sectionId, sectionTitle: cleanTitle(r.sectionTitle), page: first(r), incipit: r.incipit, basis: r.basis, confidence: r.confidence };
  else if (!r && links.length >= 1 && /^linked/.test(h.status || "") && first(links[0]) != null) { const l = links[0]; chosen = { hymnId: l.hymnId, sectionId: l.sectionId, sectionTitle: cleanTitle(l.sectionTitle), page: first(l), incipit: l.incipit }; }
  const rawC = (h.candidates && h.candidates.length ? h.candidates : links) || [];
  const candidates = rawC.filter((c) => !chosen || c.hymnId !== chosen.hymnId).slice(0, 5).map((c) => ({ hymnId: c.hymnId, sectionTitle: cleanTitle(c.sectionTitle), incipit: c.incipit, page: first(c) }));
  const weak = chosen && (h.status === "linked_medium" || (chosen.confidence != null && chosen.confidence < 0.8));
  return { chosen, candidates, weak, review: !chosen };
}
function renderHymn(h, i) {
  const v = hymnView(h);
  const meta = `${h.type ? chip(h.type) : ""}${h.mode ? chip("Mode " + h.mode) : ""}`;
  let acts = "", badge = "";
  if (v.chosen) {
    acts += `<button type="button" class="cal-link cal-scan" data-page="${esc(v.chosen.page)}" title="Open this page of the Sharagnots scan">View scan &middot; p.${esc(v.chosen.page)}</button>`;
    if (v.chosen.hymnId) acts += ` <button type="button" class="cal-link" data-hymn-id="${esc(v.chosen.hymnId)}" data-page="${esc(v.chosen.page)}">Open hymn text</button>`;
    if (v.weak) badge = chip("check match", "warn");
  } else badge = chip("needs review", "warn");
  let cand = "";
  if (v.review) {
    cand = h.note && !v.candidates.length ? `<div class="cal-note">${esc(h.note)}</div>` : "";
    if (v.candidates.length) cand = `<details class="hy-cands"><summary>Possible matches (${v.candidates.length}), not a decision</summary><ul>` + v.candidates.map((c) => `<li><span class="script-original" lang="hy">${esc((c.incipit || "").slice(0, 70))}</span> ${c.page != null ? `<button type="button" class="cal-link" data-page="${esc(c.page)}">scan p.${esc(c.page)}</button>` : ""}${c.sectionTitle ? ` <span class="cal-note">${esc(c.sectionTitle)}</span>` : ""}</li>`).join("") + `</ul></details>`;
  }
  return `<li class="hy-row${v.review ? " hy-review" : ""}"><div class="hy-main"><span class="script-original hy-inc" lang="hy">${esc(h.incipit)}</span><span class="hy-meta">${meta}${badge}</span></div>
    ${acts ? `<div class="hy-acts">${acts}</div>` : ""}${cand}<div class="cal-hymn-ai" id="cal-hai-${i}"></div></li>`;
}
function renderHymnGroups(day) {
  const hymns = day.hymns || [];
  const secTitle = {};
  (day.sharagnots || []).forEach((s) => { if (s && s.sectionId) secTitle[s.sectionId] = cleanTitle(s.sectionTitle || s.title); });
  const groups = [], byKey = new Map();
  hymns.forEach((h, i) => {
    const v = hymnView(h);
    const key = v.chosen ? (v.chosen.sectionId || v.chosen.sectionTitle || "?") : "__review";
    if (!byKey.has(key)) { const g = { key, title: v.chosen ? (secTitle[v.chosen.sectionId] || v.chosen.sectionTitle || "Sharagnots") : "To be confirmed", review: !v.chosen, items: [] }; byKey.set(key, g); groups.push(g); }
    byKey.get(key).items.push(renderHymn(h, i));
  });
  groups.sort((a, b) => (a.review - b.review));
  return groups.map((g) => `<div class="hy-group${g.review ? " hy-group-review" : ""}"><h4 class="hy-group-title">${g.review ? esc(g.title) : '<span class="script-original" lang="hy">' + esc(g.title) + "</span>"}${g.review ? ' <span class="cal-note">The book names these hymns, but the Sharagnots page is not settled yet.</span>' : ""}</h4><ul class="cal-hymns">${g.items.join("")}</ul></div>`).join("");
}

// ---- day page -----------------------------------------------------------------------------------------
function renderDay(day) {
  if (day.error) return `<div class="empty-state">${esc(day.error)}</div>`;
  const comms = [], seen = new Set();
  (day.commemorations || []).forEach((c) => { const k = [c.armenian || c.bookHeadingArmenian, c.english, c.role].join("|"); if (!seen.has(k)) { seen.add(k); comms.push(c); } });
  const readings = day.readings || [];
  const hymns = day.hymns || [];
  let h = `<article class="cal-day" data-date="${esc(day.date)}">`;
  h += `<header class="day-head"><div class="day-date">${esc(day.weekday || "")} &middot; ${esc(day.date)}${day.provisional ? " " + chip("some rules provisional", "warn") : ""}
    <button type="button" class="cal-link" id="calShare">Copy link to this day</button></div>`;
  comms.forEach((c) => {
    h += `<div class="cal-comm"><div class="day-title script-original" lang="hy">${esc(c.armenian || c.bookHeadingArmenian || "")}</div>`;
    if (c.english) h += `<div class="day-title-en">${esc(c.english)} ${c.englishStatus && c.englishStatus !== "sourced" ? chip("composed name", "warn") : ""}</div>`;
    h += `</div>`;
  });
  if (!comms.length) h += `<div class="empty-state">No commemoration could be derived for this day.</div>`;
  h += `<div class="cal-facts">`;
  if (day.mode) h += chip("Mode of the day: " + (day.mode.armenian || day.mode.number));
  if (day.fasting) h += chip("Fasting: " + day.fasting.label + (day.fasting.name ? " (" + day.fasting.name + ")" : ""), day.fasting.provisional ? "warn" : "");
  if (day.easter) h += chip("Easter " + day.easter);
  h += `</div></header>`;
  const nHyReview = hymns.filter((x) => hymnView(x).review).length;
  h += `<nav class="jumpbar" aria-label="On this page"><button type="button" data-jump="sec-readings">Readings <span>${readings.length}</span></button><button type="button" data-jump="sec-hymns">Hymns <span>${hymns.length}</span></button><button type="button" data-jump="sec-notes">Notes &amp; sources${(day.unresolved || []).length ? " <span>" + day.unresolved.length + "</span>" : ""}</button></nav>`;

  // Readings
  h += `<section class="day-sec" id="sec-readings"><h3 class="cal-h">Readings</h3>`;
  if (readings.length) {
    const idx = readings.map((r, i) => i);
    const main = idx.filter((i) => readings[i].service && readings[i].service.class === "jashoo");
    const rest = idx.filter((i) => main.indexOf(i) < 0);
    const lead = main.length ? main : idx;
    const rdItem = (r, i, open) => `<details class="cal-reading" data-ri="${i}"${open ? " open" : ""}><summary><strong>${esc(r.citationEn || r.citationKey || "")}</strong> <span class="script-original" lang="hy">${esc(r.verbatimArmenian || "")}</span> ${r.service && r.service.label ? chip(r.service.label, r.service.confident ? "" : "warn") : ""}${r.needsPageCheck ? chip("needs page check", "warn") : ""}</summary><div class="cal-reading-body" id="cal-rb-${i}"><p class="cal-note">Loading&hellip;</p></div></details>`;
    if (main.length) h += `<p class="cal-note">Divine Liturgy (Jashoo) readings</p>`;
    h += `<div class="cal-readings">` + lead.map((i, n) => rdItem(readings[i], i, n < 3)).join("") + `</div>`;
    if (rest.length && main.length) h += `<details class="cal-other"><summary>Other readings of the day (${rest.length})</summary><div class="cal-readings">` + rest.map((i) => rdItem(readings[i], i, false)).join("") + `</div></details>`;
  } else h += `<div class="empty-state">No readings are appointed, or none could be resolved, for this day.</div>`;
  if ((day.chants || []).length) h += `<details class="cal-other"><summary>Psalms and chants (${day.chants.length})</summary><ul class="cal-chants">` + day.chants.map((c) => `<li>${esc(c.kind || "")} ${esc(c.service || "")} <span class="script-original" lang="hy">${esc(c.verbatim || c.incipit || "")}</span></li>`).join("") + `</ul></details>`;
  h += `</section>`;

  // Hymns
  h += `<section class="day-sec" id="sec-hymns"><h3 class="cal-h">Hymns appointed (Sharagnots)</h3>`;
  if (hymns.length) {
    if (nHyReview) h += `<p class="cal-note">${hymns.length - nHyReview} of ${hymns.length} hymns have a settled Sharagnots page; ${nHyReview} need review.</p>`;
    h += renderHymnGroups(day);
  } else h += `<div class="empty-state">The book names no hymns for this day.</div>`;
  if ((day.canons || []).length) {
    h += `<h4 class="hy-group-title">Canons named by the book</h4><ul class="cal-canons">` + day.canons.map((c) => `<li><span class="script-original" lang="hy">${esc(c.canonTitle || "")}</span> ${c.mapped ? "" : chip("not mapped", "warn")}
      ${(c.sections || []).slice(0, 1).map((s) => `<button type="button" class="cal-link" data-page="${esc((s.pages && s.pages[0]) || "")}">scan p.${esc((s.pages && s.pages[0]) || "?")}</button>`).join(" ")}</li>`).join("") + `</ul>`;
  }
  h += `</section>`;

  // Notes
  h += `<section class="day-sec" id="sec-notes"><h3 class="cal-h">Notes &amp; sources</h3>`;
  if ((day.unresolved || []).length) h += `<details class="cal-unresolved"><summary>Unresolved or provisional (${day.unresolved.length})</summary><ul>` + day.unresolved.map((u) => `<li><strong>${esc(u.field)}</strong>: ${esc(u.reason)}</li>`).join("") + `</ul></details>`;
  h += `<p class="cal-foot">Computed by the calgen rules from the Tonatsoyts. Schema ${esc(day.schema || "")}. Names marked &ldquo;composed&rdquo; are not published names. Translations marked AI are machine translations that no person has reviewed.</p></section></article>`;
  return h;
}

let curDay = null;
function loadReading(i) {
  const hooks = window.LCalendarHooks || {};
  const slot = document.getElementById("cal-rb-" + i);
  if (!slot || slot.dataset.loaded || !hooks.readingBody || !curDay) return;
  slot.dataset.loaded = "1";
  Promise.resolve().then(() => hooks.readingBody(curDay.readings[i], curDay)).then((body) => {
    slot.innerHTML = "";
    if (body) { if (typeof body === "string") slot.innerHTML = body; else slot.appendChild(body); }
  }).catch(() => { slot.innerHTML = '<span class="cal-note">Reading text unavailable.</span>'; });
}

async function showDay(input, push) {
  const out = $("calResult");
  out.dataset.rendered = "1";
  out.innerHTML = '<div class="empty-state">Computing&hellip;</div>';
  let eng;
  try { eng = await getEngine(); }
  catch (e) {
    out.innerHTML = '<div class="empty-state">The calendar engine could not be loaded (' + esc(e && e.message ? e.message : e) + "). The Hymnal still works.</div>";
    return;
  }
  const day = eng.resolveDay(input);
  curDay = day;
  out.innerHTML = renderDay(day);
  if (day.civil && day.date) {
    $("calDate").value = day.date; $("calDateText").value = day.date;
    if (push !== false) { const u = new URL(location.href); u.searchParams.set("tab", "calendar"); u.searchParams.set("date", day.date); history.replaceState(null, "", u.pathname + u.search + u.hash); }
  }
  const hooks = window.LCalendarHooks || {};
  out.querySelectorAll("details.cal-reading").forEach((d) => {
    const i = +d.getAttribute("data-ri");
    if (d.open) loadReading(i);
    d.addEventListener("toggle", () => { if (d.open) loadReading(i); });
  });
  if (hooks.hymnExtra) {
    (day.hymns || []).forEach(async (h, i) => {
      const slot = document.getElementById("cal-hai-" + i);
      try { const html = await hooks.hymnExtra(h); if (slot && html) slot.innerHTML = html; } catch (e) { /* optional */ }
    });
  }
  out.querySelectorAll("[data-jump]").forEach((b) => b.addEventListener("click", () => { const t = document.getElementById(b.getAttribute("data-jump")); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }));
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
showTab(wantHymnal ? "hymnal" : "calendar", false);
