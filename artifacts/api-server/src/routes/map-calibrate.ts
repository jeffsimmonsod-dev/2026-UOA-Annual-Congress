import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs";

const router = Router();

// Serve the map image
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

// GET /admin/map-calibrate — interactive drag-to-fix booth zone editor
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
  <h2>Updated BOOTH_ZONES — paste these lines into exhibit-hall.tsx</h2>
  <textarea id="output-txt" readonly></textarea>
  <button class="btn btn-slate" style="margin-top:6px" onclick="document.getElementById('output-panel').style.display='none'">Close</button>
  <button class="btn btn-indigo" style="margin-top:6px;margin-left:6px" onclick="copyOutput()">Copy to Clipboard</button>
</div>

<script>
const IMG_W = 1824, IMG_H = 2362;
let scale = 0.5;
let showLabels = true;
let selectedIdx = -1;
let dragMode = null; // 'move'|'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'
let dragStart = null;
let origRect = null;

const ZONES = [
  // Foyer top row
  {id:"98",  x:355, y:65,  w:132, h:205},
  {id:"99",  x:493, y:65,  w:132, h:205},
  {id:"100", x:631, y:65,  w:132, h:205},
  {id:"102", x:769, y:65,  w:132, h:205},
  {id:"104", x:905, y:65,  w:132, h:205},
  {id:"106", x:1041,y:65,  w:132, h:205},
  {id:"108", x:1177,y:65,  w:132, h:205},
  {id:"110", x:1313,y:65,  w:132, h:205},
  {id:"112", x:1449,y:65,  w:132, h:205},
  // Foyer bottom row
  {id:"101", x:670, y:330, w:132, h:200},
  {id:"103", x:808, y:330, w:132, h:200},
  {id:"105", x:946, y:330, w:132, h:200},
  {id:"107", x:1082,y:330, w:132, h:200},
  {id:"109", x:1218,y:330, w:132, h:200},
  {id:"111", x:1354,y:330, w:132, h:200},
  // Top ballroom row
  {id:"202", x:670, y:615, w:175, h:155},
  {id:"204", x:856, y:615, w:175, h:155},
  {id:"206", x:1025,y:615, w:135, h:155},
  {id:"210", x:1255,y:615, w:175, h:155},
  // Left wall
  {id:"200", x:110, y:635, w:178, h:250},
  {id:"300", x:110, y:1065,w:178, h:205},
  {id:"400", x:110, y:1362,w:178, h:225},
  {id:"500", x:110, y:1745,w:178, h:205},
  // Narrow left
  {id:"302", x:295, y:1178,w:72,  h:150},
  {id:"401", x:295, y:1505,w:72,  h:150},
  // Right wall
  {id:"212", x:1648,y:635, w:178, h:195},
  {id:"314", x:1648,y:1050,w:178, h:155},
  {id:"313", x:1648,y:1218,w:178, h:155},
  {id:"414", x:1648,y:1400,w:178, h:155},
  {id:"516", x:1648,y:1790,w:178, h:145},
  {id:"515", x:1648,y:1965,w:178, h:145},
  // Narrow right
  {id:"315", x:1570,y:1230,w:72,  h:130},
  {id:"415", x:1570,y:1508,w:72,  h:130},
  // P1a
  {id:"201", x:595, y:790, w:155, h:145},
  {id:"203", x:757, y:790, w:155, h:145},
  {id:"205", x:917, y:790, w:155, h:145},
  {id:"207", x:1077,y:790, w:155, h:145},
  {id:"211", x:1317,y:790, w:155, h:145},
  // P1b
  {id:"304", x:757, y:935, w:155, h:140},
  {id:"306", x:917, y:935, w:155, h:140},
  {id:"308", x:1077,y:935, w:155, h:140},
  {id:"310", x:1240,y:935, w:155, h:140},
  {id:"312", x:1402,y:935, w:155, h:140},
  // P2a
  {id:"301", x:575, y:1270,w:152, h:140},
  {id:"303", x:733, y:1270,w:152, h:140},
  {id:"305", x:891, y:1270,w:152, h:140},
  {id:"307", x:1050,y:1270,w:152, h:140},
  {id:"309", x:1210,y:1270,w:152, h:140},
  {id:"311", x:1370,y:1270,w:152, h:140},
  // P2b
  {id:"402", x:575, y:1410,w:152, h:145},
  {id:"404", x:733, y:1410,w:152, h:145},
  {id:"406", x:891, y:1410,w:152, h:145},
  {id:"408", x:1050,y:1410,w:152, h:145},
  {id:"410", x:1210,y:1410,w:152, h:145},
  {id:"412", x:1370,y:1410,w:152, h:145},
  // P3a
  {id:"403", x:733, y:1745,w:152, h:145},
  {id:"405", x:891, y:1745,w:152, h:145},
  {id:"407", x:1050,y:1745,w:152, h:145},
  {id:"409", x:1210,y:1745,w:152, h:145},
  {id:"411", x:1370,y:1745,w:152, h:145},
  // P3b
  {id:"502", x:575, y:1890,w:152, h:150},
  {id:"504", x:733, y:1890,w:152, h:150},
  {id:"506", x:891, y:1890,w:152, h:150},
  {id:"508", x:1050,y:1890,w:152, h:150},
  {id:"510", x:1210,y:1890,w:152, h:150},
  {id:"512", x:1370,y:1890,w:152, h:150},
  // Bottom row
  {id:"501", x:380, y:2225,w:140, h:130},
  {id:"503", x:528, y:2225,w:140, h:130},
  {id:"505", x:678, y:2225,w:140, h:130},
  {id:"507", x:1000,y:2225,w:140, h:130},
  {id:"509", x:1148,y:2225,w:140, h:130},
  {id:"511", x:1254,y:2225,w:140, h:130},
  {id:"513", x:1562,y:2225,w:130, h:130},
  {id:"514", x:1698,y:2225,w:130, h:130},
];

// Deep copy for reset
const ORIGINAL = JSON.parse(JSON.stringify(ZONES));

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = '/api/admin/map-img';
img.onload = () => { setZoom(scale); draw(); };

function setZoom(s) {
  scale = s;
  canvas.width  = IMG_W * scale;
  canvas.height = IMG_H * scale;
  document.getElementById('zoom-label').textContent = Math.round(scale*100)+'%';
  draw();
}
function zoom(d) { setZoom(Math.max(0.2, Math.min(2, scale + d))); }

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (img.complete) ctx.drawImage(img, 0, 0, IMG_W*scale, IMG_H*scale);
  ZONES.forEach((z, i) => {
    const sel = i === selectedIdx;
    const x = z.x*scale, y = z.y*scale, w = z.w*scale, h = z.h*scale;
    ctx.strokeStyle = sel ? '#fbbf24' : 'rgba(239,68,68,0.85)';
    ctx.lineWidth = sel ? 2.5 : 1.5;
    ctx.fillStyle = sel ? 'rgba(251,191,36,0.22)' : 'rgba(239,68,68,0.15)';
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    if (showLabels) {
      ctx.fillStyle = sel ? '#fbbf24' : '#ef4444';
      ctx.font = 'bold ' + Math.max(8, Math.round(11*scale)) + 'px monospace';
      ctx.fillText(z.id, x+3, y+Math.max(10, Math.round(13*scale)));
    }
    if (sel) drawHandles(x, y, w, h);
  });
}

function drawHandles(x, y, w, h) {
  const hs = 7;
  [[x,y,'nw'],[x+w/2,y,'n'],[x+w,y,'ne'],
   [x,y+h/2,'w'],[x+w,y+h/2,'e'],
   [x,y+h,'sw'],[x+w/2,y+h,'s'],[x+w,y+h,'se']].forEach(([hx,hy])=>{
    ctx.fillStyle='#fbbf24'; ctx.strokeStyle='#1e293b'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.rect(hx-hs/2, hy-hs/2, hs, hs); ctx.fill(); ctx.stroke();
  });
}

function imgCoords(e) {
  const r = canvas.getBoundingClientRect();
  return { x:(e.clientX-r.left)/scale, y:(e.clientY-r.top)/scale };
}

function getHandle(z, mx, my) {
  const hs = 7/scale;
  const pts = [
    [z.x,z.y,'nw'],[z.x+z.w/2,z.y,'n'],[z.x+z.w,z.y,'ne'],
    [z.x,z.y+z.h/2,'w'],[z.x+z.w,z.y+z.h/2,'e'],
    [z.x,z.y+z.h,'sw'],[z.x+z.w/2,z.y+z.h,'s'],[z.x+z.w,z.y+z.h,'se']
  ];
  for (const [px,py,name] of pts) {
    if (Math.abs(mx-px)<hs && Math.abs(my-py)<hs) return name;
  }
  return null;
}

canvas.addEventListener('mousedown', e => {
  const {x,y} = imgCoords(e);
  // Check selected zone handles first
  if (selectedIdx>=0) {
    const h = getHandle(ZONES[selectedIdx], x, y);
    if (h) {
      dragMode = h; dragStart={x,y};
      origRect = {...ZONES[selectedIdx]};
      return;
    }
  }
  // Check all zones for hit
  for (let i=ZONES.length-1; i>=0; i--) {
    const z=ZONES[i];
    if (x>=z.x && x<=z.x+z.w && y>=z.y && y<=z.y+z.h) {
      selectedIdx=i; dragMode='move'; dragStart={x,y};
      origRect={...z};
      setStatus('Selected booth '+z.id+' — drag to reposition, drag handles to resize');
      draw(); return;
    }
  }
  selectedIdx=-1; dragMode=null; draw();
});

canvas.addEventListener('mousemove', e => {
  if (!dragMode || !dragStart) return;
  const {x,y} = imgCoords(e);
  const dx=x-dragStart.x, dy=y-dragStart.y;
  const z=ZONES[selectedIdx], o=origRect;
  if (dragMode==='move') {
    z.x=Math.round(o.x+dx); z.y=Math.round(o.y+dy);
  } else {
    let {x:zx,y:zy,w:zw,h:zh}=o;
    if (dragMode.includes('n')) { zy=Math.round(o.y+dy); zh=Math.round(o.h-dy); }
    if (dragMode.includes('s')) { zh=Math.round(o.h+dy); }
    if (dragMode.includes('w')) { zx=Math.round(o.x+dx); zw=Math.round(o.w-dx); }
    if (dragMode.includes('e')) { zw=Math.round(o.w+dx); }
    z.x=zx; z.y=zy; z.w=Math.max(10,zw); z.h=Math.max(10,zh);
  }
  draw();
  setStatus('Booth '+z.id+': x='+z.x+' y='+z.y+' w='+z.w+' h='+z.h);
});

canvas.addEventListener('mouseup', () => { dragMode=null; dragStart=null; origRect=null; });
canvas.addEventListener('mouseleave', () => { dragMode=null; dragStart=null; origRect=null; });

// Touch support
function touchToMouse(e, type) {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    canvas.dispatchEvent(new MouseEvent(type, {clientX:t.clientX, clientY:t.clientY, bubbles:true}));
  } else if (e.changedTouches.length > 0) {
    const t = e.changedTouches[0];
    canvas.dispatchEvent(new MouseEvent(type, {clientX:t.clientX, clientY:t.clientY, bubbles:true}));
  }
  e.preventDefault();
}
canvas.addEventListener('touchstart', e=>touchToMouse(e,'mousedown'), {passive:false});
canvas.addEventListener('touchmove',  e=>touchToMouse(e,'mousemove'), {passive:false});
canvas.addEventListener('touchend',   e=>touchToMouse(e,'mouseup'),   {passive:false});

function toggleLabels() { showLabels=!showLabels; draw(); }
function resetAll() {
  ZONES.forEach((z,i)=>{ z.x=ORIGINAL[i].x; z.y=ORIGINAL[i].y; z.w=ORIGINAL[i].w; z.h=ORIGINAL[i].h; });
  draw(); setStatus('Zones reset to defaults.');
}
function setStatus(s) { document.getElementById('status').textContent=s; }

function showOutput() {
  const lines = ZONES.map(z =>
    '  { id:"'+z.id+'", x:'+z.x+', y:'+z.y+', w:'+z.w+', h:'+z.h+' },'
  );
  document.getElementById('output-txt').value = lines.join('\\n');
  document.getElementById('output-panel').style.display='block';
}
function copyOutput() {
  const ta = document.getElementById('output-txt');
  ta.select(); document.execCommand('copy');
  setStatus('Copied to clipboard!');
}
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
