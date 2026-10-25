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

// ---- chants (contract: output/site_build/W9_CHANTS_CONTRACT.md) -----------------------------------------------------------
// The engine attaches to each day.chants[i]: precedes_reading (index into day.readings), service_order, segments[] (full Armenian verse + KJV),
// review_status. When no full verse is matched only the printed opening appears, with a note.
const CHANT_KIND = { psalm: "Psalm", mesedi: "Mesedi (Մեսեդի)", meseti: "Mesedi (Մեսեդի)", alleluia: "Alleluia", halleluia: "Alleluia", prokeimenon: "Psalm" };
const pre = (c) => (c.precedes_reading != null ? c.precedes_reading : c.precedesReading != null ? c.precedesReading : c.precedes);
function chantsBefore(chants, i, reading, placed) {
  const keys = [reading && reading.citationKey, reading && reading.citationEn, reading && reading.id].filter(Boolean).map(String);
  const out = chants.filter((c) => { const p = pre(c); if (p == null || placed.has(c)) return false; const hit = typeof p === "number" ? p === i : typeof p === "object" ? (p.index === i || keys.includes(String(p.key))) : (String(p) === String(i) && /^\d+$/.test(String(p))) || keys.includes(String(p)); if (hit) placed.add(c); return hit; });
  return out.sort((x, y) => (x.service_order || 0) - (y.service_order || 0));
}
const SEG_ROLE = { incipit: "", kc: "Connecting verse (կց.)", pokh: "Alternate (փոխ.)" };
function renderChantSeg(sg) {
  const refs = [sg.armenian_ref && String(sg.armenian_ref).replace(/ \(Arak29[^)]*\)/, ""), sg.english_ref_kjv && "English numbering: " + sg.english_ref_kjv].filter(Boolean);
  const rv = sg.review_status === "needs_review" || sg.status === "ambiguous" ? chip("review: " + (sg.status === "ambiguous" ? "several verses begin like this" : "pairing not confirmed"), "warn") : "";
  let h = `<div class="chant-seg">${SEG_ROLE[sg.role] ? `<div class="cal-note">${esc(SEG_ROLE[sg.role])}</div>` : ""}`;
  h += `<div class="chant-hy script-original" lang="hy">${esc(sg.armenian_full).replace(/\n/g, "<br>")}</div>`;
  if (sg.english_full) h += `<div class="chant-en">${esc(sg.english_full)} <span class="cal-note">(${esc(String(sg.english_source || "KJV").replace(/ as printed in Arak29.*$/, ""))})</span></div>`;
  return h + `<div class="cal-note">${esc(refs.join(" · "))} ${rv}</div></div>`;
}
function renderChant(c) {
  const kindKey = String(c.kind || "").toLowerCase();
  const review = c.review_status === "needs_review" ? chip("review: position or verse not confirmed", "warn") : "";
  const segs = (c.segments || []).filter((x) => x.armenian_full && (x.status === "matched" || x.status === "ambiguous"));
  let h = `<div class="cal-chant"><div class="chant-head"><span class="chant-kind">${esc(CHANT_KIND[kindKey] || c.kind || "Chant")}</span>${c.psalm ? " " + chip("Psalm " + c.psalm + " (Armenian numbering)") : ""}${c.service ? ` <span class="cal-note">${esc(c.service_label || c.service)}</span>` : ""} ${review}</div>`;
  if (segs.length) h += segs.slice(0, 3).map(renderChantSeg).join("");
  else if (c.armenian_full) h += renderChantSeg({ armenian_full: c.armenian_full, english_full: c.english_full, english_source: c.english_source, armenian_ref: (c.refs || [])[0] });
  else h += `<div class="chant-hy script-original" lang="hy">${esc(c.verbatim || c.incipit || "")}</div><div class="cal-note">Full verse not matched yet; only the printed opening is shown.</div>`;
  return h + `</div>`;
}

// ---- the day's whole canon (contract: output/site_build/H1_CANON_CONTRACT.md; shape assumed until it lands) -----------------
// H1 shape (day-canon/1.0): day.canon = { canons[], parts: [ { part, label, labelHy, status, note, needsReview, candidates[], hymns: [ { hymnId, incipit, mode, page, pagesAll, stanzaIds[] } ] } ], summary }
// Older/other shapes are also accepted: hymns[].stanzas = [ {id, text?} ].
// A stanza is displayed from the corpus by its stanza id (so a later switch of the stanza text keeps working); text carried in
// the record is only a fallback.
const firstPage = (x) => (x && x.page != null ? x.page : x && x.pages && x.pages.length ? x.pages[0] : null);
function canonView(day) {
  const cn = day.canon;
  if (!cn) return null;
  const rawParts = Array.isArray(cn) ? cn : (cn.parts || cn.sequence || cn.sections || []);
  const normSt = (s, hy) => (typeof s === "string" ? { id: s, mode: hy && hy.mode } : { id: s.id || s.stanzaId || s.a, text: s.text || s.armenian || s.reading, mode: s.mode || (hy && hy.mode), type: s.type, page: firstPage(s) });
  const parts = rawParts.map((p, n) => {
    const items = p.hymns || p.items || p.sections || p.stanzas || [];
    const hymns = []; let cur = null;
    items.forEach((it) => {
      const sts = it.stanzaIds || it.stanzas || it.verses;   // H1 (day-canon/1.0): stanzaIds; older/other shapes: stanzas[]
      if (Array.isArray(sts)) { hymns.push({ heading: it.heading || it.subpart || "", incipit: it.incipit || it.title || "", type: it.type || it.printedCategory, mode: it.mode, page: firstPage(it), pagesAll: it.pagesAll || it.pages, hymnId: it.hymnId, stanzas: sts.map((x) => normSt(x, it)) }); cur = null; }
      else if (!it.id && !it.stanzaId && !it.a && !it.text && (it.heading || it.title)) { cur = { heading: it.heading || it.title, page: firstPage(it), stanzas: [] }; hymns.push(cur); }
      else { if (!cur) { cur = { heading: "", stanzas: [] }; hymns.push(cur); } cur.stanzas.push(normSt(it)); }
    });
    const cands = (p.candidates || []).filter((c) => c && (c.page != null || c.startPage != null)).slice(0, 3);
    return { key: p.part || p.key || p.type || "p" + n, label: p.label_en || p.label || p.name || p.type || p.key || "Part " + (n + 1), labelHy: p.labelHy || p.label_hy || p.title_hy || p.title || "", page: firstPage(p) || (hymns.find((x) => x.page != null) || {}).page, hymns, status: p.status || "", note: p.note || "", needsReview: !!p.needsReview, cands };
  });
  return parts.length ? { parts, summary: cn.summary || null } : null;
}
const nStanzas = (p) => p.hymns.reduce((n, hy) => n + hy.stanzas.length, 0);
function canonIndex(cv) {
  return `<nav class="canon-index" aria-label="Parts of the canon">` + cv.parts.map((p, n) => { const c = nStanzas(p); return `<button type="button" class="cal-link${p.needsReview || !p.hymns.length ? " idx-warn" : ""}" data-part="canon-part-${n}">${esc(p.label)} <span>${p.status === "not_applicable" ? "not today" : c ? c + (c === 1 ? " stanza" : " stanzas") : "not located"}</span></button>`; }).join(" ") + `</nav>`;
}
function renderCanonPart(p, n, open) {
  const stChip = p.status === "missing" ? chip("to be confirmed", "warn") : p.status === "from_rubric" ? chip("opening only", "warn") : p.status === "not_applicable" ? chip("not sung today") : p.needsReview ? chip("needs review", "warn") : "";
  const settled = p.hymns.length && p.status !== "missing" && p.status !== "not_applicable";
  let h = `<details class="canon-part" id="canon-part-${n}"${open && settled ? " open" : ""}><summary><strong>${esc(p.label)}</strong>${p.labelHy ? ` <span class="script-original" lang="hy">${esc(p.labelHy)}</span>` : ""}${p.page != null && settled ? ` <span class="cal-note">scan p.${esc(p.page)}</span>` : ""} ${stChip}</summary>`;
  if (!p.hymns.length && p.status !== "not_applicable") h += `<p class="cal-note canon-note">Not located in the Sharagnots for this day.</p>`;
  if (p.note) h += `<p class="cal-note canon-note">${esc(p.note)}</p>`;
  if (p.cands.length) h += `<details class="hy-cands"><summary>Possible places in the book (${p.cands.length}), not a decision</summary><ul>` + p.cands.map((c) => `<li><span class="script-original" lang="hy">${esc(cleanTitle(c.title))}</span> <button type="button" class="cal-link" data-page="${esc(c.page != null ? c.page : c.startPage)}">scan p.${esc(c.page != null ? c.page : c.startPage)}</button></li>`).join("") + `</ul></details>`;
  p.hymns.forEach((hy) => {
    const pg = hy.page != null ? hy.page : (hy.stanzas.find((x) => x.page != null) || {}).page;
    const title = hy.heading || hy.incipit;
    h += `<div class="canon-hymn">${title ? `<h5 class="canon-sub script-original" lang="hy">${esc(cleanTitle(title))}</h5>` : ""}<div class="hy-acts">${pg != null ? `<button type="button" class="cal-link cal-scan" data-page="${esc(pg)}"${hy.pagesAll && hy.pagesAll.length > 1 ? ` title="continues to p.${esc(hy.pagesAll[hy.pagesAll.length - 1])}"` : ""}>View scan &middot; p.${esc(pg)}</button>` : ""}${hy.type ? chip(hy.type) : ""}${hy.mode ? chip("Mode " + hy.mode) : ""}</div>`;
    hy.stanzas.forEach((st) => { h += `<div class="canon-st" data-sid="${esc(st.id || "")}"><div class="canon-hy script-original" lang="hy">${esc(st.text || "")}</div><div class="canon-en"></div></div>`; });
    h += `</div>`;
  });
  return h + `</details>`;
}
function renderCanon(cv) { return canonIndex(cv) + cv.parts.map((p, n) => renderCanonPart(p, n, n === 0)).join(""); }
// Services of the day (W11_SERVICE_MAP.md): which canon parts belong to which service, in the order of the liturgical day.
const SERVICE_PARTS = [
  { id: "midnight", label: "Midnight service", parts: ["orhnutyun"] },
  { id: "morning", label: "Morning service", parts: ["harts", "gordzk", "metsatsutse", "voghormya", "der_hergnits", "mankunk"] },
  { id: "hours", label: "Third, Sixth and Ninth hours", note: "Fixed hours with no canon parts of their own." },
  { id: "liturgy", label: "Divine Liturgy", parts: ["jashoo"], readings: true },
  { id: "evening", label: "Evening service", parts: ["hampartsi"], unconfirmed: "the exact slot of the Hampartsi is unconfirmed" },
  { id: "compline", label: "Compline", note: "Fixed service with no canon parts of its own." },
];
function renderServices(day, cv, readingsHtml, hasJashooReadings) {
  const byKey = new Map(); cv.parts.forEach((p, n) => byKey.set(p.key, { p, n }));
  const used = new Set();
  const dominical = /^sun/i.test(day.weekday || "");
  let h = renderCanonIndexOnly(cv);
  SERVICE_PARTS.forEach((sv) => {
    const mine = (sv.parts || []).map((k) => byKey.get(k)).filter(Boolean);
    mine.forEach((m) => used.add(m.p.key));
    if (!mine.length && !sv.readings && !sv.note) return;
    h += `<div class="svc-block" id="svc-${sv.id}"><h4 class="svc-title">${esc(sv.label)}${sv.unconfirmed ? " " + chip("unconfirmed", "warn") : ""}</h4>`;
    if (sv.note) h += `<p class="cal-note">${esc(sv.note)}</p>`;
    mine.forEach((m, i) => { h += renderCanonPart(m.p, m.n, m.n === 0); });
    if (sv.readings) {
      if (!dominical) h += `<p class="cal-note">These readings (Jashoo) are appointed for the day. On an ordinary weekday there is no Divine Liturgy; on a feast day it is celebrated. ${chip("unconfirmed for this day", "warn")}</p>`;
      h += readingsHtml;
    }
    h += `</div>`;
  });
  const rest = cv.parts.filter((p) => !used.has(p.key));
  if (rest.length) h += `<div class="svc-block"><h4 class="svc-title">Other parts</h4>${rest.map((p) => renderCanonPart(p, byKey.get(p.key).n, false)).join("")}</div>`;
  return h;
}
const renderCanonIndexOnly = (cv) => canonIndex(cv);
let stanzaIndex = null;
function stanzaLookup() {
  const LCS = window.LCS, map = LCS && LCS.anchorMap, corpus = LCS && LCS.corpus && LCS.corpus();
  if (!map || !map.stanza || !corpus) return null;
  return (id) => {
    const m = map.stanza[id]; if (!m) return null;
    const sec = corpus[m[0]]; if (!sec) return null;
    let rem = m[2];
    for (const st of sec.stanzas) { if (rem < st.verses.length) return [st.verses[rem]]; rem -= st.verses.length; }
    return null;
  };
}
async function fillCanon(root) {
  const nodes = [...root.querySelectorAll(".canon-st[data-sid]")].filter((n) => n.getAttribute("data-sid"));
  if (!nodes.length || !window.LCS) return;
  try { await window.LCS.ready; } catch (e) { return; }
  const look = stanzaLookup();
  if (!look) return;
  let ai = {};
  try { const r = await fetch("data/ai-en.json"); if (r.ok) ai = (await r.json()).items || {}; } catch (e) { /* optional */ }
  nodes.forEach((n) => {
    const id = n.getAttribute("data-sid"), vs = look(id);
    if (!vs || !vs.length) return;
    const v = vs[0];
    if (v.text) n.querySelector(".canon-hy").textContent = vs.map((x) => x.text).join(" ");
    let en = "";
    const aiT = ai[id] && (typeof ai[id] === "string" ? ai[id] : ai[id].t);
    if (v.en) en += `<div class="canon-en-src">${esc(vs.map((x) => x.en || "").join(" ").trim())} <span class="cal-note">(Krapar Sharagnots English)</span></div>`;
    if (aiT) en += `<div class="cal-ai"><span class="ai-label" title="Machine translation, not reviewed by a person">AI translation (Claude)</span> ${esc(aiT)}</div>`;
    n.querySelector(".canon-en").innerHTML = en;
  });
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
  h += `<nav class="jumpbar" aria-label="On this page"><button type="button" data-jump="sec-readings">Services, readings &amp; hymns <span>${readings.length}</span></button><button type="button" data-jump="sec-hymns">Hymns <span>${hymns.length}</span></button><button type="button" data-jump="sec-notes">Notes &amp; sources${(day.unresolved || []).length ? " <span>" + day.unresolved.length + "</span>" : ""}</button></nav>`;

  // Readings, with the chants (psalm / mesedi / alleluia) interleaved in service order
  const chants = day.chants || [];
  const placed = new Set();
  let readingsHtml = "", hasJashoo = false;
  if (readings.length) {
    const idx = readings.map((r, i) => i);
    const main = idx.filter((i) => readings[i].service && readings[i].service.class === "jashoo");
    hasJashoo = main.length > 0;
    const rest = idx.filter((i) => main.indexOf(i) < 0);
    const lead = main.length ? main : idx;
    const rdItem = (r, i, open) => `<details class="cal-reading" data-ri="${i}"${open ? " open" : ""}><summary><strong>${esc(r.citationEn || r.citationKey || "")}</strong> <span class="script-original" lang="hy">${esc(r.verbatimArmenian || "")}</span> ${r.service && r.service.label ? chip(r.service.label, r.service.confident ? "" : "warn") : ""}${r.needsPageCheck ? chip("needs page check", "warn") : ""}</summary><div class="cal-reading-body" id="cal-rb-${i}"><p class="cal-note">Loading&hellip;</p></div></details>`;
    const sequence = (list, openFirst) => list.map((i, n) => chantsBefore(chants, i, readings[i], placed).map(renderChant).join("") + rdItem(readings[i], i, n < openFirst)).join("");
    if (main.length) readingsHtml += `<p class="cal-note">Readings of the Divine Liturgy (Jashoo), in service order</p>`;
    readingsHtml += `<div class="cal-readings">` + sequence(lead, 3) + `</div>`;
    if (rest.length && main.length) readingsHtml += `<details class="cal-other"><summary>Other services (${rest.length} reading${rest.length > 1 ? "s" : ""})</summary><div class="cal-readings">` + sequence(rest, 0) + `</div></details>`;
  } else readingsHtml += `<div class="empty-state">No readings are appointed, or none could be resolved, for this day.</div>`;
  const loose = chants.filter((c) => !placed.has(c));
  if (loose.length) readingsHtml += `<details class="cal-other"><summary>Chants not tied to a reading (${loose.length})</summary><div class="cal-chantlist">` + loose.map(renderChant).join("") + `</div></details>`;

  const canon = canonView(day);
  if (canon) {
    // One block per service of the liturgical day, with the whole canon part by part and the readings inside the Divine Liturgy
    h += `<section class="day-sec" id="sec-readings"><h3 class="cal-h">Services of the day</h3><span id="sec-hymns"></span>${renderServices(day, canon, readingsHtml, hasJashoo)}`;
    if (hymns.length) h += `<details class="cal-other"><summary>Hymns named in the Tonatsoyts (${hymns.length})</summary><div class="cal-readings">${renderHymnGroups(day)}</div></details>`;
    h += `</section>`;
  } else {
    h += `<section class="day-sec" id="sec-readings"><h3 class="cal-h">Readings and chants</h3>${readingsHtml}</section>`;
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
  }

  // Notes
  h += `<section class="day-sec" id="sec-notes"><h3 class="cal-h">Notes &amp; sources</h3>`;
  if ((day.unresolved || []).length) h += `<details class="cal-unresolved"><summary>Unresolved or provisional (${day.unresolved.length})</summary><ul>` + day.unresolved.map((u) => `<li><strong>${esc(u.field)}</strong>: ${esc(u.reason)}</li>`).join("") + `</ul></details>`;
  h += `<p class="cal-foot">Computed by the calgen rules from the Tonatsoyts. Schema ${esc(day.schema || "")}. Names marked &ldquo;composed&rdquo; are not published names. Translations marked AI are machine translations that no person has reviewed.</p></section></article>`;
  return h;
}

let curDay = null;
window.LCalendarUI = { renderDay, fillCanon };  // exposed for tests and the other pages
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
  fillCanon(out);
  out.querySelectorAll("[data-part]").forEach((b) => b.addEventListener("click", () => { const d = document.getElementById(b.getAttribute("data-part")); if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); } }));
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
