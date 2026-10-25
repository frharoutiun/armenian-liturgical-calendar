// Reading audio logic (listen.mjs): the sequence and timings of the church site (achrct.org), and the rule that no clip speaks chapter and verse.
import assert from "node:assert/strict";
import fs from "node:fs";
import { introSteps, readingPlan, pickVoice, clipUrl, GAP_TEXTS_MS, GAP_PASSAGE_MS, GAP_READINGS_MS, STALL_MS, RATE_EL, RATE_ESV, LABELS } from "../listen.mjs";

const idx = {
  by_text: { "A reading from the book of Proverbs.": "AU-p", "Let us listen with reverence to the Holy Gospel of Jesus Christ according to Matthew.": "AU-m", "Our Lord Jesus Christ": "AU-c", "A reading from the Wisdom of Solomon.": "AU-w" },
  by_gospel_combined: { "Let us listen with reverence to the Holy Gospel of Jesus Christ according to Matthew. About the sealing of the tomb": "AU-mc" },
  clips: { "AU-p": { file: "clips/aaaa.mp3" }, "AU-w1": { file: "clips/w1.mp3" }, "AU-w2": { file: "clips/w2.mp3" } },
};
// the constants are ACHR's (ScriptureReading component)
assert.deepEqual([GAP_TEXTS_MS, GAP_PASSAGE_MS, GAP_READINGS_MS, STALL_MS, RATE_EL, RATE_ESV], [1000, 1200, 1800, 8000, 1.2, 1]);
assert.equal(LABELS.listen, "▶ Listen"); assert.equal(LABELS.stop, "■ Stop");
assert.equal(LABELS.all, "Listen to all readings →"); assert.equal(LABELS.stopAll, "Stop listening →");
assert.equal(LABELS.unavailable, "Audio unavailable for this reading.");

// an Old Testament / epistle reading: introduction, then the human ESV audio
let p = readingPlan(idx, [{ kind: "esv", audioUrl: "https://audio.esv.org/hw/Proverbs%203%3A1-6.mp3", introduction: "A reading from the book of Proverbs." }]);
assert.deepEqual(p.intro, [{ text: "A reading from the book of Proverbs.", clip: "AU-p" }]);
assert.deepEqual(p.passages, [{ url: "https://audio.esv.org/hw/Proverbs%203%3A1-6.mp3", rate: 1 }]);
assert.equal(p.available, true);
// a Gospel: introduction and caption are two steps, each with its own clip
p = readingPlan(idx, [{ kind: "esv", audioUrl: "https://audio.esv.org/hw/Matthew%2019%3A27-29.mp3", introduction: "Let us listen with reverence to the Holy Gospel of Jesus Christ according to Matthew.", introductionCaption: "Our Lord Jesus Christ" }]);
assert.deepEqual(p.intro.map((s) => s.clip), ["AU-m", "AU-c"]);
// a Gospel whose caption was only recorded inside an older combined clip: that one clip plays instead
p = introSteps(idx, "Let us listen with reverence to the Holy Gospel of Jesus Christ according to Matthew.", "About the sealing of the tomb");
assert.deepEqual(p, [{ text: "Let us listen with reverence to the Holy Gospel of Jesus Christ according to Matthew. About the sealing of the tomb", clip: "AU-mc" }]);
// no recording at all: the step is kept with clip null so the browser voice speaks it
assert.deepEqual(introSteps(idx, "A reading from the book of Nahum.", null), [{ text: "A reading from the book of Nahum.", clip: null }]);
// the ESV audio must be Crossway's host; anything else is not played
assert.equal(readingPlan(idx, [{ kind: "esv", audioUrl: "https://example.com/x.mp3", introduction: "A reading from the book of Proverbs." }]).available, false);
assert.equal(readingPlan(idx, [{ kind: "esv", audioUrl: null, introduction: "A reading from the book of Proverbs." }]).available, false);
// Apocrypha: our own voiced passage clips at 1.2x after the introduction
p = readingPlan(idx, [{ kind: "apoc", introText: "A reading from the Wisdom of Solomon.", introClip: "AU-w", clips: ["AU-w1", "AU-w2"] }]);
assert.deepEqual(p.passages, [{ clip: "AU-w1", rate: 1.2 }, { clip: "AU-w2", rate: 1.2 }]);
assert.equal(clipUrl("https://x.github.io/audio", idx, "AU-p"), "https://x.github.io/audio/clips/aaaa.mp3");
assert.equal(clipUrl("https://x.github.io/audio/", idx, "nope"), null);
// no readings, no audio
assert.equal(readingPlan(idx, []).available, false);

// browser voice preference as on the church site
assert.equal(pickVoice([{ name: "Alex", lang: "en-US" }, { name: "Google US English Male", lang: "en-US" }]).name, "Google US English Male");
assert.equal(pickVoice([{ name: "Samantha", lang: "en-US" }, { name: "Daniel", lang: "en-GB" }]).name, "Samantha");
assert.equal(pickVoice([]), null);

// with the real audio repo: every citation has an introduction clip, no published label speaks chapter and verse
const repoIndex = new URL("../../08 - Liturgical Audio/audio/index.json", import.meta.url);
if (fs.existsSync(repoIndex)) {
  const ix = JSON.parse(fs.readFileSync(repoIndex, "utf8"));
  assert.equal(ix.coverage.missing_intro, 0);
  assert.ok(!Object.values(ix.clips).some((c) => c.kind === "reference"), "no chapter-and-verse announcement clips");
  for (const [k, e] of Object.entries(ix.by_citation)) { assert.ok(e.intro, k); assert.ok(!("reference" in e), k); assert.ok(ix.clips[e.intro], k); assert.ok(ix.by_text[e.intro_text], k); }
  for (const c of Object.values(ix.clips)) if (/^intro/.test(c.kind || "")) assert.ok(!/chapter|verses? \d/i.test(c.label || ""), c.label);
}
console.log("listen tests ok");
