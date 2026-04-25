import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs";

const router = Router();

// ── Helper: serve an image from the conference-app assets ────────────────────
function serveAsset(res: Response, relativePath: string) {
  const abs = path.resolve(
    "/home/runner/workspace/artifacts/conference-app/assets/images",
    relativePath
  );
  if (fs.existsSync(abs)) return res.sendFile(abs);
  res.status(404).send("Image not found: " + relativePath);
}

// ── Image routes ─────────────────────────────────────────────────────────────
router.get("/admin/map-img",        (_req, res) => serveAsset(res, "exhibit-hall-map.png"));
router.get("/admin/floorplan-lake", (_req, res) => serveAsset(res, "floorplan-lake-level.png"));
router.get("/admin/floorplan-mid",  (_req, res) => serveAsset(res, "floorplan-mid-mountain.png"));
router.get("/admin/floorplan-main", (_req, res) => serveAsset(res, "floorplan-main-level.png"));

// ── Venue Overlay Calibration ─────────────────────────────────────────────────
router.get("/admin/venue-calibrate", (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Venue Overlay Editor</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;height:100vh;overflow:hidden}
#toolbar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0;flex-wrap:wrap}
#toolbar h1{font-size:14px;font-weight:700;color:#fff;white-space:nowrap}
.btn{padding:6px 12px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;transition:background .15s}
.btn-indigo{background:#4f46e5;color:#fff}.btn-indigo:hover{background:#4338ca}
.btn-green{background:#059669;color:#fff}.btn-green:hover{background:#047857}
.btn-red{background:#dc2626;color:#fff}.btn-red:hover{background:#b91c1c}
.btn-slate{background:#334155;color:#e2e8f0}.btn-slate:hover{background:#475569}
.btn-amber{background:#d97706;color:#fff}.btn-amber:hover{background:#b45309}
.btn:disabled{opacity:0.4;cursor:not-allowed}
#plan-tabs{display:flex;gap:4px;margin-left:8px}
.plan-tab{padding:5px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;background:#1e293b;color:#94a3b8;border:1px solid #334155;transition:all .15s}
.plan-tab.active{background:#4f46e5;color:#fff;border-color:#4f46e5}
#zoom-label{font-size:12px;color:#94a3b8;min-width:38px;text-align:center}
#status{font-size:11px;color:#fbbf24;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#main{flex:1;display:flex;overflow:hidden}
#sidebar{width:220px;flex-shrink:0;background:#1e293b;border-right:1px solid #334155;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
#sidebar h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:2px}
.room-row{border-radius:8px;padding:8px 10px;cursor:pointer;border:2px solid transparent;transition:all .15s}
.room-row:hover{background:#0f172a}
.room-row.active{border-color:var(--rc);background:#0f172a}
.room-name{font-size:12px;font-weight:600}
.room-rects{font-size:10px;color:#94a3b8;margin-top:2px}
.rect-chip{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;margin:2px 2px 0 0;cursor:pointer;border:1px solid transparent}
.rect-chip.selected{border-color:#fbbf24;color:#fbbf24!important}
#sidebar-actions{display:flex;flex-direction:column;gap:6px;margin-top:4px}
#wrap{flex:1;overflow:auto;position:relative;background:#1a1a2e}
canvas{display:block;cursor:crosshair}
#output-panel{position:fixed;inset:0;background:rgba(0,0,0,.8);display:none;align-items:center;justify-content:center;z-index:200}
#output-box{background:#1e293b;border-radius:12px;padding:20px;width:min(700px,95vw);max-height:90vh;display:flex;flex-direction:column;gap:10px}
#output-box h2{font-size:14px;color:#818cf8;font-weight:700}
#output-txt{flex:1;min-height:300px;background:#0f172a;color:#6ee7b7;font-size:11px;border:1px solid #334155;border-radius:6px;padding:10px;font-family:monospace;resize:vertical}
.output-actions{display:flex;gap:8px}
</style>
</head>
<body>
<div id="toolbar">
  <h1>🗺 Venue Overlay Editor</h1>
  <div id="plan-tabs">
    <div class="plan-tab active" onclick="switchPlan('lake')">Lake Level</div>
    <div class="plan-tab" onclick="switchPlan('mid')">Mid Mountain</div>
    <div class="plan-tab" onclick="switchPlan('main')">Main Level</div>
  </div>
  <button class="btn btn-slate" onclick="zoom(-0.15)">− Zoom</button>
  <span id="zoom-label">70%</span>
  <button class="btn btn-slate" onclick="zoom(0.15)">+ Zoom</button>
  <button class="btn btn-green" onclick="showOutput()">📋 Get Output</button>
  <button class="btn btn-red" onclick="resetPlan()">↩ Reset Plan</button>
  <span id="status">Select a room in the sidebar, then drag its overlay on the map.</span>
</div>

<div id="main">
  <div id="sidebar">
    <h2>Rooms</h2>
    <div id="room-list"></div>
    <div id="sidebar-actions">
      <button class="btn btn-amber" id="btn-add-rect" onclick="addRect()" disabled>+ Add Rect to Room</button>
      <button class="btn btn-red"   id="btn-del-rect" onclick="deleteRect()" disabled>✕ Delete Selected Rect</button>
    </div>
  </div>
  <div id="wrap">
    <canvas id="canvas"></canvas>
  </div>
</div>

<div id="output-panel">
  <div id="output-box">
    <h2>Updated defaultOverlays.ts — paste this into constants/defaultOverlays.ts</h2>
    <textarea id="output-txt" readonly></textarea>
    <div class="output-actions">
      <button class="btn btn-indigo" onclick="copyOutput()">Copy to Clipboard</button>
      <button class="btn btn-slate" onclick="document.getElementById('output-panel').style.display='none'">Close</button>
    </div>
  </div>
</div>

<script>
// ── Data ───────────────────────────────────────────────────────────────────────
const ROOM_COLORS = {
  "Deer Creek Ballroom":        "#f59e0b",
  "Strawberry Conference Room": "#f43f5e",
  "Dutch Conference Room":      "#14b8a6",
  "Empire Conference Room":     "#8b5cf6",
  "Jordanelle Ballroom":        "#3b82f6",
  "Hailstone Terrace":          "#22c55e",
  "Remington Hall Restaurant":  "#f97316",
};

const PLANS_DEFAULT = {
  lake: {
    nativeW: 1000, nativeH: 880,
    imgSrc: '/api/admin/floorplan-lake',
    label: 'Lake Level',
    overlays: [
      { room: "Deer Creek Ballroom",       rects: [{x:70,y:235,w:232,h:190},{x:70,y:425,w:232,h:275}] },
      { room: "Jordanelle Ballroom",        rects: [{x:370,y:360,w:310,h:475}] },
      { room: "Strawberry Conference Room", rects: [{x:718,y:235,w:252,h:140}] },
    ]
  },
  mid: {
    nativeW: 530, nativeH: 589,
    imgSrc: '/api/admin/floorplan-mid',
    label: 'Mid Mountain Level',
    overlays: [
      { room: "Empire Conference Room", rects: [{x:78,y:28,w:192,h:150}] },
      { room: "Dutch Conference Room",  rects: [{x:370,y:413,w:128,h:115}] },
    ]
  },
  main: {
    nativeW: 1163, nativeH: 767,
    imgSrc: '/api/admin/floorplan-main',
    label: 'Main Level',
    overlays: [
      { room: "Hailstone Terrace",         rects: [{x:120,y:75,w:255,h:245}] },
      { room: "Remington Hall Restaurant", rects: [{x:440,y:10,w:178,h:310}] },
    ]
  }
};

// Deep-copy so resets work
const PLANS = JSON.parse(JSON.stringify(PLANS_DEFAULT));

let currentPlanKey = 'lake';
let scale = 0.7;
let focusedOvIdx = -1;   // which overlay (room) is active in sidebar
let selOvIdx     = -1;   // selected overlay index
let selRectIdx   = -1;   // selected rect index inside selOvIdx

let dragMode  = null;
let dragStart = null;
let origRect  = null;

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
let img      = new Image();

// ── Plan switching ─────────────────────────────────────────────────────────────
function switchPlan(key) {
  currentPlanKey = key;
  selOvIdx = -1; selRectIdx = -1; focusedOvIdx = -1;
  document.querySelectorAll('.plan-tab').forEach((t,i) => {
    t.classList.toggle('active', ['lake','mid','main'][i] === key);
  });
  loadPlanImage();
  renderSidebar();
  updateButtons();
}

function currentPlan() { return PLANS[currentPlanKey]; }

function loadPlanImage() {
  const p = currentPlan();
  img = new Image();
  img.onload = () => { setZoom(scale); draw(); };
  img.src = p.imgSrc + '?t=' + Date.now();
}

// ── Zoom ───────────────────────────────────────────────────────────────────────
function setZoom(s) {
  scale = s;
  const p = currentPlan();
  canvas.width  = p.nativeW * scale;
  canvas.height = p.nativeH * scale;
  document.getElementById('zoom-label').textContent = Math.round(scale*100)+'%';
  draw();
}
function zoom(d) { setZoom(Math.max(0.2, Math.min(3, scale + d))); }

// ── Drawing ────────────────────────────────────────────────────────────────────
function hexAlpha(hex, a) {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const p = currentPlan();
  p.overlays.forEach((ov, oi) => {
    const color = ROOM_COLORS[ov.room] || '#6b7280';
    ov.rects.forEach((r, ri) => {
      const isSel = (oi === selOvIdx && ri === selRectIdx);
      const isFocus = (oi === focusedOvIdx);
      const x = r.x*scale, y = r.y*scale, w = r.w*scale, h = r.h*scale;
      ctx.fillStyle   = isSel ? hexAlpha(color,.45) : isFocus ? hexAlpha(color,.35) : hexAlpha(color,.2);
      ctx.strokeStyle = isSel ? '#fbbf24' : color;
      ctx.lineWidth   = isSel ? 2.5 : isFocus ? 2 : 1.5;
      ctx.setLineDash(isSel ? [] : []);
      ctx.beginPath(); ctx.rect(x,y,w,h); ctx.fill(); ctx.stroke();
      // Label
      ctx.fillStyle = isSel ? '#fbbf24' : color;
      ctx.font = 'bold '+Math.max(9,Math.round(11*scale))+'px sans-serif';
      const label = ov.room.split(' ')[0] + (ov.rects.length>1 ? ' '+(ri+1) : '');
      ctx.fillText(label, x+4, y+Math.max(12,Math.round(14*scale)));
      if (isSel) drawHandles(x, y, w, h);
    });
  });
}

function drawHandles(x, y, w, h) {
  const hs = 8;
  [[x,y,'nw'],[x+w/2,y,'n'],[x+w,y,'ne'],
   [x,y+h/2,'w'],[x+w,y+h/2,'e'],
   [x,y+h,'sw'],[x+w/2,y+h,'s'],[x+w,y+h,'se']].forEach(([hx,hy])=>{
    ctx.fillStyle='#fbbf24'; ctx.strokeStyle='#0f172a'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.rect(hx-hs/2, hy-hs/2, hs, hs); ctx.fill(); ctx.stroke();
  });
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function renderSidebar() {
  const p = currentPlan();
  const list = document.getElementById('room-list');
  list.innerHTML = '';
  p.overlays.forEach((ov, oi) => {
    const color = ROOM_COLORS[ov.room] || '#6b7280';
    const div = document.createElement('div');
    div.className = 'room-row' + (oi === focusedOvIdx ? ' active' : '');
    div.style.setProperty('--rc', color);
    div.innerHTML =
      '<div class="room-name" style="color:'+color+'">'+ov.room+'</div>' +
      '<div class="room-rects">' +
      ov.rects.map((r,ri) => {
        const sel = (oi===selOvIdx && ri===selRectIdx);
        return '<span class="rect-chip'+(sel?' selected':'')+'" style="background:'+color+'25;color:'+color+'" onclick="selectRect('+oi+','+ri+',event)">Rect '+(ri+1)+' ('+r.w+'×'+r.h+')</span>';
      }).join('') +
      '</div>';
    div.addEventListener('click', () => focusRoom(oi));
    list.appendChild(div);
  });
}

function focusRoom(oi) {
  focusedOvIdx = oi;
  if (selOvIdx !== oi) { selOvIdx = -1; selRectIdx = -1; }
  renderSidebar();
  updateButtons();
  draw();
  setStatus('Focused: ' + currentPlan().overlays[oi].room + ' — click a rect chip or drag a rect on the map.');
}

function selectRect(oi, ri, e) {
  if (e) e.stopPropagation();
  focusedOvIdx = oi;
  selOvIdx     = oi;
  selRectIdx   = ri;
  renderSidebar();
  updateButtons();
  draw();
  const r = currentPlan().overlays[oi].rects[ri];
  setStatus('Selected: '+currentPlan().overlays[oi].room+' Rect '+(ri+1)+' — x='+r.x+' y='+r.y+' w='+r.w+' h='+r.h);
}

function updateButtons() {
  document.getElementById('btn-add-rect').disabled  = focusedOvIdx < 0;
  document.getElementById('btn-del-rect').disabled  = selOvIdx < 0 || selRectIdx < 0;
}

// ── Add / Delete rect ─────────────────────────────────────────────────────────
function addRect() {
  if (focusedOvIdx < 0) return;
  const ov = currentPlan().overlays[focusedOvIdx];
  const p  = currentPlan();
  ov.rects.push({ x: Math.round(p.nativeW/2 - 80), y: Math.round(p.nativeH/2 - 60), w: 160, h: 120 });
  const newRi = ov.rects.length - 1;
  selectRect(focusedOvIdx, newRi, null);
  renderSidebar();
  draw();
  setStatus('Added new rect to '+ov.room+'. Drag it into position.');
}

function deleteRect() {
  if (selOvIdx < 0 || selRectIdx < 0) return;
  const ov = currentPlan().overlays[selOvIdx];
  if (ov.rects.length <= 1) { setStatus('Cannot delete the only rect for a room. Move it instead.'); return; }
  ov.rects.splice(selRectIdx, 1);
  selRectIdx = -1;
  renderSidebar();
  updateButtons();
  draw();
  setStatus('Rect deleted.');
}

// ── Mouse interaction ─────────────────────────────────────────────────────────
function imgCoords(e) {
  const r = canvas.getBoundingClientRect();
  return { x:(e.clientX-r.left)/scale, y:(e.clientY-r.top)/scale };
}

function getHandle(r, mx, my) {
  const hs = 9/scale;
  const pts = [
    [r.x,r.y,'nw'],[r.x+r.w/2,r.y,'n'],[r.x+r.w,r.y,'ne'],
    [r.x,r.y+r.h/2,'w'],[r.x+r.w,r.y+r.h/2,'e'],
    [r.x,r.y+r.h,'sw'],[r.x+r.w/2,r.y+r.h,'s'],[r.x+r.w,r.y+r.h,'se']
  ];
  for (const [px,py,name] of pts)
    if (Math.abs(mx-px)<hs && Math.abs(my-py)<hs) return name;
  return null;
}

canvas.addEventListener('mousedown', e => {
  const {x,y} = imgCoords(e);
  // Check handles on selected rect first
  if (selOvIdx >= 0 && selRectIdx >= 0) {
    const selR = currentPlan().overlays[selOvIdx].rects[selRectIdx];
    const h = getHandle(selR, x, y);
    if (h) { dragMode=h; dragStart={x,y}; origRect={...selR}; return; }
  }
  // Hit-test all rects (last overlay on top)
  const p = currentPlan();
  let hitOi=-1, hitRi=-1;
  for (let oi=p.overlays.length-1; oi>=0; oi--) {
    for (let ri=p.overlays[oi].rects.length-1; ri>=0; ri--) {
      const r=p.overlays[oi].rects[ri];
      if (x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) { hitOi=oi; hitRi=ri; break; }
    }
    if (hitOi>=0) break;
  }
  if (hitOi >= 0) {
    selectRect(hitOi, hitRi, null);
    dragMode='move'; dragStart={x,y};
    origRect={...p.overlays[hitOi].rects[hitRi]};
  } else {
    selOvIdx=-1; selRectIdx=-1; renderSidebar(); updateButtons(); draw();
  }
});

canvas.addEventListener('mousemove', e => {
  if (!dragMode || !dragStart || selOvIdx<0 || selRectIdx<0) return;
  const {x,y}=imgCoords(e);
  const dx=x-dragStart.x, dy=y-dragStart.y;
  const rect=currentPlan().overlays[selOvIdx].rects[selRectIdx];
  const o=origRect;
  if (dragMode==='move') {
    rect.x=Math.round(o.x+dx); rect.y=Math.round(o.y+dy);
  } else {
    let {x:rx,y:ry,w:rw,h:rh}=o;
    if (dragMode.includes('n')) { ry=Math.round(o.y+dy); rh=Math.round(o.h-dy); }
    if (dragMode.includes('s')) { rh=Math.round(o.h+dy); }
    if (dragMode.includes('w')) { rx=Math.round(o.x+dx); rw=Math.round(o.w-dx); }
    if (dragMode.includes('e')) { rw=Math.round(o.w+dx); }
    rect.x=rx; rect.y=ry; rect.w=Math.max(10,rw); rect.h=Math.max(10,rh);
  }
  draw();
  const r=rect;
  setStatus('x='+r.x+' y='+r.y+' w='+r.w+' h='+r.h);
  // Update sidebar chip text live
  const chips=document.querySelectorAll('.rect-chip');
  chips.forEach(c=>{
    const txt=c.textContent;
    if(c.classList.contains('selected')) c.textContent='Rect '+(selRectIdx+1)+' ('+r.w+'×'+r.h+')';
  });
});

canvas.addEventListener('mouseup', () => { dragMode=null; dragStart=null; origRect=null; renderSidebar(); });
canvas.addEventListener('mouseleave', () => { dragMode=null; dragStart=null; origRect=null; });

// Touch
function touchToMouse(e, type) {
  const t = (e.touches[0] || e.changedTouches[0]);
  if (t) canvas.dispatchEvent(new MouseEvent(type, {clientX:t.clientX, clientY:t.clientY, bubbles:true}));
  e.preventDefault();
}
canvas.addEventListener('touchstart', e=>touchToMouse(e,'mousedown'), {passive:false});
canvas.addEventListener('touchmove',  e=>touchToMouse(e,'mousemove'), {passive:false});
canvas.addEventListener('touchend',   e=>touchToMouse(e,'mouseup'),   {passive:false});

// ── Reset ──────────────────────────────────────────────────────────────────────
function resetPlan() {
  const defaults = ${JSON.stringify(PLANS_DEFAULT)};
  PLANS[currentPlanKey] = JSON.parse(JSON.stringify(defaults[currentPlanKey]));
  selOvIdx=-1; selRectIdx=-1; focusedOvIdx=-1;
  renderSidebar(); updateButtons(); draw();
  setStatus('Plan reset to defaults.');
}

// ── Output ────────────────────────────────────────────────────────────────────
function showOutput() {
  let out = 'export const DEFAULT_OVERLAYS: Record<string, PlanData> = {\\n';
  for (const [key, plan] of Object.entries(PLANS)) {
    out += '  ' + key + ': {\\n';
    out += '    nativeW: ' + plan.nativeW + ', nativeH: ' + plan.nativeH + ',\\n';
    out += '    overlays: [\\n';
    plan.overlays.forEach(ov => {
      out += '      { room: "' + ov.room + '",\\n';
      out += '        rects: [\\n';
      ov.rects.forEach(r => {
        out += '          { x: '+r.x+', y: '+r.y+', w: '+r.w+', h: '+r.h+' },\\n';
      });
      out += '        ] },\\n';
    });
    out += '    ],\\n  },\\n';
  }
  out += '};\\n';
  document.getElementById('output-txt').value = out;
  document.getElementById('output-panel').style.display = 'flex';
}

function copyOutput() {
  const ta = document.getElementById('output-txt');
  ta.select(); document.execCommand('copy');
  setStatus('Copied to clipboard! Paste into artifacts/conference-app/constants/defaultOverlays.ts');
}

function setStatus(s) { document.getElementById('status').textContent = s; }

// ── Init ──────────────────────────────────────────────────────────────────────
renderSidebar();
loadPlanImage();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ── Exhibit Hall Booth Zone Calibration (existing) ────────────────────────────
router.get("/admin/map-calibrate", (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Booth Zone Editor</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;height:100vh;overflow:hidden}
#toolbar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0;flex-wrap:wrap}
#toolbar h1{font-size:14px;font-weight:700;color:#fff;white-space:nowrap}
.btn{padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600}
.btn-indigo{background:#4f46e5;color:#fff}.btn-indigo:hover{background:#4338ca}
.btn-green{background:#059669;color:#fff}.btn-green:hover{background:#047857}
.btn-red{background:#dc2626;color:#fff}.btn-red:hover{background:#b91c1c}
.btn-slate{background:#334155;color:#e2e8f0}.btn-slate:hover{background:#475569}
#zoom-label{font-size:12px;color:#94a3b8;min-width:42px;text-align:center}
#status{font-size:11px;color:#fbbf24;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#wrap{flex:1;overflow:auto;position:relative;cursor:default}
#canvas{display:block;position:absolute;top:0;left:0}
#output-panel{position:fixed;bottom:0;left:0;right:0;background:#0f172a;border-top:2px solid #4f46e5;padding:12px;display:none;z-index:100}
#output-panel h2{font-size:13px;margin-bottom:6px;color:#818cf8}
#output-txt{width:100%;height:120px;background:#1e293b;color:#6ee7b7;font-size:10px;border:1px solid #334155;border-radius:6px;padding:6px;font-family:monospace}
</style>
</head>
<body>
<div id="toolbar">
  <h1>🗺 Booth Zone Editor</h1>
  <button class="btn btn-slate" onclick="zoom(-0.2)">− Zoom</button>
  <span id="zoom-label">50%</span>
  <button class="btn btn-slate" onclick="zoom(0.2)">+ Zoom</button>
  <button class="btn btn-indigo" onclick="toggleLabels()">Toggle Labels</button>
  <button class="btn btn-green" onclick="showOutput()">📋 Copy Output</button>
  <button class="btn btn-red" onclick="resetAll()">↩ Reset</button>
  <span id="status">Click a zone to select it, then drag to reposition. Drag edges/corners to resize.</span>
</div>
<div id="wrap">
  <canvas id="canvas"></canvas>
</div>
<div id="output-panel">
  <h2>Updated BOOTH_ZONES — paste into exhibit-hall.tsx</h2>
  <textarea id="output-txt" readonly></textarea>
  <button class="btn btn-slate" style="margin-top:6px" onclick="document.getElementById('output-panel').style.display='none'">Close</button>
  <button class="btn btn-indigo" style="margin-top:6px;margin-left:6px" onclick="copyOutput()">Copy to Clipboard</button>
</div>
<script>
const IMG_W=1824,IMG_H=2362;
let scale=0.5,showLabels=true,selectedIdx=-1,dragMode=null,dragStart=null,origRect=null;
const ZONES=[
  {id:"98",x:367,y:-3,w:132,h:143},{id:"99",x:503,y:-5,w:132,h:145},
  {id:"100",x:645,y:1,w:132,h:139},{id:"102",x:783,y:-1,w:132,h:143},
  {id:"104",x:917,y:1,w:132,h:141},{id:"106",x:1053,y:1,w:132,h:141},
  {id:"108",x:1187,y:3,w:132,h:141},{id:"110",x:1323,y:1,w:132,h:141},
  {id:"112",x:1459,y:-3,w:132,h:141},
  {id:"101",x:696,y:290,w:132,h:140},{id:"103",x:834,y:290,w:132,h:138},
  {id:"105",x:968,y:290,w:132,h:136},{id:"107",x:1108,y:294,w:132,h:138},
  {id:"109",x:1246,y:294,w:132,h:136},{id:"111",x:1380,y:292,w:132,h:138},
  {id:"202",x:740,y:443,w:169,h:143},{id:"204",x:920,y:445,w:173,h:139},
  {id:"206",x:1111,y:531,w:141,h:83},{id:"210",x:1353,y:443,w:137,h:141},
  {id:"200",x:300,y:545,w:144,h:168},{id:"300",x:308,y:951,w:150,h:133},
  {id:"400",x:314,y:1790,w:134,h:171},{id:"500",x:302,y:1965,w:150,h:169},
  {id:"302",x:393,y:1088,w:72,h:150},{id:"401",x:395,y:1633,w:72,h:150},
  {id:"212",x:1684,y:537,w:140,h:273},{id:"314",x:1686,y:820,w:140,h:161},
  {id:"313",x:1676,y:1234,w:154,h:155},{id:"414",x:1684,y:1400,w:142,h:155},
  {id:"516",x:1682,y:1818,w:144,h:141},{id:"515",x:1684,y:1965,w:142,h:265},
  {id:"315",x:1654,y:1008,w:72,h:130},{id:"415",x:1658,y:1616,w:72,h:130},
  {id:"201",x:639,y:790,w:125,h:285},{id:"203",x:775,y:790,w:137,h:137},
  {id:"205",x:917,y:790,w:131,h:145},{id:"207",x:1055,y:790,w:263,h:145},
  {id:"211",x:1323,y:786,w:175,h:145},
  {id:"304",x:773,y:935,w:139,h:134},{id:"306",x:917,y:935,w:135,h:140},
  {id:"308",x:1057,y:931,w:133,h:140},{id:"310",x:1194,y:937,w:131,h:140},
  {id:"312",x:1330,y:933,w:165,h:140},
  {id:"301",x:643,y:1266,w:162,h:140},{id:"303",x:819,y:1262,w:132,h:140},
  {id:"305",x:953,y:1266,w:130,h:140},{id:"307",x:1084,y:1268,w:142,h:140},
  {id:"309",x:1228,y:1270,w:134,h:140},{id:"311",x:1370,y:1270,w:128,h:140},
  {id:"402",x:643,y:1404,w:170,h:145},{id:"404",x:819,y:1406,w:132,h:145},
  {id:"406",x:953,y:1404,w:132,h:145},{id:"408",x:1090,y:1410,w:136,h:145},
  {id:"410",x:1228,y:1410,w:132,h:145},{id:"412",x:1370,y:1410,w:128,h:145},
  {id:"403",x:781,y:1743,w:134,h:145},{id:"405",x:915,y:1743,w:132,h:145},
  {id:"407",x:1050,y:1745,w:152,h:145},{id:"409",x:1194,y:1745,w:152,h:145},
  {id:"411",x:1346,y:1745,w:152,h:145},
  {id:"502",x:625,y:1736,w:150,h:296},{id:"504",x:781,y:1890,w:136,h:150},
  {id:"506",x:917,y:1886,w:138,h:150},{id:"508",x:1050,y:1890,w:152,h:150},
  {id:"510",x:1196,y:1890,w:152,h:150},{id:"512",x:1342,y:1888,w:152,h:150},
  {id:"501",x:406,y:2225,w:140,h:130},{id:"503",x:554,y:2227,w:160,h:130},
  {id:"505",x:726,y:2201,w:142,h:88},{id:"507",x:906,y:2225,w:160,h:130},
  {id:"509",x:1072,y:2223,w:146,h:130},{id:"511",x:1256,y:2205,w:140,h:88},
  {id:"513",x:1418,y:2231,w:130,h:130},{id:"514",x:1554,y:2231,w:130,h:130},
];
const ORIGINAL=JSON.parse(JSON.stringify(ZONES));
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d');
const img=new Image();
img.src='/api/admin/map-img';
img.onload=()=>{setZoom(scale);draw();};
function setZoom(s){scale=s;canvas.width=IMG_W*scale;canvas.height=IMG_H*scale;document.getElementById('zoom-label').textContent=Math.round(scale*100)+'%';draw();}
function zoom(d){setZoom(Math.max(0.2,Math.min(2,scale+d)));}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(img.complete)ctx.drawImage(img,0,0,IMG_W*scale,IMG_H*scale);
  ZONES.forEach((z,i)=>{
    const sel=i===selectedIdx;
    const x=z.x*scale,y=z.y*scale,w=z.w*scale,h=z.h*scale;
    ctx.strokeStyle=sel?'#fbbf24':'rgba(239,68,68,0.85)';
    ctx.lineWidth=sel?2.5:1.5;
    ctx.fillStyle=sel?'rgba(251,191,36,0.22)':'rgba(239,68,68,0.15)';
    ctx.beginPath();ctx.rect(x,y,w,h);ctx.fill();ctx.stroke();
    if(showLabels){ctx.fillStyle=sel?'#fbbf24':'#ef4444';ctx.font='bold '+Math.max(8,Math.round(11*scale))+'px monospace';ctx.fillText(z.id,x+3,y+Math.max(10,Math.round(13*scale)));}
    if(sel)drawHandles(x,y,w,h);
  });
}
function drawHandles(x,y,w,h){const hs=7;[[x,y,'nw'],[x+w/2,y,'n'],[x+w,y,'ne'],[x,y+h/2,'w'],[x+w,y+h/2,'e'],[x,y+h,'sw'],[x+w/2,y+h,'s'],[x+w,y+h,'se']].forEach(([hx,hy])=>{ctx.fillStyle='#fbbf24';ctx.strokeStyle='#1e293b';ctx.lineWidth=1.5;ctx.beginPath();ctx.rect(hx-hs/2,hy-hs/2,hs,hs);ctx.fill();ctx.stroke();});}
function imgCoords(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale};}
function getHandle(z,mx,my){const hs=7/scale;const pts=[[z.x,z.y,'nw'],[z.x+z.w/2,z.y,'n'],[z.x+z.w,z.y,'ne'],[z.x,z.y+z.h/2,'w'],[z.x+z.w,z.y+z.h/2,'e'],[z.x,z.y+z.h,'sw'],[z.x+z.w/2,z.y+z.h,'s'],[z.x+z.w,z.y+z.h,'se']];for(const[px,py,name]of pts)if(Math.abs(mx-px)<hs&&Math.abs(my-py)<hs)return name;return null;}
canvas.addEventListener('mousedown',e=>{const{x,y}=imgCoords(e);if(selectedIdx>=0){const h=getHandle(ZONES[selectedIdx],x,y);if(h){dragMode=h;dragStart={x,y};origRect={...ZONES[selectedIdx]};return;}}for(let i=ZONES.length-1;i>=0;i--){const z=ZONES[i];if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h){selectedIdx=i;dragMode='move';dragStart={x,y};origRect={...z};setStatus('Selected booth '+z.id);draw();return;}}selectedIdx=-1;dragMode=null;draw();});
canvas.addEventListener('mousemove',e=>{if(!dragMode||!dragStart)return;const{x,y}=imgCoords(e);const dx=x-dragStart.x,dy=y-dragStart.y;const z=ZONES[selectedIdx],o=origRect;if(dragMode==='move'){z.x=Math.round(o.x+dx);z.y=Math.round(o.y+dy);}else{let{x:zx,y:zy,w:zw,h:zh}=o;if(dragMode.includes('n')){zy=Math.round(o.y+dy);zh=Math.round(o.h-dy);}if(dragMode.includes('s')){zh=Math.round(o.h+dy);}if(dragMode.includes('w')){zx=Math.round(o.x+dx);zw=Math.round(o.w-dx);}if(dragMode.includes('e')){zw=Math.round(o.w+dx);}z.x=zx;z.y=zy;z.w=Math.max(10,zw);z.h=Math.max(10,zh);}draw();setStatus('Booth '+z.id+': x='+z.x+' y='+z.y+' w='+z.w+' h='+z.h);});
canvas.addEventListener('mouseup',()=>{dragMode=null;dragStart=null;origRect=null;});
canvas.addEventListener('mouseleave',()=>{dragMode=null;dragStart=null;origRect=null;});
function touchToMouse(e,type){if(e.touches.length>0){const t=e.touches[0];canvas.dispatchEvent(new MouseEvent(type,{clientX:t.clientX,clientY:t.clientY,bubbles:true}));}else if(e.changedTouches.length>0){const t=e.changedTouches[0];canvas.dispatchEvent(new MouseEvent(type,{clientX:t.clientX,clientY:t.clientY,bubbles:true}));}e.preventDefault();}
canvas.addEventListener('touchstart',e=>touchToMouse(e,'mousedown'),{passive:false});
canvas.addEventListener('touchmove',e=>touchToMouse(e,'mousemove'),{passive:false});
canvas.addEventListener('touchend',e=>touchToMouse(e,'mouseup'),{passive:false});
function toggleLabels(){showLabels=!showLabels;draw();}
function resetAll(){ZONES.forEach((z,i)=>{z.x=ORIGINAL[i].x;z.y=ORIGINAL[i].y;z.w=ORIGINAL[i].w;z.h=ORIGINAL[i].h;});draw();setStatus('Zones reset to defaults.');}
function setStatus(s){document.getElementById('status').textContent=s;}
function showOutput(){const lines=ZONES.map(z=>'  { id:"'+z.id+'", x:'+z.x+', y:'+z.y+', w:'+z.w+', h:'+z.h+' },');document.getElementById('output-txt').value=lines.join('\\n');document.getElementById('output-panel').style.display='block';}
function copyOutput(){const ta=document.getElementById('output-txt');ta.select();document.execCommand('copy');setStatus('Copied to clipboard!');}
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
