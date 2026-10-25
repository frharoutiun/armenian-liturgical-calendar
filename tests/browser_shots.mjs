// Manual layout check at phone / tablet widths (needs Google Chrome). Not run by deploy.sh.
//   python3 -m http.server 4195   (from the site folder)   then   node tests/browser_shots.mjs OUT_DIR [BASE_URL] [dates...]
// Uses Emulation.setDeviceMetricsOverride (headless Chrome will not open a window narrower than ~500 px) and writes full-page PNGs for
// the Readings / Sharagnots / Notes views at 390x844 and 820x1180, and prints overflow diagnostics (horizontal scroll, off-screen elements).
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
const out = process.argv[2] || "/private/tmp/k3_shots"; mkdirSync(out, { recursive: true });
const base = process.argv[3] || "http://localhost:4195/";
const dates = process.argv.slice(4).length ? process.argv.slice(4) : ["2026-10-26", "2027-04-04"];
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(CH, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, "--user-data-dir=/private/tmp/k3prof" + port, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch (e) { /* wait */ } await sleep(200); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : r; };
await send("Page.enable"); await send("Runtime.enable");
const report = [];
for (const [w, h, tag] of [[390, 844, "phone"], [820, 1180, "tablet"]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  for (const date of dates) for (const view of ["readings", "sharagnots", "notes"]) {
    await send("Page.navigate", { url: `${base}?tab=calendar&date=${date}&view=${view}&x=${Date.now()}` });
    await sleep(9000);
    const diag = await ev(`(() => { const de = document.documentElement; const over = []; const W = de.clientWidth;
      for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width > 0 && (r.right > W + 2 || r.left < -2) && getComputedStyle(el).position !== 'fixed') { over.push(el.tagName.toLowerCase() + '.' + (el.className && el.className.toString().slice(0, 40)) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); if (over.length > 8) break; } }
      const small = [...document.querySelectorAll('button, a.cal-link, .cal-tab')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 30 || r.width < 30); }).length;
      return { scrollW: de.scrollWidth, clientW: W, over, smallTargets: small, height: de.scrollHeight }; })()`);
    report.push({ tag, date, view, ...diag });
    const m = await send("Page.getLayoutMetrics");
    const hh = Math.min(6000, Math.ceil(m.result.cssContentSize ? m.result.cssContentSize.height : h));
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: hh, scale: 1 } });
    writeFileSync(`${out}/${tag}_${date}_${view}.png`, Buffer.from(shot.result.data, "base64"));
  }
}
console.log(JSON.stringify(report, null, 1));
ws.close(); chrome.kill();
