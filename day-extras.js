// Day page extras (W7): fills each reading with the cached English RSVCE text, the Armenian Jashots text and the audio player,
// and each appointed hymn with its AI English translation (if present). Everything is lazy-loaded static JSON.
//   data/scripture/index.json + shards/<book>.json   (W3)     audio: <audio repo>/audio/index.json (W5)     data/ai-en.json (W2)
import { buildLookup, findCitations, segmentsOf, bibleGatewayUrl, normBook } from "./scripture-match.mjs";

const AUDIO_BASE = (window.LC_AUDIO_BASE || "https://frharoutiun.github.io/armenian-liturgical-audio/").replace(/\/?$/, "/");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const j = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ": HTTP " + r.status); return r.json(); });

let indexP = null, audioP = null, aiP = null, attrP = null;
const shardP = {};
const getIndex = () => indexP || (indexP = j("data/scripture/index.json").then((d) => ({ citations: d.citations, lookup: buildLookup(d.citations), ranges: parsedRanges(d.citations) })));
const getAttr = () => attrP || (attrP = j("data/scripture/attribution.json").catch(() => null));
const getAudio = () => audioP || (audioP = j(AUDIO_BASE + "audio/index.json").catch(() => null));
const getAi = () => aiP || (aiP = j("data/ai-en.json").catch(() => ({ items: {} })));
const getShard = (name) => shardP[name] || (shardP[name] = j("data/scripture/shards/" + name + ".json").then((d) => d.citations));

function parsedRanges(citations) {
  const by = {};
  for (const k of Object.keys(citations)) {
    const x = /^(.+)\|(\d+):(\d+)-(\d+):(\d+)$/.exec(k);
    if (!x) continue;
    (by[normBook(x[1])] = by[normBook(x[1])] || []).push({ key: k, a: [+x[2], +x[3]], b: [+x[4], +x[5]] });
  }
  return by;
}
const cmp = (p, q) => (p[0] - q[0]) || (p[1] - q[1]);
// A cached citation that contains the segment (used when the exact range is not cached but a larger one is).
function containing(ranges, seg) {
  const list = ranges[normBook(seg.book)] || [];
  const a = [seg.ch1, seg.v1], b = [seg.ch2, seg.v2];
  return list.find((r) => cmp(r.a, a) <= 0 && cmp(r.b, b) >= 0) || null;
}
const inRange = (ref, seg) => { const [c, v] = ref.split(":").map(Number); return cmp([c, v], [seg.ch1, seg.v1]) >= 0 && cmp([c, v], [seg.ch2, seg.v2]) <= 0; };

async function gather(reading) {
  const idx = await getIndex();
  const out = [];
  for (const { segment, key } of findCitations(idx.lookup, reading.passage)) {
    let usedKey = key, sliced = false;
    if (!usedKey && segment.v1 != null) { const c = containing(idx.ranges, segment); if (c) { usedKey = c.key; sliced = true; } }
    const rec = { segment, key: usedKey, exactKey: key, sliced, en: null, hy: [], status: "missing" };
    if (usedKey) {
      const meta = idx.citations[usedKey];
      try {
        const shard = await getShard(meta.shard);
        const c = shard[meta.id];
        if (c) {
          if (c.en && c.en.verses && c.en.verses.length) {
            rec.en = c.en.verses.filter((v) => !sliced || inRange(v.r, segment));
            if (!rec.en.length) rec.en = null;
          }
          rec.hy = c.hy || [];
          rec.status = rec.en ? "en" : "hy";
        }
      } catch (e) { rec.status = "error"; }
    }
    out.push(rec);
  }
  return out;
}

function englishHtml(recs, reading) {
  const have = recs.filter((r) => r.en);
  if (have.length === recs.length && recs.length) {
    return '<div class="cal-en"><div class="cal-sub">English (RSVCE)</div>' + have.map((r) => '<p class="cal-verses">' + r.en.map((v) => `<sup>${esc(v.r.split(":").pop())}</sup>${esc(v.t)}`).join(" ") + "</p>").join("") + "</div>";
  }
  const link = bibleGatewayUrl(reading.passage);
  return `<div class="cal-en cal-pending"><div class="cal-sub">English (RSVCE)</div><p>English text pending. ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Read this passage on BibleGateway (RSVCE)</a>` : ""}</p></div>`;
}

function armenianHtml(recs, reading) {
  const parts = [];
  recs.forEach((r) => {
    const want = reading.service && reading.service.class;
    const hy = (r.hy || []).slice().sort((a, b) => (b.service_class === want) - (a.service_class === want) || (b.closes === true) - (a.closes === true))[0];
    if (hy && hy.text) parts.push({ hy, key: r.key });
  });
  if (!parts.length) return "";
  const pages = [...new Set(parts.flatMap((p) => p.hy.pdf_pages || []))];
  const btns = pages.length ? "Source: Jashots, scan p." + pages.slice(0, 4).join(", ") + "." : "";
  return `<details class="cal-hy"><summary>Armenian reading (Ճաշոց, Jashots)</summary>${parts.map((p) => `<div class="script-original hy-text" lang="hy">${esc(p.hy.text).replace(/\n/g, "<br>")}</div>`).join("")}<div class="cal-note">AI-assisted transcription of the printed Jashots; proofreading in progress. ${btns}</div></details>`;
}

async function audioHtml(recs, reading) {
  const ai = await getAudio();
  if (!ai) return '<div class="cal-audio cal-pending"><span class="cal-note">Audio is not available yet.</span></div>';
  const urls = [];
  recs.forEach((r) => {
    const k = r.exactKey || r.key;
    const e = k && ai.by_citation && ai.by_citation[k];
    if (!e) return;
    [e.intro, e.reference, ...(e.text || [])].forEach((id) => { const c = id && ai.clips[id]; if (c) urls.push({ url: AUDIO_BASE + c.file.replace(/^\.?\//, ""), id }); });
  });
  if (!urls.length) return '<div class="cal-audio cal-pending"><span class="cal-note">Audio for this reading is pending.</span></div>';
  return `<div class="cal-audio" data-clips='${esc(JSON.stringify(urls.map((u) => u.url)))}'><button type="button" class="nav-btn cal-play" aria-label="Play audio">&#9654; Play</button> <span class="cal-note">AI-generated speech (ElevenLabs). ${urls.length} clip${urls.length > 1 ? "s" : ""}.</span></div>`;
}

async function readingBody(reading) {
  const recs = await gather(reading);
  const wrap = document.createElement("div");
  wrap.innerHTML = englishHtml(recs, reading) + armenianHtml(recs, reading) + (await audioHtml(recs, reading))
    + (reading.jashots && reading.jashots.introEn ? `<div class="cal-note">Introduction: ${esc(reading.jashots.introEn)}</div>` : "");
  return wrap;
}

// ---- audio player (sequential clips) ----
document.addEventListener("click", (ev) => {
  const b = ev.target.closest && ev.target.closest(".cal-play");
  if (!b) return;
  const box = b.closest(".cal-audio");
  let clips; try { clips = JSON.parse(box.getAttribute("data-clips")); } catch (e) { return; }
  if (box._audio) { box._audio.pause(); box._audio = null; b.innerHTML = "&#9654; Play"; return; }
  let i = 0; const a = new Audio(); box._audio = a; b.innerHTML = "&#10073;&#10073; Stop";
  const next = () => { if (i >= clips.length) { box._audio = null; b.innerHTML = "&#9654; Play"; return; } a.src = clips[i++]; a.play().catch(() => { box._audio = null; b.innerHTML = "&#9654; Play"; box.insertAdjacentHTML("beforeend", ' <span class="cal-note">Audio could not be loaded.</span>'); }); };
  a.addEventListener("ended", next); a.addEventListener("error", () => { box._audio = null; b.innerHTML = "&#9654; Play"; });
  next();
});
// ---- hymn AI translation ----
async function hymnExtra(h) {
  const links = (h.links || []).slice(0, 1);
  if (!links.length || !window.LCS) return "";
  const [ai, _] = await Promise.all([getAi(), window.LCS.ready]);
  const map = window.LCS.anchorMap;
  if (!map || !map.hymn || !map.stanza) return "";
  const loc = map.hymn[links[0].hymnId];
  if (!loc) return "";
  const items = (ai && ai.items) || {};
  const hits = Object.keys(map.stanza).filter((a) => map.stanza[a][0] === loc[0] && map.stanza[a][1] === loc[1] && items[a]).slice(0, 2);
  if (!hits.length) return "";
  const label = (ai && ai.label) || "AI translation (Claude)";
  return hits.map((a) => `<div class="cal-ai"><span class="ai-label" title="Machine translation, not reviewed by a person">${esc(label)}</span> ${esc(typeof items[a] === "string" ? items[a] : items[a].t)}</div>`).join("");
}

async function afterRender(day, root) {
  const attr = await getAttr();
  if (attr && attr.english && !root.querySelector(".cal-rsv-note") && root.querySelector(".cal-en")) {
    root.querySelector("article").insertAdjacentHTML("beforeend", `<p class="cal-foot cal-rsv-note">${esc(attr.english.copyright)} English scripture text is the RSVCE as served by BibleGateway; Armenian reading text is from the Jashots; audio is AI-generated speech.</p>`);
  }
}

window.LCalendarHooks = Object.assign(window.LCalendarHooks || {}, { readingBody, afterRender, hymnExtra });
