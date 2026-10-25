// Manual browser check of the reading audio (needs Google Chrome and network access to achrct.org). Not run by deploy.sh.
//   node /tmp/.../srv.mjs &   (serves the site and the audio repo on :4192)   then   node tests/browser_listen.mjs 2027-04-04
// It stubs media playback (no sound), records every play() call in order, and prints the sequence for a single reading and for "listen to all".
import { spawn } from "node:child_process";
const date = process.argv[2] || "2027-04-04";
const live = process.argv[3] === "live";   // "live": test https://frharoutiun.github.io/armenian-liturgical-calendar/ itself instead of the local server
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9333 + Math.floor(Math.random() * 300);
const chrome = spawn(CH, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, "--user-data-dir=/private/tmp/f1/prof" + port, "--window-size=1280,2000", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch (e) { /* wait */ } await sleep(200); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const logs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method === "Runtime.consoleAPICalled") logs.push(d.params.args.map((a) => a.value).join(" ")); else if (d.method === "Runtime.exceptionThrown") logs.push("EXC " + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text)); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : r; };
await send("Runtime.enable"); await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  if (!${live}) window.LC_AUDIO_BASE = "http://localhost:4192/audio-repo/"; window.__plays = []; window.__speech = [];
  const proto = HTMLMediaElement.prototype;
  proto.play = function () { const el = this; window.__plays.push({ src: el.src.replace("http://localhost:4192/audio-repo/", "audio-repo/").replace("https://frharoutiun.github.io/armenian-liturgical-audio/", "audio-repo/"), rate: el.playbackRate, cls: el.className || "clip" , t: Date.now() });
    setTimeout(() => { el.dispatchEvent(new Event("playing")); setTimeout(() => el.dispatchEvent(new Event("ended")), 30); }, 20); return Promise.resolve(); };
  proto.pause = function () { this.dispatchEvent(new Event("pause")); };
  window.speechSynthesis && (window.speechSynthesis.speak = (u) => { window.__speech.push(u.text); setTimeout(() => u.onend && u.onend(), 10); });
` });
await send("Page.navigate", { url: (live ? "https://frharoutiun.github.io/armenian-liturgical-calendar/" : "http://localhost:4192/") + `?tab=calendar&date=${date}&x=${Date.now()}` });
await sleep(9000);
const out = {};
out.listenButtons = await ev(`document.querySelectorAll('.cal-listen-btn').length`);
out.states = await ev(`[...document.querySelectorAll('.cal-listen')].map(b=>b.dataset.state)`);
out.listAllLabel = await ev(`(document.querySelector('.cal-listall-btn')||{}).textContent`);
// single reading
await ev(`document.querySelector('.cal-listen-btn') && document.querySelector('.cal-listen-btn').click()`);
await sleep(6000);
out.single = await ev(`window.__plays.map(p=>p.cls+' '+p.rate+' '+p.src.slice(-60))`);
out.singleSpeech = await ev(`window.__speech`);
await ev(`window.__plays.length = 0`);
await ev(`document.querySelector('.cal-listall-btn').click()`);
await sleep(30000);
out.allLabelWhile = await ev(`(document.querySelector('.cal-listall-btn')||{}).textContent`);
out.all = await ev(`window.__plays.map(p=>p.cls+' '+p.rate+' '+p.src.slice(-50))`);
out.chapterVerseClips = await ev(`window.__plays.filter(p=>/reference/i.test(p.src)).length`);
out.noneMsgs = await ev(`[...document.querySelectorAll('.cal-audio-none')].map(e=>e.textContent)`);
out.logs = logs.slice(0, 8);
console.log(JSON.stringify(out, null, 1));
ws.close(); chrome.kill();
process.exit(0);
