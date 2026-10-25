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

// L2: warnings are not chips any more. A "warn" chip becomes one small amber dot (tooltip = the text) and is recorded in `flags`,
// which the day's single status line lists with its explanation; plain chips are quiet metadata text.
let flags = [];
function dot(kind, text) { return `<span class="dot dot-${kind}" role="img" aria-label="${esc(text)}" title="${esc(text)}" tabindex="0"></span>`; }
function chip(text, cls) {
  if (cls === "warn") { flags.push(String(text)); return dot("warn", text); }
  return `<span class="meta-t">${esc(text)}</span>`;
}

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
// Generic chants ("մարտիրոսաց ՚ի ձայնէն"): the verse is the Zhamagirk's generic entry for the category in the mode of the day (generic-chants.mjs).
let genericTable = null, genericMod = null, genericCtx = {};
async function ensureGeneric() {
  if (genericTable) return;
  try { genericMod = await import("./generic-chants.mjs"); const r = await fetch("data/calendar/generic_chants.json"); genericTable = r.ok ? await r.json() : null; } catch (e) { /* the page then says the table could not be loaded */ }
}
const SEG_ROLE = { incipit: "", kc: "Connecting verse (կց.)", pokh: "Alternate (փոխ.)" };
// A verse is shown only when the incipit names ONE verse. Several candidates or none: the printed opening only, never a guessed verse.
function chantSourceLabel(sg) {
  const src = String(sg.armenian_source || "");
  if (/Ժամագիրք|Zhamagirk/i.test(src)) return "Sung wording: Zhamagirk";
  if (/Jashots/i.test(src)) return "Jashots wording (transcription, not yet proofread)";
  if (/Arak29/i.test(src)) return "1895 Bible text (Arak29)";
  return "";
}
function renderGenericSeg(sg, c) {
  const printed = `<div class="chant-hy chant-opening script-original" lang="hy">${esc(sg.incipit || (c && c.verbatim) || "")}</div>`;
  const res = genericMod && genericTable ? genericMod.resolveGeneric(sg.generic, Object.assign({}, genericCtx, { recordOrdinal: c && c.recordOrdinal }), genericTable) : null;
  if (!res) return `<div class="chant-seg chant-unsettled">${printed}<div class="cal-note">${chip("generic verse", "warn")} The verse is the Zhamagirk's generic entry for the category in the mode of the day; the table could not be loaded.</div></div>`;
  const inp = res.inputs;
  const why = `<details class="cal-other"><summary>Why this verse</summary><ul><li>Category: ${esc(inp.category || "not determined")}${inp.category ? " (" + esc(inp.category_basis) + (inp.category_confidence != null ? ", confidence " + esc(inp.category_confidence) : "") + ")" : ""}${(inp.category_alternatives || []).length ? "; alternatives: " + esc(inp.category_alternatives.join(", ")) : ""}</li><li>Commemoration carrying the chant: ${esc(inp.commemoration || "not identified")}</li><li>Mode of the day: ${esc(inp.mode || "not determined")}${inp.mode_basis ? " (" + esc(inp.mode_basis) + ")" : ""}</li></ul></details>`;
  if (res.status !== "resolved") return `<div class="chant-seg chant-unsettled">${printed}<div class="cal-note">${chip("generic verse (Zhamagirk)", "warn")} ${esc(res.why)}.</div>${why}</div>`;
  const ROLE = { alt: "Alternative verse (կամ.)", pokh: "Alternate (փոխ.)" };
  let h = `<div class="chant-seg">${printed}`;
  res.entries.forEach((e) => {
    h += `<div class="chant-gen-entry">${ROLE[e.role] ? `<div class="cal-note">${ROLE[e.role]}</div>` : ""}<div class="hy-en"><div class="hy-col"><div class="chant-hy script-original" lang="hy">${esc(e.armenian_full)}</div></div>`;
    h += e.english_full ? `<div class="en-col"><div class="chant-en">${esc(e.english_full)} <span class="cal-note">(KJV)</span></div></div></div>` : `<div class="en-col"><div class="cal-note">No sourced English for this verse yet.</div></div></div>`;
    const refs = [e.arak29_ref && "Armenian numbering: " + e.arak29_ref, e.english_ref_kjv && "English numbering: " + e.english_ref_kjv].filter(Boolean);
    if (refs.length) h += `<div class="cal-note">${esc(refs.join(" · "))}</div>`;
    if (e.pointer_to) h += `<div class="cal-note">The Zhamagirk prints only the opening here and refers to the verse above (mode ${esc(e.pointer_to.mode)}).</div>`;
    h += `</div>`;
  });
  h += `<div class="cal-note">${esc(res.provenance)} ${res.review_status === "needs_review" ? chip("check: category inferred", "warn") : ""}</div>${why}</div>`;
  return h;
}
function renderChantSeg(sg, c) {
  if (sg.status === "generic") return renderGenericSeg(sg, c);
  const role = SEG_ROLE[sg.role] ? `<div class="cal-note">${esc(SEG_ROLE[sg.role])}</div>` : "";
  const opening = `<div class="chant-hy chant-opening script-original" lang="hy">${esc(sg.incipit || sg.armenian_full || "")}</div>`;
  if (sg.status === "ambiguous") {
    const alts = (sg.alternatives || []).filter(Boolean);
    return `<div class="chant-seg chant-unsettled">${role}${opening}<div class="cal-note">${chip("verse not settled", "warn")} Several verses begin like this, so the full verse is not shown.</div>${alts.length ? `<details class="cal-other"><summary>Possible verses (not a decision)</summary><ul>${alts.map((x) => `<li class="script-original" lang="hy">${esc(x)}</li>`).join("")}</ul></details>` : ""}</div>`;
  }
  if (sg.status !== "matched" || !sg.armenian_full) {
    return `<div class="chant-seg chant-unsettled">${role}${opening}<div class="cal-note">${chip("verse not yet matched", "warn")} Only the printed opening is shown.${sg.note ? " " + esc(sg.note) : ""}</div></div>`;
  }
  const refs = [sg.armenian_ref && String(sg.armenian_ref).replace(/ \(Arak29[^)]*\)/, ""), sg.english_ref_kjv && "English numbering: " + sg.english_ref_kjv].filter(Boolean);
  const rv = sg.review_status === "needs_review" ? chip("check: " + (sg.note ? "numbering differs" : "pairing not confirmed"), "warn") : "";
  let h = `<div class="chant-seg">${role}`;
  h += `<div class="hy-en"><div class="hy-col"><div class="chant-hy script-original" lang="hy">${esc(sg.armenian_full).replace(/\n/g, "<br>")}</div></div>`;
  if (sg.english_full) h += `<div class="en-col"><div class="chant-en">${esc(sg.english_full)} <span class="cal-note">(${esc(String(sg.english_source || "KJV").replace(/ as printed in Arak29.*$/, ""))})</span></div></div></div>`;
  else h += `<div class="en-col"><div class="cal-note">No sourced English for this verse yet.</div></div></div>`;
  const lab = chantSourceLabel(sg);
  h += `<div class="cal-note">${esc([lab].concat(refs).filter(Boolean).join(" · "))} ${rv}</div>`;
  if (sg.note) h += `<div class="cal-note">${esc(sg.note)}</div>`;
  if (sg.armenian_note) h += `<div class="cal-note">${esc(sg.armenian_note)}</div>`;
  if (sg.armenian_bible_differs && sg.armenian_bible_full) h += `<details class="cal-other"><summary>The 1895 Bible words this verse differently</summary><div class="script-original" lang="hy">${esc(sg.armenian_bible_full)}</div></details>`;
  return h + `</div>`;
}
// The Alleluia line a chant opens with (Fr. Arshen's Lectionary rule, see R1_CHANT_OPENINGS.md): its own line above the verse, Armenian in the
// Armenian column and English in the English column; kept apart from the sourced verse text. Nothing is shown when the rule does not apply.
function renderOpening(o) {
  if (!o || !o.applies || !(o.armenian_prefix || o.english_prefix)) return "";
  const unconf = o.review_status === "unconfirmed";
  const label = `Alleluia line (rule ${esc(o.rule_id || "")})${unconf ? " &middot; unconfirmed" : ""}`;
  const tip = esc([o.evidence, unconf ? "Unconfirmed: the rule is a rubric only for this kind of chant." : ""].filter(Boolean).join(" "));
  if (unconf) flags.push("Alleluia line (rule " + (o.rule_id || "") + ") is unconfirmed");
  return `<div class="hy-en chant-open" title="${tip}"><div class="hy-col"><div class="cal-note chant-open-label">${label}${o.evidence ? ` <details class="chant-open-ev"><summary>why</summary><span>${esc(o.evidence)}</span></details>` : ""}</div><div class="chant-prefix script-original" lang="hy">${esc(o.armenian_prefix || "")}</div></div><div class="en-col"><div class="chant-prefix chant-prefix-en">${esc(o.english_prefix || "")}</div></div></div>`;
}
function renderChant(c) {
  const kindKey = String(c.kind || "").toLowerCase();
  const review = c.review_status === "needs_review" ? chip("review: position or verse not confirmed", "warn") : "";
  const segs = (c.segments || []).filter((x) => x.status && x.status !== "empty");
  let h = `<div class="cal-chant"><div class="chant-head"><span class="chant-kind">${esc(CHANT_KIND[kindKey] || c.kind || "Chant")}</span>${c.psalm ? " " + chip("Psalm " + c.psalm + " (Armenian numbering)") : ""}${c.service ? ` <span class="cal-note">${esc(c.service_label || c.service)}</span>` : ""} ${review}</div>`;
  h += renderOpening(c.opening);
  if (segs.length) h += segs.slice(0, 4).map((x) => renderChantSeg(x, c)).join("");
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
      if (Array.isArray(sts)) { hymns.push({ heading: it.heading || it.subpart || "", incipit: it.incipit || it.title || "", type: it.type || it.printedCategory, mode: it.mode, page: firstPage(it), pagesAll: it.pagesAll || it.pages, hymnId: it.hymnId, cues: it.cues || null, stanzas: sts.map((x) => normSt(x, it)) }); cur = null; }
      else if (!it.id && !it.stanzaId && !it.a && !it.text && (it.heading || it.title)) { cur = { heading: it.heading || it.title, page: firstPage(it), stanzas: [] }; hymns.push(cur); }
      else { if (!cur) { cur = { heading: "", stanzas: [] }; hymns.push(cur); } cur.stanzas.push(normSt(it)); }
    });
    const cands = (p.candidates || []).filter((c) => c && (c.page != null || c.startPage != null)).slice(0, 3);
    return { key: p.part || p.key || p.type || "p" + n, label: p.label_en || p.label || p.name || p.type || p.key || "Part " + (n + 1), labelHy: p.labelHy || p.label_hy || p.title_hy || p.title || "", page: firstPage(p) || (hymns.find((x) => x.page != null) || {}).page, hymns, status: p.status || "", reason: p.reason || "", note: p.note || "", needsReview: !!p.needsReview, cands };
  });
  return parts.length ? { parts, summary: cn.summary || null } : null;
}
// Small service tag per canon part (W11 map); the parts stay in canon order, the tags only say which service a part belongs to.
const SVC_TAG = { orhnutyun: "Midnight", harts: "Morning", gordzk: "Morning", metsatsutse: "Morning", voghormya: "Morning", der_hergnits: "Morning", mankunk: "Morning", jashoo: "Divine Liturgy", hampartsi: "Evening" };
const svcTag = (p) => SVC_TAG[p.key] ? `<span class="svc-tag svc-${esc(String(SVC_TAG[p.key]).toLowerCase().replace(/\s+/g, "-"))}" title="${p.key === "hampartsi" ? "The exact slot of the Hampartsi is unconfirmed" : "Service this part belongs to"}">${esc(SVC_TAG[p.key])}${p.key === "hampartsi" ? "?" : ""}</span>` : "";
// L2: the Sharagnots tab = a part rail (name, page, stanza count) and ONE open part at a time, Armenian | English side by side.
const nStanzas = (p) => p.hymns.reduce((n, hy) => n + hy.stanzas.length, 0);
const partSettled = (p) => p.hymns.length && p.status !== "missing" && p.status !== "not_applicable" && p.status !== "not_in_data";
function partFlag(p) {
  if (p.status === "missing") return chip("to be confirmed: this part is not located in the book for this day", "warn");
  if (p.status === "from_rubric") return chip("only the opening is named by the rubric", "warn");
  if (p.status === "not_in_data") return p.reason === "canon_has_none" ? chip("the book prints none for this canon (no cue line found on the scan images)") : chip("not sung on this weekday: no Divine Liturgy");
  if (p.needsReview) return chip("filled by a documented rule, needs review", "warn");
  return "";
}
function canonRail(cv, active) {
  return `<nav class="canon-rail" aria-label="Parts of the canon">` + cv.parts.map((p, n) => {
    const c = nStanzas(p);
    const sub = p.status === "not_applicable" ? "not today" : c ? [p.page != null ? "p." + p.page : "", c + (c === 1 ? " stanza" : " stanzas")].filter(Boolean).join(" · ") : p.status === "not_in_data" ? (p.reason === "canon_has_none" ? "none printed" : "not today") : "not located";
    return `<button type="button" class="rail-item${n === active ? " on" : ""}${c ? "" : " rail-off"}" data-part="${n}" aria-pressed="${n === active}"><span class="rail-name">${esc(p.label)}</span><span class="rail-sub">${esc(sub)}</span></button>`;
  }).join("") + `</nav>`;
}
function renderCanonPart(p, n, active) {
  const settled = partSettled(p);
  let h = `<section class="canon-part" id="canon-part-${n}"${n === active ? "" : " hidden"}><header class="cp-head"><h4 class="cp-name">${esc(p.label)}${p.labelHy ? ` <span class="script-original cp-hy" lang="hy">${esc(p.labelHy)}</span>` : ""}</h4><div class="cp-meta">${svcTag(p)}${p.page != null && settled ? `<button type="button" class="cal-link cal-scan" data-page="${esc(p.page)}">View scan &middot; p.${esc(p.page)}</button>` : ""}${partFlag(p)}</div></header>`;
  if (!p.hymns.length && p.status !== "not_applicable" && p.status !== "not_in_data") h += `<p class="cal-note canon-note">Not located in the Sharagnots for this day.</p>`;
  if (p.note) h += `<p class="cal-note canon-note">${esc(p.note)}</p>`;
  if (p.cands.length) h += `<details class="hy-cands"><summary>Possible places in the book (${p.cands.length}), not a decision</summary><ul>` + p.cands.map((c) => `<li><span class="script-original" lang="hy">${esc(cleanTitle(c.title))}</span> <button type="button" class="cal-link" data-page="${esc(c.page != null ? c.page : c.startPage)}">scan p.${esc(c.page != null ? c.page : c.startPage)}</button></li>`).join("") + `</ul></details>`;
  p.hymns.forEach((hy) => {
    const pg = hy.page != null ? hy.page : (hy.stanzas.find((x) => x.page != null) || {}).page;
    const title = hy.heading || hy.incipit;
    h += `<div class="canon-hymn">${title ? `<h5 class="canon-sub script-original" lang="hy">${esc(cleanTitle(title))}</h5>` : ""}<div class="hy-acts">${pg != null && pg !== p.page ? `<button type="button" class="cal-link cal-scan" data-page="${esc(pg)}"${hy.pagesAll && hy.pagesAll.length > 1 ? ` title="continues to p.${esc(hy.pagesAll[hy.pagesAll.length - 1])}"` : ""}>scan p.${esc(pg)}</button>` : ""}${hy.type ? chip(hy.type) : ""}${hy.mode ? chip("Mode " + hy.mode) : ""}</div>`;
    (hy.cues || []).forEach((c) => { h += `<p class="cal-note canon-cue">Printed cue at the end of the canon (p.${esc(c.page)}): <span class="script-original" lang="hy">${esc(c.labelHy)} ${esc(c.printed)}</span> ${chip("read from the scan by AI, unreviewed")}</p>`; });
    hy.stanzas.forEach((st) => { h += `<div class="canon-st" data-sid="${esc(st.id || "")}"><div class="canon-hy script-original" lang="hy">${esc(st.text || "")}</div><div class="canon-en"></div></div>`; });
    h += `</div>`;
  });
  return h + `</section>`;
}
function renderSharagnots(day, cv) {
  const first = cv.parts.findIndex(partSettled);
  const active = first < 0 ? 0 : first;
  return `<div class="shar-layout">${canonRail(cv, active)}<div class="shar-body">${cv.parts.map((p, n) => renderCanonPart(p, n, active)).join("")}</div></div>`;
}

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
  const absorbed = (window.LCS.anchorMap && window.LCS.anchorMap.absorbed) || {};
  nodes.forEach((n) => {
    const id = n.getAttribute("data-sid");
    if (absorbed[id]) { n.remove(); return; }       // a stanza cut by a column / page break: shown once, with the verse that carries it
    const vs = look(id);
    if (!vs || !vs.length) return;
    const v = vs[0];
    if (v.text) {
      const hy = n.querySelector(".canon-hy"), full = vs.map((x) => x.text).join(" ");
      if (vs.length === 1 && v.x && v.x.n && full.length > v.x.n) {   // cue completed from the same hymn's refrain: the added words are shown lighter
        hy.innerHTML = `${esc(full.slice(0, full.length - v.x.n))}<span class="canon-exp" title="The print gives only a cue here (${esc(v.x.c)}); the refrain is completed from the same hymn (${esc(v.x.r)}, ${esc(v.x.k)} confidence)">${esc(full.slice(full.length - v.x.n))}</span>`;
      } else hy.textContent = full;
    }
    let en = "";
    const aiT = ai[id] && (typeof ai[id] === "string" ? ai[id] : ai[id].t);
    if (v.en) en += `<div class="canon-en-src">${esc(vs.map((x) => x.en || "").join(" ").trim())} <span class="cal-note">(Krapar Sharagnots English)</span></div>`;
    if (aiT) en += `<div class="cal-ai"><span class="ai-label" title="Machine translation, not reviewed by a person">AI translation (Claude)</span> ${esc(aiT)}</div>`;
    n.querySelector(".canon-en").innerHTML = en;
  });
}

// ---- day page -----------------------------------------------------------------------------------------
// L2 structure: summary card (+ one expandable status line) -> three tabs: Readings | Sharagnots | Notes & sources.
// The chosen tab lives in ?view= (the hash belongs to the hymnal's deep links) and is remembered in localStorage.
const VIEWS = ["readings", "sharagnots", "notes"];
function savedView() {
  const q = new URL(location.href).searchParams.get("view");
  if (VIEWS.includes(q)) return q;
  try { const v = localStorage.getItem("lcsDayView"); if (VIEWS.includes(v)) return v; } catch (e) { /* storage unavailable */ }
  return "readings";
}
function setView(v, push) {
  if (!VIEWS.includes(v)) v = "readings";
  document.querySelectorAll(".day-panel").forEach((p) => { p.hidden = p.id !== "panel-" + v; });
  document.querySelectorAll(".day-tabs .dt").forEach((b) => { const on = b.getAttribute("data-view") === v; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
  try { localStorage.setItem("lcsDayView", v); } catch (e) { /* storage unavailable */ }
  if (push !== false) { const u = new URL(location.href); u.searchParams.set("view", v); history.replaceState(null, "", u.pathname + u.search + u.hash); }
}
// One status for a reading: green = Armenian and English verse numbers agree, amber = differs (English requested for the corrected range) or a check is open,
// red = numbering not confirmed, grey = compound citation (not compared).
function rdStatus(r) {
  const v = r.versification || {};
  const cite = r.citationEn || r.citationKey || "reading";
  if (v.compound) return { kind: "grey", text: "Compound citation: Armenian and English numbering not compared" };
  if (v.status === "differs") return { kind: "amber", text: "Armenian and English verse numbers differ; the English is requested for the corrected range" };
  if (v.status === "needs_review") return { kind: "red", text: "Numbering not confirmed: the English may not cover exactly the same verses" };
  if (r.needsPageCheck) return { kind: "amber", text: "The printed page of this reading still needs a check" };
  if (v.status === "match") return { kind: "green", text: "Armenian and English verse numbers agree" };
  return { kind: "grey", text: "Numbering not compared" };
}
const statusDot = (st, cite) => { if (st.kind === "amber" || st.kind === "red") flags.push(cite + ": " + st.text); return `<span class="dot dot-${st.kind}" role="img" aria-label="${esc(st.text)}" title="${esc(st.text)}" tabindex="0"></span>`; };
const LEGEND = [["green", "Checked: nothing open"], ["amber", "Provisional or needs a second look (hover or tap for the reason)"], ["red", "Not confirmed: shown as printed, may not be exact"], ["grey", "Not compared / no data"]];
const legendHtml = `<ul class="legend-list">${LEGEND.map(([k, t]) => `<li><span class="dot dot-${k}"></span> ${esc(t)}</li>`).join("")}</ul><p class="cal-note">Words such as &ldquo;provisional&rdquo;, &ldquo;composed name&rdquo; and &ldquo;AI translation&rdquo; mean: provisional = a calendar rule not yet demonstrated from the books; composed name = an English name made up here, not a published one; AI translation = machine translation nobody has reviewed.</p>`;

function renderDay(day) {
  if (day.error) return `<div class="empty-state">${esc(day.error)}</div>`;
  flags = [];
  const comms = [], seen = new Set();
  (day.commemorations || []).forEach((c) => { const k = [c.armenian || c.bookHeadingArmenian, c.english, c.role].join("|"); if (!seen.has(k)) { seen.add(k); comms.push(c); } });
  const readings = day.readings || [];
  const hymns = day.hymns || [];
  genericCtx = { mode: day.mode && day.mode.armenian, weekday: day.weekday, fasting: day.fasting, commemorations: comms.map((c) => c.armenian || c.bookHeadingArmenian).filter(Boolean) };
  if (day.provisional) flags.push("Some calendar rules for this day are provisional");

  // Readings (Jashots), with the chants (psalm / mesedi / alleluia) interleaved before the reading each precedes
  const chants = day.chants || [];
  const placed = new Set();
  let readingsHtml = "", hasJashoo = false;
  if (readings.length) {
    const idx = readings.map((r, i) => i);
    const main = idx.filter((i) => readings[i].service && readings[i].service.class === "jashoo");
    hasJashoo = main.length > 0;
    const rest = idx.filter((i) => main.indexOf(i) < 0);
    const lead = main.length ? main : idx;
    const rdItem = (r, i, open) => {
      const cite = r.citationEn || r.citationKey || "";
      const st = rdStatus(r);
      const svcWarn = r.service && r.service.label && !r.service.confident ? " (service unconfirmed)" : "";
      return `<details class="cal-reading" data-ri="${i}"${open ? " open" : ""}><summary><span class="rd-dot">${statusDot(st, cite)}</span><strong class="rd-cite">${esc(cite)}</strong><span class="rd-hy script-original" lang="hy">${esc(r.verbatimArmenian || "")}</span>${r.service && r.service.label ? `<span class="meta-t rd-svc">${esc(r.service.label + svcWarn)}</span>` : ""}</summary><div class="cal-reading-body" id="cal-rb-${i}"><p class="cal-note">Loading&hellip;</p></div></details>`;
    };
    const sequence = (list, openFirst) => list.map((i, n) => chantsBefore(chants, i, readings[i], placed).map(renderChant).join("") + rdItem(readings[i], i, n < openFirst)).join("");
    if (main.length) readingsHtml += `<p class="cal-note">Readings of the Divine Liturgy (Jashoo), in service order</p>`;
    readingsHtml += `<div class="cal-readings">` + sequence(lead, 1) + `</div>`;
    if (rest.length && main.length) readingsHtml += `<details class="cal-other"><summary>Other services (${rest.length} reading${rest.length > 1 ? "s" : ""})</summary><div class="cal-readings">` + sequence(rest, 0) + `</div></details>`;
  } else readingsHtml += `<div class="empty-state">No readings are appointed, or none could be resolved, for this day.</div>`;
  const loose = chants.filter((c) => !placed.has(c));
  if (loose.length) readingsHtml += `<details class="cal-other"><summary>Chants not tied to a reading (${loose.length})</summary><div class="cal-chantlist">` + loose.map(renderChant).join("") + `</div></details>`;

  const canon = canonView(day);
  const dominical = /^sun/i.test(day.weekday || "");
  const nLocated = canon ? canon.parts.filter(partSettled).length : 0;
  const nSt = canon ? canon.parts.reduce((n, p) => n + nStanzas(p), 0) : 0;
  let pRead = `<p class="panel-sub">Jashots &middot; ${readings.length} reading${readings.length === 1 ? "" : "s"}${chants.length ? ", " + chants.length + " chant" + (chants.length === 1 ? "" : "s") : ""}</p>`;
  if (hasJashoo && !dominical) pRead += `<p class="cal-note">These readings (Jashoo) are appointed for the day. On an ordinary weekday there is no Divine Liturgy; on a feast day it is celebrated. ${chip("The Divine Liturgy is unconfirmed for this day", "warn")}</p>`;
  if (readings.length) pRead += `<div class="cal-listall"><button type="button" class="plain-link cal-listall-btn">Listen to all readings &rarr;</button></div>`;
  pRead += readingsHtml;
  pRead += `<details class="sources" id="src-readings"><summary>Sources and licences for these readings</summary><div class="src-body"><p>Armenian text: Armenian Bible, 1895 Constantinople edition (Armenian Bible Society 1997 reprint), plain verse text from Arak29 (arak29.org). The Jashots printed-page transcription is a second layer and may differ from the Bible text.</p><p>English: the ESV, loaded live from the ACHR website (achrct.org) under the church's Crossway licence, not stored on this site; Apocrypha from the RSVCE; verses beside chants are the King James Version (public domain).</p><div id="src-esv"></div><p>Audio: each reading is introduced by a short AI-generated spoken introduction (ElevenLabs; it never speaks chapter and verse), followed by the human-read ESV audio from Crossway (esv.org). Apocrypha passages are AI-generated speech. This follows the church's own site (achrct.org).</p></div></details>`;

  let pShar = `<p class="panel-sub">${canon ? `${nLocated} of ${canon.parts.length} parts located &middot; ${nSt} stanza${nSt === 1 ? "" : "s"}` : `${hymns.length} hymn${hymns.length === 1 ? "" : "s"} named`}</p>`;
  if (canon) {
    pShar += renderSharagnots(day, canon);
    if (hymns.length) pShar += `<details class="cal-other"><summary>Hymns named in the Tonatsoyts (${hymns.length})</summary><div class="cal-readings">${renderHymnGroups(day)}</div></details>`;
  } else {
    if (hymns.length) {
      if (hymns.filter((x) => hymnView(x).review).length) pShar += `<p class="cal-note">${hymns.length - hymns.filter((x) => hymnView(x).review).length} of ${hymns.length} hymns have a settled Sharagnots page; the rest need review.</p>`;
      pShar += renderHymnGroups(day);
    } else pShar += `<div class="empty-state">The book names no hymns for this day.</div>`;
    if ((day.canons || []).length) {
      pShar += `<h4 class="hy-group-title">Canons named by the book</h4><ul class="cal-canons">` + day.canons.map((c) => `<li><span class="script-original" lang="hy">${esc(c.canonTitle || "")}</span> ${c.mapped ? "" : chip("This canon is not mapped to a Sharagnots section", "warn")}
        ${(c.sections || []).slice(0, 1).map((s) => `<button type="button" class="cal-link" data-page="${esc((s.pages && s.pages[0]) || "")}">scan p.${esc((s.pages && s.pages[0]) || "?")}</button>`).join(" ")}</li>`).join("") + `</ul>`;
    }
  }
  pShar += `<details class="sources" id="src-sharagnots"><summary>Sources and licences for these hymns</summary><div class="src-body"><p>Krapar sections: the Sharagnots of the Armenian Church in the corrected-spelling form of the Krapar Sharagnots corpus, with its English translations (frharoutiun.github.io/Armenian-Church-Tools/sharagan/).</p><p>Scan-supplement sections: the Unicode edition of the Sharagnots prepared by Fr Ghevond Ajemian, checked against the 1888 Etchmiadzin print; every hymn has a button that opens its scan page, which is the source of truth. A printed cue completed from the same hymn's refrain is shown in a lighter tone.</p><p>Translations marked <span class="ai-label">AI translation (Claude)</span> are machine translations that nobody has reviewed.</p></div></details>`;

  let pNotes = "";
  if ((day.unresolved || []).length) pNotes += `<details class="cal-unresolved" open><summary>Unresolved or provisional (${day.unresolved.length})</summary><ul>` + day.unresolved.map((u) => `<li><strong>${esc(u.field)}</strong>: ${esc(u.reason)}</li>`).join("") + `</ul></details>`;
  pNotes += `<h4 class="notes-h">What the signs mean</h4>${legendHtml}`;
  pNotes += `<p class="cal-foot">Computed by the calgen rules from the Tonatsoyts. Schema ${esc(day.schema || "")}. Names marked &ldquo;composed&rdquo; are not published names. Translations marked AI are machine translations that no person has reviewed.</p>`;

  // header: names, mode, fasting, and ONE status line
  let h = `<article class="cal-day" data-date="${esc(day.date)}">`;
  h += `<header class="day-head"><div class="day-date">${esc(day.weekday || "")} &middot; ${esc(day.date)}
    <button type="button" class="cal-link" id="calShare">Copy link to this day</button></div>`;
  comms.forEach((c) => {
    h += `<div class="cal-comm"><div class="day-title script-original" lang="hy">${esc(c.armenian || c.bookHeadingArmenian || "")}</div>`;
    if (c.english) h += `<div class="day-title-en">${esc(c.english)}${c.englishStatus && c.englishStatus !== "sourced" ? " " + chip("The English name is composed here, not a published name", "warn") : ""}</div>`;
    h += `</div>`;
  });
  if (!comms.length) h += `<div class="empty-state">No commemoration could be derived for this day.</div>`;
  const facts = [];
  if (day.mode) facts.push("Mode " + (day.mode.armenian || day.mode.number));
  if (day.fasting) facts.push("Fasting: " + day.fasting.label + (day.fasting.name ? " (" + day.fasting.name + ")" : ""));
  if (day.easter) facts.push("Easter " + day.easter);
  h += `<div class="cal-facts">${facts.map(esc).join(" &middot; ")}</div>`;
  const groups = new Map(); flags.forEach((f) => groups.set(f, (groups.get(f) || 0) + 1));
  if (day.fasting && day.fasting.provisional) groups.set("Fasting status is provisional", 1);
  const nFlag = [...groups.values()].reduce((a, b) => a + b, 0);
  h += `<div class="status-row"><details class="status-line${nFlag ? " has-flags" : ""}"><summary>${nFlag ? `<span class="dot dot-amber"></span> ${nFlag} item${nFlag === 1 ? "" : "s"} to double-check on this day` : `<span class="dot dot-green"></span> Nothing flagged for this day`}</summary>${nFlag ? `<ul>${[...groups].map(([t, n]) => `<li>${esc(t)}${n > 1 ? " &times;" + n : ""}</li>`).join("")}</ul>` : ""}</details>
    <span class="legend-wrap"><button type="button" class="legend-btn" aria-expanded="false" aria-label="What do the signs mean?">?</button><div class="legend-pop" hidden>${legendHtml}</div></span></div>`;
  h += `</header>`;
  const view = savedView();
  const tab = (k, label, n) => `<button type="button" role="tab" class="dt dt-${k}${view === k ? " on" : ""}" id="tab-${k}" data-view="${k}" aria-selected="${view === k}">${label}${n ? ` <span class="dt-n">${n}</span>` : ""}</button>`;
  h += `<div class="day-tabs" role="tablist" aria-label="Sections of the day">${tab("readings", "Readings", readings.length + chants.length)}${tab("sharagnots", "Sharagnots", canon ? canon.parts.length : hymns.length)}${tab("notes", "Notes<span class=\"dt-long\"> &amp; sources</span>", (day.unresolved || []).length)}</div>`;
  h += `<section class="day-panel panel-readings" id="panel-readings" role="tabpanel"${view === "readings" ? "" : " hidden"}>${pRead}</section>`;
  h += `<section class="day-panel panel-sharagnots" id="panel-sharagnots" role="tabpanel"${view === "sharagnots" ? "" : " hidden"}><span id="sec-hymns"></span>${pShar}</section>`;
  h += `<section class="day-panel panel-notes" id="sec-notes" role="tabpanel"${view === "notes" ? "" : " hidden"}><span id="panel-notes"></span>${pNotes}</section></article>`;
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
    const kind = body && body.getAttribute && body.getAttribute("data-vers-kind");
    const d = slot.closest("details.cal-reading"), dt = d && d.querySelector(".rd-dot .dot");
    if (kind && dt) { const TXT = { green: "Armenian and English verse numbers agree", amber: "Armenian and English verse numbers differ; the English is requested for the corrected range", red: "Numbering not confirmed: the English may not cover exactly the same verses", grey: "Numbering not compared" }; dt.className = "dot dot-" + kind; dt.title = TXT[kind]; dt.setAttribute("aria-label", TXT[kind]); }
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
  await ensureGeneric();
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
  out.querySelectorAll(".day-tabs .dt").forEach((b) => b.addEventListener("click", () => { setView(b.getAttribute("data-view")); window.scrollTo({ top: Math.max(0, out.getBoundingClientRect().top + window.scrollY - 70) }); }));
  out.querySelectorAll(".rail-item").forEach((b) => b.addEventListener("click", () => {
    const n = b.getAttribute("data-part");
    out.querySelectorAll(".canon-part").forEach((p) => { p.hidden = p.id !== "canon-part-" + n; });
    out.querySelectorAll(".rail-item").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
    const top = out.querySelector(".shar-body"); if (top && window.innerWidth < 900) top.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const lb = out.querySelector(".legend-btn"), lp = out.querySelector(".legend-pop");
  if (lb && lp) lb.addEventListener("click", () => { lp.hidden = !lp.hidden; lb.setAttribute("aria-expanded", lp.hidden ? "false" : "true"); });
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
