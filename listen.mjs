// Reading audio, modelled exactly on the church's site (achrct.org, ScriptureReading component; see
// output/site_build/F1_ACHR_AUDIO_SPEC.md in the digitization project). Pure logic only (no DOM), so it can be tested under node.
//
// One reading plays, in this order:  introduction (+ gospel caption)  ->  1.0 s between texts  ->  1.2 s  ->  the passage audio.
// "Listen to all readings" does this for each reading with 1.8 s between readings.
// The introduction never contains a chapter or verse ("A reading from the book of Proverbs.").

export const GAP_TEXTS_MS = 1000;      // between the introduction and the caption
export const GAP_PASSAGE_MS = 1200;    // before the passage audio
export const GAP_READINGS_MS = 1800;   // between readings in "listen to all"
export const STALL_MS = 8000;          // a clip that never starts playing is abandoned
export const RATE_EL = 1.2;            // ElevenLabs clips play at 1.2x on the church site
export const RATE_ESV = 1;             // the human ESV recording plays at normal speed
export const SPEECH_RATE = 0.9;        // browser speech-synthesis fallback
export const SPEECH_TIMEOUT_MS = 6000;
export const PASSAGE_TIMEOUT_MS = 15000;

export const LABELS = {
  listen: "▶ Listen", stop: "■ Stop", all: "Listen to all readings →", stopAll: "Stop listening →",
  unavailable: "Audio unavailable for this reading.", preparing: "Preparing audio…",
};

// The church site's preferred browser voices (used only when no recorded clip exists for a text).
export const VOICE_PREFERENCE = [
  "Microsoft Andrew Online (Natural) - English (United States)", "Microsoft Christopher Online (Natural) - English (United States)",
  "Microsoft Guy Online (Natural) - English (United States)", "Google US English Male", "Alex", "Microsoft David - English (United States)",
];
export function pickVoice(voices) {
  if (!voices || !voices.length) return null;
  for (const n of VOICE_PREFERENCE) { const v = voices.find((x) => x.name === n); if (v) return v; }
  const enUS = (v) => (v.lang || "").toLowerCase().replace("_", "-") === "en-us";
  const male = (v) => /male|david|alex|guy|mark|andrew|christopher|tom(?!my)/i.test(v.name) && !/female/i.test(v.name);
  const us = voices.filter(enUS);
  const m = us.find(male);
  if (m) return m;
  if (us.length) return us[0];
  const en = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  const pool = en.length ? en : voices;
  return pool.find(male) || pool[0] || null;
}

const norm = (t) => String(t == null ? "" : t).replace(/\s+/g, " ").trim();

// introduction (+ caption) -> list of steps {text, clip}: clip is a clip id of our hosted ElevenLabs copy, or null (speech fallback).
// Gospels: the introduction and the caption each have a clip; older combined "intro + caption" clips are used when the caption
// alone was never recorded.
export function introSteps(index, introduction, caption) {
  const byText = (index && index.by_text) || {};
  const combined = (index && index.by_gospel_combined) || {};
  const intro = norm(introduction), cap = norm(caption);
  if (!intro && !cap) return [];
  const steps = [];
  const iClip = intro ? byText[intro] || null : null;
  const cClip = cap ? byText[cap] || null : null;
  if (intro && cap && !cClip) {
    const both = combined[intro + " " + cap] || combined[intro + " " + cap.replace(/\.$/, "")] || null;
    if (both) return [{ text: intro + " " + cap, clip: both }];
  }
  if (intro) steps.push({ text: intro, clip: iClip });
  if (cap) steps.push({ text: cap, clip: cClip });
  return steps;
}

// Everything one reading plays. parts: [{kind:"esv", audioUrl, introduction, introductionCaption} | {kind:"apoc", introText, introClip, clips:[id]}]
// Returns {available, intro:[{text,clip}], passages:[{url?, clip?, rate}]}.
export function readingPlan(index, parts) {
  const ps = (parts || []).filter(Boolean);
  const first = ps[0];
  let intro = [];
  if (first) {
    if (first.kind === "esv") intro = introSteps(index, first.introduction, first.introductionCaption);
    else if (first.kind === "apoc") intro = first.introClip ? [{ text: first.introText || "", clip: first.introClip }] : introSteps(index, first.introText, null);
  }
  const passages = [];
  ps.forEach((p) => {
    if (p.kind === "esv" && p.audioUrl && /^https:\/\/audio\.esv\.org\//.test(p.audioUrl)) passages.push({ url: p.audioUrl, rate: RATE_ESV });
    if (p.kind === "apoc") (p.clips || []).forEach((c) => passages.push({ clip: c, rate: RATE_EL }));
  });
  return { available: passages.length > 0, intro, passages };
}

export const clipUrl = (base, index, id) => { const c = id && index && index.clips && index.clips[id]; return c ? String(base).replace(/\/?$/, "/") + c.file.replace(/^\.?\//, "") : null; };
