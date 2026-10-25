// chants-english.mjs (C2) - the English of the chants (Psalm / Mesedi / Alleluia verses), routed like the readings:
//   1. ESV, requested live from the church's ESV service (achrct.org/api/scripture), lazily, cached in sessionStorage, throttled (never stored on this site)
//   2. KJV (public domain, Arak29's parallel column) as the fallback when the service is busy or offline
//   3. an offline, labelled "AI translation (Claude)" of the SUNG wording where it is not a Bible verse or differs from it
// Data: data/calendar/chants_english.json (pipeline/s131_chants_english_bridge.py). Nothing is invented: a verse without any of the three says so.
const ACHR_API = (typeof window !== "undefined" && window.LC_ESV_API) || "https://www.achrct.org/api/scripture";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const AI_LABEL = "AI translation (Claude)";
let DATA = null, loading = null;

function injectCss() {
  if (typeof document === "undefined" || document.getElementById("chants-english-css")) return;
  const st = document.createElement("style"); st.id = "chants-english-css";
  st.textContent = ".chant-esv .chant-esv-body{font-style:normal}.chant-esv .cal-loading{opacity:.7}.chant-ai{margin-top:.35rem;padding:.3rem .5rem;border-left:3px solid var(--accent-2,#8b6fb0);background:rgba(139,111,176,.08)}"
    + ".chant-ai .ai-badge{display:inline-block;font-size:.72rem;font-weight:600;padding:0 .4rem;border-radius:.6rem;border:1px solid currentColor;margin-right:.4rem;opacity:.9}.chant-piece{margin-top:.5rem}.chant-esv-link{font-size:.85rem}";
  document.head.appendChild(st);
}
export function loadChantsEnglish() {
  if (DATA) return Promise.resolve(DATA);
  if (loading) return loading;
  loading = fetch("data/calendar/chants_english.json").then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => { DATA = d || { entries: {}, generic: {} }; injectCss(); return DATA; });
  return loading;
}
export function entryFor(layerKey, si, seg) {
  const e = DATA && DATA.entries && layerKey != null ? DATA.entries[layerKey + "|" + si] : null;
  if (!e) return null;
  if (e.incipit && seg && seg.incipit && e.incipit !== seg.incipit) return null;   // the layer was rebuilt: never attach a route to the wrong segment
  return e;
}
export const genericFor = (gkey) => (DATA && DATA.generic && DATA.generic[gkey]) || null;

const bgLink = (ref) => `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=ESV`;

// One verse of ESV text from the service's HTML: headings, psalm titles, verse numbers and footnotes removed; plain text only.
export function esvVerseText(html) {
  const doc = new DOMParser().parseFromString("<body>" + html + "</body>", "text/html");
  doc.querySelectorAll("h3,h4,h5,.psalm-title,.footnotes,.footnote,sup,.verse-num,.chapter-num,.versenum,script,style").forEach((n) => n.remove());
  const lines = [...doc.querySelectorAll(".line")];
  const txt = (lines.length ? lines.map((l) => l.textContent) : [...doc.querySelectorAll("p")].map((p) => p.textContent)).join(" ");
  return txt.replace(/\s+/g, " ").replace(/\s+([,;:.!?])/g, "$1").trim();
}

// Shared, polite fetch: sessionStorage cache (same keys as the readings), one request at a time, >= 3 s apart (the service allows 30 requests a minute per visitor).
const GAP = 2300, mem = new Map(), queue = [];   // 26 requests a minute at most: the service allows 30 per visitor, readings and chants share this one queue
let busy = false, lastAt = 0;
function cached(ref) {
  const k = "lc-esv:" + ref;
  try { const t = sessionStorage.getItem(k); if (t) return JSON.parse(t); } catch (e) { /* storage unavailable */ }
  return null;
}
async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    const wait = lastAt + GAP - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      lastAt = Date.now();
      const r = await fetch(ACHR_API + "?reference=" + encodeURIComponent(job.ref));
      if (r.status === 429 && (job.tries = (job.tries || 0) + 1) <= 2) {   // the service is busy: wait, then ask again (twice at most)
        await new Promise((x) => setTimeout(x, 9000 * job.tries));
        lastAt = Date.now();
        queue.unshift(job);
        continue;
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (!d || !d.ok || !d.html) throw new Error("no text");
      try { sessionStorage.setItem("lc-esv:" + job.ref, JSON.stringify(d)); } catch (e) { /* quota */ }
      job.resolve(d);
    } catch (e) { mem.delete(job.ref); job.reject(e); }
  }
  busy = false;
}
export function fetchEsvRef(ref) {
  const c = cached(ref);
  if (c) return Promise.resolve(c);
  if (mem.has(ref)) return mem.get(ref);
  const p = new Promise((resolve, reject) => { queue.push({ ref, resolve, reject }); pump(); });
  mem.set(ref, p);
  return p;
}

// The English column for one verse. `entry` = chants_english entry (or generic/piece entry), `seg` = the layer segment/generic entry (for the layer's own KJV text).
export function englishHtml(entry, seg) {
  if (!entry) return "";
  const kjv = entry.kjv_text || (seg && seg.english_full) || "";
  let h = "";
  if (entry.esv_lookup) {
    h += `<div class="chant-esv" data-ref="${esc(entry.esv_lookup)}"><div class="cal-note">English (ESV): ${esc(entry.esv_lookup)}${entry.sung_differs ? " &middot; Bible verse; the sung wording differs" : ""}</div><div class="chant-en chant-esv-body cal-loading">Loading ESV text from achrct.org&hellip;</div></div>`;
    if (kjv) h += `<div class="chant-kjv" hidden><div class="chant-en">${esc(kjv)} <span class="cal-note">(KJV, public domain)</span></div></div>`;
  } else if (kjv) {
    h += `<div class="chant-en">${esc(kjv)} <span class="cal-note">(KJV, public domain)</span></div>`;
  }
  if (entry.ai_translation) {
    const lead = entry.esv_lookup ? "Sung wording" : "Sung wording (not a verse of the Bible)";
    h += `<div class="chant-ai"><span class="ai-badge">${AI_LABEL}</span><span class="cal-note">${esc(lead)}:</span> <span class="chant-en">${esc(entry.ai_translation)}</span>${entry.ai_note && !/^AI translation/.test(entry.ai_note) ? `<div class="cal-note">${esc(entry.ai_note)}</div>` : ""}</div>`;
  }
  if (!h) h = `<div class="cal-note">No sourced English for this verse yet.</div>`;
  return h;
}

// Fill the ESV placeholders lazily, when they scroll near the viewport; on failure show the KJV fallback and a BibleGateway link.
export function hydrate(root) {
  if (!root) return;
  const nodes = [...root.querySelectorAll(".chant-esv[data-ref]:not([data-hydrated])")];
  const go = (el) => {
    if (el.dataset.hydrated) return;
    el.dataset.hydrated = "1";
    const ref = el.getAttribute("data-ref"), body = el.querySelector(".chant-esv-body");
    const fallback = () => {
      const kjv = el.parentNode && el.parentNode.querySelector(".chant-kjv");
      if (kjv) kjv.hidden = false;
      if (body) { body.classList.remove("cal-loading"); body.innerHTML = `<span class="cal-note">ESV text could not be loaded right now (offline, or the achrct.org service is busy).</span> <a class="chant-esv-link" href="${esc(bgLink(ref))}" target="_blank" rel="noopener">${esc(ref)} on BibleGateway (ESV)</a>`; }
    };
    fetchEsvRef(ref).then((d) => {
      const t = esvVerseText(d.html);
      if (!t || !body) return fallback();
      body.classList.remove("cal-loading"); body.textContent = t;
      if (d.copyright && typeof window !== "undefined" && window.LCNoteCopy) window.LCNoteCopy(d.copyright);
    }).catch(fallback);
  };
  if (typeof IntersectionObserver === "undefined") { nodes.forEach(go); return; }
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); go(en.target); } }), { rootMargin: "300px" });
  nodes.forEach((n) => io.observe(n));
}
