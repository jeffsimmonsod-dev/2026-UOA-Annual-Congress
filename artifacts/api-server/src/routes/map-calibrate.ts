import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs";

const router = Router();

// GET /admin/map-calibrate — coordinate picker to measure booth zones
router.get("/admin/map-calibrate", (_req: Request, res: Response) => {
  const imgPath = path.join(
    __dirname,
    "../../../../conference-app/assets/images/exhibit-hall-map.png"
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Map Calibration</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #0f172a; color: #e2e8f0; display: flex; height: 100vh; overflow: hidden; }
    #sidebar { width: 320px; min-width: 320px; background: #1e293b; padding: 12px; overflow-y: auto; border-right: 1px solid #334155; }
    #sidebar h2 { font-size: 14px; margin-bottom: 8px; color: #94a3b8; }
    #info { font-size: 13px; line-height: 1.8; margin-bottom: 12px; padding: 8px; background: #0f172a; border-radius: 6px; }
    #clicks { font-size: 11px; max-height: 300px; overflow-y: auto; }
    .click-entry { padding: 4px 6px; border-bottom: 1px solid #334155; color: #7dd3fc; cursor: pointer; }
    .click-entry:hover { background: #1e3a5f; }
    #map-wrap { flex: 1; overflow: auto; background: #0f172a; position: relative; }
    #map-img { display: block; cursor: crosshair; }
    .dot { position: absolute; width: 10px; height: 10px; background: red; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; border: 2px solid white; }
    .rect-overlay { position: absolute; border: 2px solid rgba(255,0,0,0.8); background: rgba(255,0,0,0.15); pointer-events: none; }
    .rect-label { position: absolute; font-size: 9px; color: red; font-weight: bold; background: rgba(0,0,0,0.7); padding: 1px 3px; }
    #clear-btn { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 8px; width: 100%; }
    #zoom-wrap { margin-top: 8px; display: flex; gap: 6px; }
    #zoom-wrap button { flex: 1; background: #334155; color: #e2e8f0; border: none; padding: 4px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    #mode-toggle { display: flex; gap: 6px; margin-bottom: 10px; }
    #mode-toggle button { flex: 1; padding: 6px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
    .active-mode { background: #4f46e5; color: white; }
    .inactive-mode { background: #334155; color: #94a3b8; }
  </style>
</head>
<body>
<div id="sidebar">
  <h2>Booth Zone Calibrator</h2>
  <div id="mode-toggle">
    <button id="dot-mode" class="active-mode" onclick="setMode('dot')">📍 Click coords</button>
    <button id="rect-mode" class="inactive-mode" onclick="setMode('rect')">⬜ Draw rect</button>
  </div>
  <div id="info">Click on the image to see coordinates.<br>In rect mode: click top-left then bottom-right of a booth.</div>
  <div id="clicks"></div>
  <div id="zoom-wrap">
    <button onclick="zoom(-0.25)">Zoom −</button>
    <span id="zoom-label" style="flex:1;text-align:center;line-height:1.8;font-size:12px;">100%</span>
    <button onclick="zoom(0.25)">Zoom +</button>
  </div>
  <button id="clear-btn" onclick="clearAll()">Clear all markers</button>
  <h2 style="margin-top:16px;">Recorded zones (copy ↓)</h2>
  <textarea id="output" style="width:100%;height:200px;background:#0f172a;color:#6ee7b7;font-size:10px;border:1px solid #334155;border-radius:4px;padding:4px;margin-top:4px;" readonly></textarea>
</div>
<div id="map-wrap">
  <div id="map-container" style="position:relative;display:inline-block;">
    <img id="map-img" src="/admin/map-img" draggable="false" />
  </div>
</div>
<script>
  let scale = 1;
  let mode = 'dot';
  let clicks = [];
  let rects = [];
  let rectStart = null;
  let boothIdPrompt = null;
  const IMG_W = 1824, IMG_H = 2362;

  function setMode(m) {
    mode = m;
    document.getElementById('dot-mode').className = m === 'dot' ? 'active-mode' : 'inactive-mode';
    document.getElementById('rect-mode').className = m === 'rect' ? 'active-mode' : 'inactive-mode';
    document.getElementById('info').textContent = m === 'dot'
      ? 'Click anywhere to record image coordinates.'
      : 'Click top-left corner of a booth, then bottom-right to draw a zone.';
    rectStart = null;
  }

  function zoom(delta) {
    scale = Math.max(0.25, Math.min(4, scale + delta));
    document.getElementById('map-img').style.width = (IMG_W * scale) + 'px';
    document.getElementById('map-img').style.height = (IMG_H * scale) + 'px';
    document.getElementById('zoom-label').textContent = Math.round(scale * 100) + '%';
    redrawOverlays();
  }

  function toImgCoords(ex, ey) {
    const rect = document.getElementById('map-img').getBoundingClientRect();
    const wrap = document.getElementById('map-wrap');
    const x = Math.round((ex - rect.left) / scale);
    const y = Math.round((ey - rect.top) / scale);
    return { x, y };
  }

  document.getElementById('map-wrap').addEventListener('click', function(e) {
    const { x, y } = toImgCoords(e.clientX, e.clientY);
    if (x < 0 || y < 0 || x > IMG_W || y > IMG_H) return;

    if (mode === 'dot') {
      clicks.push({ x, y });
      addDot(x, y);
      updateClickList();
    } else {
      if (!rectStart) {
        rectStart = { x, y };
        document.getElementById('info').textContent = 'Now click the bottom-right corner.';
      } else {
        const id = prompt('Booth ID (e.g. 308):') || '?';
        const rx = Math.min(rectStart.x, x), ry = Math.min(rectStart.y, y);
        const rw = Math.abs(x - rectStart.x), rh = Math.abs(y - rectStart.y);
        rects.push({ id, x: rx, y: ry, w: rw, h: rh });
        addRect(rx, ry, rw, rh, id);
        rectStart = null;
        document.getElementById('info').textContent = 'Draw next booth, or switch mode.';
        updateOutput();
      }
    }
  });

  function addDot(x, y) {
    const d = document.createElement('div');
    d.className = 'dot';
    d.style.left = (x * scale) + 'px';
    d.style.top = (y * scale) + 'px';
    document.getElementById('map-container').appendChild(d);
  }

  function addRect(x, y, w, h, id) {
    const r = document.createElement('div');
    r.className = 'rect-overlay';
    r.style.left = (x * scale) + 'px';
    r.style.top = (y * scale) + 'px';
    r.style.width = (w * scale) + 'px';
    r.style.height = (h * scale) + 'px';
    const l = document.createElement('div');
    l.className = 'rect-label';
    l.style.left = (x * scale) + 'px';
    l.style.top = (y * scale) + 'px';
    l.textContent = id;
    document.getElementById('map-container').appendChild(r);
    document.getElementById('map-container').appendChild(l);
  }

  function redrawOverlays() {
    const c = document.getElementById('map-container');
    c.querySelectorAll('.dot,.rect-overlay,.rect-label').forEach(el => el.remove());
    clicks.forEach(p => addDot(p.x, p.y));
    rects.forEach(r => addRect(r.x, r.y, r.w, r.h, r.id));
  }

  function updateClickList() {
    const el = document.getElementById('clicks');
    el.innerHTML = clicks.slice(-30).reverse().map((p, i) =>
      '<div class="click-entry">x=' + p.x + ' y=' + p.y + '</div>'
    ).join('');
  }

  function updateOutput() {
    const lines = rects.map(r =>
      '{ id:"' + r.id + '", x:' + r.x + ', y:' + r.y + ', w:' + r.w + ', h:' + r.h + ' },'
    );
    document.getElementById('output').value = lines.join('\\n');
  }

  function clearAll() {
    clicks = []; rects = []; rectStart = null;
    document.getElementById('map-container').querySelectorAll('.dot,.rect-overlay,.rect-label').forEach(el => el.remove());
    document.getElementById('clicks').innerHTML = '';
    document.getElementById('output').value = '';
  }

  // Initial load
  document.getElementById('map-img').onload = function() {
    this.style.width = (IMG_W * scale) + 'px';
    this.style.height = (IMG_H * scale) + 'px';
  };
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// Serve the map image directly
router.get("/admin/map-img", (_req: Request, res: Response) => {
  const imgPath = path.resolve(
    __dirname,
    "../../../../conference-app/assets/images/exhibit-hall-map.png"
  );
  if (fs.existsSync(imgPath)) {
    res.sendFile(imgPath);
  } else {
    res.status(404).send("Image not found");
  }
});

export default router;
