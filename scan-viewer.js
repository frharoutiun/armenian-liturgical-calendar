// Scan-page viewer: opens a page of the 1888 Sharagnots scan (the source of truth) next to the text.
// Buttons carry data-scan-page, data-scan-loc ("col,line,col,line": estimated span) and data-scan-pages.
// Page images: pages/pNNN.jpg (downsized copies); line geometry: data/scan-geometry.json ([col, x0, x1, [[line, y0, y1]...]]).
(function () {
  "use strict";
  var overlay = document.getElementById("scanOverlay");
  if (!overlay) return;
  var view = document.getElementById("scanView");
  var note = document.getElementById("scanNote");
  var numInput = document.getElementById("scanNum");
  var zoomVal = document.getElementById("scanZoomVal");
  var full = document.getElementById("scanFull");
  var geo = null, geoPromise = null;
  var state = { page: 1, zoom: 1, loc: null, locPage: null, returnFocus: null };
  var MAX_PAGE = 513;

  function pad(n) { return String(n).padStart(3, "0"); }

  function loadGeo() {
    if (geoPromise) return geoPromise;
    geoPromise = fetch("data/scan-geometry.json").then(function (r) { return r.json(); })
      .then(function (g) { geo = g; return g; })
      .catch(function () { geo = { scan_size: [1825, 2750], pages: {} }; return geo; });
    return geoPromise;
  }

  function highlightRects(page, loc) {
    var cols = geo && geo.pages && geo.pages[String(page)];
    if (!loc || !cols) return [];
    var colBy = {};
    cols.forEach(function (c) { colBy[c[0]] = c; });
    function lineY(c, ln, which) {
      var lines = colBy[c][3];
      var L = lines.filter(function (x) { return x[0] === ln; })[0] || lines[Math.min(lines.length, Math.max(1, ln)) - 1];
      return L ? L[which] : null;
    }
    var sc = loc[0], sl = loc[1], ec = loc[2], el = loc[3];
    if (!colBy[sc] || !colBy[ec]) return [];
    var rects = [];
    if (sc === ec) rects.push([colBy[sc][1], lineY(sc, sl, 1), colBy[sc][2], lineY(sc, el, 2)]);
    else {
      var last = colBy[sc][3][colBy[sc][3].length - 1];
      rects.push([colBy[sc][1], lineY(sc, sl, 1), colBy[sc][2], last ? last[2] : null]);
      rects.push([colBy[ec][1], colBy[ec][3][0][1], colBy[ec][2], lineY(ec, el, 2)]);
    }
    return rects.filter(function (r) { return r.every(function (v) { return v != null; }); });
  }

  function render() {
    var p = state.page;
    numInput.value = p;
    zoomVal.textContent = Math.round(state.zoom * 100) + "%";
    full.href = "pages/p" + pad(p) + ".jpg";
    var W = (geo && geo.scan_size && geo.scan_size[0]) || 1825;
    var H = (geo && geo.scan_size && geo.scan_size[1]) || 2750;
    var wrap = document.createElement("div");
    wrap.className = "pagewrap";
    wrap.style.width = (state.zoom * 100) + "%";
    var img = document.createElement("img");
    img.alt = "Sharagnots scan, page " + p;
    img.src = "pages/p" + pad(p) + ".jpg";
    img.onerror = function () { view.innerHTML = '<div class="state error">Scan page ' + p + " could not be loaded.</div>"; };
    wrap.appendChild(img);
    var rects = state.locPage === p ? highlightRects(p, state.loc) : [];
    rects.forEach(function (r) {
      var d = document.createElement("div");
      d.className = "hl";
      d.style.left = (100 * (r[0] - 10) / W) + "%"; d.style.width = (100 * (r[2] - r[0] + 20) / W) + "%";
      d.style.top = (100 * (r[1] - 6) / H) + "%"; d.style.height = (100 * (r[3] - r[1] + 12) / H) + "%";
      wrap.appendChild(d);
    });
    note.textContent = "Scan page " + p + " of the 1888 Sharagnots (the source of truth)."
      + (rects.length ? " The yellow band estimates where this text sits (it can be a line or two off)." : "");
    view.innerHTML = "";
    view.appendChild(wrap);
    var first = wrap.querySelector(".hl");
    if (first) setTimeout(function () { first.scrollIntoView({ block: "center", inline: "nearest" }); }, 100); else view.scrollTop = 0;
  }

  function show(page, loc, trigger) {
    state.page = Math.max(1, Math.min(MAX_PAGE, parseInt(page, 10) || 1));
    state.loc = loc || null;
    state.locPage = loc ? state.page : null;
    state.returnFocus = trigger || null;
    overlay.hidden = false;
    document.body.classList.add("scan-open");
    loadGeo().then(render);
    document.getElementById("scanClose").focus();
  }
  function hide() {
    overlay.hidden = true;
    document.body.classList.remove("scan-open");
    if (state.returnFocus && state.returnFocus.focus) state.returnFocus.focus();
  }
  function go(p) { state.page = Math.max(1, Math.min(MAX_PAGE, p)); render(); }
  function zoom(z) { state.zoom = Math.max(0.4, Math.min(4, z)); var w = view.querySelector(".pagewrap"); zoomVal.textContent = Math.round(state.zoom * 100) + "%"; if (w) w.style.width = (state.zoom * 100) + "%"; }

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest && ev.target.closest(".scan-btn[data-scan-page]");
    if (!btn) return;
    ev.preventDefault();
    var loc = (btn.getAttribute("data-scan-loc") || "").split(",").map(Number);
    show(btn.getAttribute("data-scan-page"), loc.length === 4 && loc.every(function (n) { return !isNaN(n) && n > 0; }) ? loc : null, btn);
  });
  document.getElementById("scanClose").addEventListener("click", hide);
  overlay.addEventListener("mousedown", function (ev) { if (ev.target === overlay) hide(); });
  document.getElementById("scanPrev").addEventListener("click", function () { go(state.page - 1); });
  document.getElementById("scanNext").addEventListener("click", function () { go(state.page + 1); });
  document.getElementById("scanZoomIn").addEventListener("click", function () { zoom(state.zoom * 1.25); });
  document.getElementById("scanZoomOut").addEventListener("click", function () { zoom(state.zoom / 1.25); });
  numInput.addEventListener("change", function () { go(parseInt(numInput.value, 10) || 1); });
  document.addEventListener("keydown", function (ev) {
    if (overlay.hidden) return;
    if (ev.key === "Escape") { ev.stopPropagation(); hide(); }
    else if (ev.key === "ArrowRight" && ev.target !== numInput) { ev.stopPropagation(); ev.preventDefault(); go(state.page + 1); }
    else if (ev.key === "ArrowLeft" && ev.target !== numInput) { ev.stopPropagation(); ev.preventDefault(); go(state.page - 1); }
  }, true);
  view.addEventListener("wheel", function (ev) {
    if (ev.ctrlKey) { ev.preventDefault(); zoom(state.zoom * (ev.deltaY < 0 ? 1.1 : 0.9)); }
  }, { passive: false });

  window.ScanViewer = { show: show, hide: hide };
  // deep link: ?scan=168 (optionally &loc=1,3,1,9) opens the viewer on load
  try {
    var qs = new URL(location.href).searchParams, sp = qs.get("scan");
    if (sp) {
      var lq = (qs.get("loc") || "").split(",").map(Number);
      show(sp, lq.length === 4 && lq.every(function (n) { return n > 0; }) ? lq : null, null);
    }
  } catch (e) {}
}());
