import React from "react";
import Svg, { Rect, Text as SvgText, G, Path, Defs, ClipPath } from "react-native-svg";

// ─── Booth name data ──────────────────────────────────────────────────────────
export const BOOTH_NAMES: Record<string, string> = {
  "98":  "Edward Jones",     "99":  "Edward Jones",    "100": "Edward Jones",
  "102": "Lenz Therapeutics","101": "Lenz Therapeutics",
  "104": "Visionix",         "103": "Visionix",         "105": "Visionix",
  "106": "Restoration Ophth.","107":"Restoration Ophth.",
  "108": "DSBVI",            "109": "DSBVI",
  "110": "Hope Alliance",    "111": "Rawzi Eyewear",    "112": "Friends for Sight",
  "200": "Dompé",
  "201": "The Eye Institute","202": "Glaukos",
  "203": "LKC Technologies", "204": "EssilorLuxottica",
  "205": "CooperVision",     "206": "Apellis Pharma.",
  "207": "VSP",              "210": "Rocky Mtn Univ.",
  "211": "J&J Vision",       "212": "Waite Vision",
  "300": "ADIT",             "301": "Bausch+Lomb",
  "302": "Medically USA",    "303": "Sun Pharma",
  "304": "Eye Designs LLC",  "305": "Europa Eyewear",
  "306": "Aseptikits",       "307": "Eyefficient",
  "308": "Cherry Optical",   "309": "L'Amy America",
  "310": "MyEyeDr",          "311": "Premier Vision",
  "312": "Alcon",            "313": "Modern Optical",
  "314": "IT4Eyes",          "315": "MOREL Eyewear",
  "400": "Blue River Med.",  "401": "Blue River Med.",
  "402": "Orgreens Optics",  "403": "Essilor Labs",
  "404": "Shamir Insights",  "405": "Luxottica Frames",
  "406": "Contamac",         "407": "Essilor Instrum.",
  "408": "",                 "409": "",                 "410": "",
  "411": "Optikam Tech",     "412": "Kering Eyewear",
  "414": "MacuHealth",       "415": "Optos, Inc",
  "500": "Topcon",           "501": "",
  "502": "Utah Eye Centers", "503": "Teem",
  "504": "",                 "505": "",                 "506": "",
  "507": "",                 "508": "ZEISS",            "509": "",
  "510": "ZEISS",            "511": "",
  "512": "Optometric Aesth.","513": "",
  "514": "Nikon Optical",    "515": "Hoopes Vision",    "516": "",
};

// ─── Dimensions ───────────────────────────────────────────────────────────────
const W = 820;

// Foyer row
const FBW = 74, FBH = 54, FG = 5;
const FA_Y = 46;
const FA_IDS = ["98","99","100","102","104","106","108","110","112"];
const FA_TOT = FA_IDS.length * FBW + (FA_IDS.length - 1) * FG; // 706
const FA_X0 = Math.floor((W - FA_TOT) / 2); // 57

const HY = FA_Y + FBH + 5,  HH = 16; // hallway
const FC_Y = HY + HH + 5;            // foyer bottom row
const FC_IDS = ["101","103","105","107","109","111"];
const FC_X0 = FA_X0 + 3 * (FBW + FG); // 294

// Transition zone (foyer → ballroom)
const TY = FC_Y + FBH + 10, TH = 62;
const B0 = TY + TH; // ballroom top = 236 (approx)

// Wall strips
const LX = 10, LW = 76;
const RW = 76, RX = W - 10 - RW; // = 734
const NW = 20; // narrow booth width

// Center & island area
const CX0 = LX + LW + 6;  // 92
const CX1 = RX - 6;        // 728
const CW  = CX1 - CX0;    // 636
const IX0 = CX0 + NW + 8;  // 120
const IX1 = CX1 - NW - 8;  // 700
const IW  = IX1 - IX0;     // 580

// Top wall booths
const TBW = 90, TBH = 54, TBG = 8;
const TW_IDS = ["202","204","206","210"];
const TW_TOT = TW_IDS.length * TBW + (TW_IDS.length - 1) * TBG; // 384
const TW_X0  = CX0 + Math.floor((CW - TW_TOT) / 2); // 218

// Island grid
const IBW = 82, IBH = 58, IG = 7;
const PA = 10, RG = 40;

const P1A = B0 + TBH + 24;
const P1B = P1A + IBH + PA;
const P2A = P1B + IBH + RG;
const P2B = P2A + IBH + PA;
const P3A = P2B + IBH + RG;
const P3B = P3A + IBH + PA;
const BY  = P3B + IBH + 34;
const BH  = 58;

const SVG_H = BY + BH + 72;

// ─── Colors ───────────────────────────────────────────────────────────────────
const BG      = "#e2e8ed";   // building floor
const WALL    = "#aab8c2";   // wall/outline color
const BOOTH   = "#b3d4e8";   // booth fill (all same)
const BSTROKE = "#7aafc8";   // booth border
const VIS     = "#6ee7b7";   // visited fill
const VISSTK  = "#059669";   // visited stroke
const TXT     = "#1e293b";   // text color
const TXTVS   = "#064e3b";   // visited text
const DOOR    = "#7d9aaa";   // door arc color
const LABEL   = "#4b6070";   // annotation labels
const RX_B    = 9;           // booth corner radius

// ─── Types ────────────────────────────────────────────────────────────────────
interface BD { id: string; x: number; y: number; w: number; h: number; narrow?: boolean }

// ─── Text wrap ────────────────────────────────────────────────────────────────
function ww(s: string, max: number): string[] {
  if (!s) return [];
  if (s.length <= max) return [s];
  const m = Math.floor(s.length / 2);
  let sp = s.lastIndexOf(" ", m);
  if (sp < 1) sp = s.indexOf(" ");
  if (sp < 0) return [s.slice(0, max - 1) + "…"];
  return [s.slice(0, sp), s.slice(sp + 1)];
}

// ─── Island row factory ───────────────────────────────────────────────────────
function irow(ids: string[], y: number): BD[] {
  const n = ids.length, rw = n * IBW + (n - 1) * IG;
  const x0 = IX0 + Math.floor((IW - rw) / 2);
  return ids.map((id, i) => ({ id, x: x0 + i * (IBW + IG), y, w: IBW, h: IBH }));
}

// ─── Booth definitions ────────────────────────────────────────────────────────
const FOYER_T: BD[] = FA_IDS.map((id, i) => ({ id, x: FA_X0 + i*(FBW+FG), y: FA_Y, w: FBW, h: FBH }));
const FOYER_B: BD[] = FC_IDS.map((id, i) => ({ id, x: FC_X0 + i*(FBW+FG), y: FC_Y, w: FBW, h: FBH }));

const TOP_W: BD[] = TW_IDS.map((id, i) => ({ id, x: TW_X0 + i*(TBW+TBG), y: B0, w: TBW, h: TBH }));

const L_WALL: BD[] = [
  { id:"200", x:LX, y:B0,   w:LW, h:P1A-B0-6 },
  { id:"300", x:LX, y:P1A,  w:LW, h:IBH+PA/2 },
  { id:"400", x:LX, y:P2A,  w:LW, h:IBH*2+PA-6 },
  { id:"500", x:LX, y:P3A,  w:LW, h:IBH*2+PA-6 },
];
const L_NARR: BD[] = [
  { id:"302", x:CX0,    y:P1B+4, w:NW, h:IBH-10, narrow:true },
  { id:"401", x:CX0,    y:P2A+4, w:NW, h:44,      narrow:true },
];
const R_WALL: BD[] = [
  { id:"212", x:RX, y:B0,  w:RW, h:TBH-2 },
  { id:"314", x:RX, y:P1A, w:RW, h:IBH-4 },
  { id:"313", x:RX, y:P1B, w:RW, h:IBH-4 },
  { id:"414", x:RX, y:P2A, w:RW, h:IBH-4 },
  { id:"516", x:RX, y:P3A, w:RW, h:IBH-4 },
  { id:"515", x:RX, y:P3B, w:RW, h:IBH-4 },
];
const R_NARR: BD[] = [
  { id:"315", x:CX1-NW, y:P1A+IBH-2, w:NW, h:PA+18, narrow:true },
  { id:"415", x:CX1-NW, y:P2A+IBH-2, w:NW, h:PA+18, narrow:true },
];
const P1A_R = irow(["201","203","205","207","211"], P1A);
const P1B_R = irow(["304","306","308","310","312"], P1B);
const P2A_R = irow(["301","303","305","307","309","311"], P2A);
const P2B_R = irow(["402","404","406","408","410","412"], P2B);
const P3A_R = irow(["403","405","407","409","411"], P3A);
const P3B_R = irow(["502","504","506","508","510","512"], P3B);
const BOT_R = irow(["501","503","505","507","509","511"], BY);

const BBW = Math.floor(RW / 2) - 2;
const CORN: BD[] = [
  { id:"513", x:RX,         y:BY, w:BBW, h:BH },
  { id:"514", x:RX+BBW+4,   y:BY, w:BBW, h:BH },
];

const ALL: BD[] = [
  ...FOYER_T, ...FOYER_B,
  ...TOP_W, ...P1A_R, ...P1B_R,
  ...P2A_R, ...P2B_R,
  ...P3A_R, ...P3B_R,
  ...BOT_R, ...CORN,
  ...L_WALL, ...L_NARR,
  ...R_WALL, ...R_NARR,
];

// ─── Door arc (architectural quarter-circle sweep) ────────────────────────────
function Arc({ x, y, r, dir }: { x:number; y:number; r:number; dir:"L"|"R" }) {
  const ex = dir === "R" ? x + r : x - r;
  const ey = y + r;
  const sw = dir === "R" ? 1 : 0;
  return (
    <G>
      <Path d={`M ${x},${y} L ${ex},${y}`} stroke={DOOR} strokeWidth={1.5} fill="none" />
      <Path d={`M ${ex},${y} A ${r},${r} 0 0,${sw} ${x},${ey}`}
        stroke={DOOR} strokeWidth={1.2} fill="none" />
    </G>
  );
}

// ─── Single booth ─────────────────────────────────────────────────────────────
function Booth({ b, vis }: { b:BD; vis:boolean }) {
  const fill = vis ? VIS : BOOTH;
  const strk = vis ? VISSTK : BSTROKE;
  const tc   = vis ? TXTVS : TXT;
  const cx   = b.x + b.w / 2, cy = b.y + b.h / 2;
  const name = BOOTH_NAMES[b.id] ?? "";

  // Narrow/rotated booths (302, 401, 315, 415)
  if (b.narrow) {
    return (
      <G>
        <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5} fill={fill} stroke={strk} strokeWidth={1.2}/>
        <SvgText x={cx} y={cy} fontSize={8} fontWeight="700" fill={tc}
          textAnchor="middle" alignmentBaseline="middle"
          transform={`rotate(-90 ${cx} ${cy})`}>{b.id}</SvgText>
      </G>
    );
  }

  const sm = b.w < 88;
  const nS = sm ? 10 : 12, nmS = sm ? 7.5 : 9;
  const nl = ww(name, sm ? 10 : 13);
  const lH = nmS + 2;
  const blk = nS + (nl.length > 0 ? 3 + nl.length * lH : 0);
  const ny  = cy - blk / 2 + nS / 2;

  return (
    <G>
      <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={RX_B} fill={fill} stroke={strk} strokeWidth={1.3}/>
      <SvgText x={cx} y={ny} fontSize={nS} fontWeight="700" fill={tc}
        textAnchor="middle" alignmentBaseline="middle">{b.id}</SvgText>
      {nl.map((line, i) => (
        <SvgText key={i} x={cx} y={ny + nS*0.6 + 3 + i*lH + lH/2}
          fontSize={nmS} fill={tc}
          textAnchor="middle" alignmentBaseline="middle">{line}</SvgText>
      ))}
      {vis && (
        <SvgText x={b.x+b.w-9} y={b.y+10} fontSize={9} fontWeight="900"
          fill={VISSTK} textAnchor="middle" alignmentBaseline="middle">✓</SvgText>
      )}
    </G>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────
interface Props { visitedBooths: string[]; scale?: number }

export default function ExhibitHallMap({ visitedBooths, scale = 1 }: Props) {
  const vis = new Set(visitedBooths.map(String));

  // Door x-centres
  const LDX = Math.floor((LX + LW + TW_X0) / 2);         // left entrance
  const RDX = Math.floor((TW_X0 + TW_TOT + RX) / 2);     // right entrance
  const b505 = BOT_R.find(b => b.id === "505");
  const b511 = BOT_R.find(b => b.id === "511");

  return (
    <Svg width={W * scale} height={SVG_H * scale} viewBox={`0 0 ${W} ${SVG_H}`}>

      {/* ── Building floor ──────────────────────────────────────── */}
      <Rect x={0} y={0} width={W} height={SVG_H} rx={14}
        fill={BG} stroke={WALL} strokeWidth={2.5} />

      {/* ── Foyer section – subtle top band ─────────────────────── */}
      <Rect x={FA_X0 - 8} y={FA_Y - 8}
        width={FA_TOT + 16} height={FC_Y + FBH - FA_Y + 14}
        rx={8} fill="#d4dde5" stroke={WALL} strokeWidth={1} />

      {/* Hallway divider strip */}
      <Rect x={FA_X0 - 8} y={HY} width={FA_TOT + 16} height={HH}
        fill={WALL} opacity={0.35} />
      <SvgText x={FA_X0 + FA_TOT/2} y={HY + HH/2}
        fontSize={7} fontWeight="600" fill={LABEL}
        textAnchor="middle" alignmentBaseline="middle">
        ← 8' Hallway between main classrooms →
      </SvgText>

      {/* Foyer label */}
      <SvgText x={W/2} y={FA_Y - 20}
        fontSize={9.5} fontWeight="700" fill={LABEL}
        textAnchor="middle" alignmentBaseline="middle">
        JORDANELLE FOYER — HALLWAY (outside exhibit hall)
      </SvgText>

      {/* Load-in doors */}
      <SvgText x={12} y={FA_Y + FBH/2}
        fontSize={7} fontWeight="700" fill="#b03030"
        textAnchor="start" alignmentBaseline="middle">↓ Load-in</SvgText>
      <SvgText x={12} y={FA_Y + FBH/2 + 10}
        fontSize={7} fontWeight="700" fill="#b03030"
        textAnchor="start" alignmentBaseline="middle">Doors</SvgText>

      {/* ── Transition lobby zone ───────────────────────────────── */}
      <Rect x={LX} y={TY} width={W - LX*2} height={TH}
        rx={4} fill="#c8d4dc" opacity={0.6} />
      <SvgText x={W/2} y={TY + TH/2}
        fontSize={8.5} fontWeight="600" fill={LABEL}
        textAnchor="middle" alignmentBaseline="middle">
        — Main Ballroom Lobby —
      </SvgText>

      {/* ── Main entrance door arcs (top of ballroom) ──────────── */}
      <Arc x={LDX} y={B0} r={30} dir="R" />
      <Arc x={RDX} y={B0} r={30} dir="L" />
      <SvgText x={LDX + 6} y={B0 - 6} fontSize={6.5} fill="#b03030"
        textAnchor="middle" fontWeight="700">Main Doors</SvgText>
      <SvgText x={RDX - 6} y={B0 - 6} fontSize={6.5} fill="#b03030"
        textAnchor="middle" fontWeight="700">Main Doors</SvgText>

      {/* ── Ballroom label (faint watermark) ────────────────────── */}
      <SvgText x={W/2} y={P2A + IBH/2}
        fontSize={12} fontWeight="700" fill="#aab8c220"
        textAnchor="middle" alignmentBaseline="middle">JORDANELLE BALLROOM</SvgText>

      {/* ── Aisle labels ────────────────────────────────────────── */}
      {[P1A+IBH+PA/2, P2A+IBH+PA/2, P3A+IBH+PA/2].map((ay, i) => (
        <SvgText key={i} x={W/2} y={ay}
          fontSize={6} fill="#94a3b8"
          textAnchor="middle" alignmentBaseline="middle">← aisle →</SvgText>
      ))}

      {/* ── Bottom exit door arcs ────────────────────────────────── */}
      {b505 && <Arc x={b505.x + b505.w/2} y={BY + BH} r={22} dir="R" />}
      {b511 && <Arc x={b511.x + b511.w/2} y={BY + BH} r={22} dir="L" />}

      {/* Registration Desk */}
      <SvgText x={LX + 4} y={(P1B + P2A) / 2}
        fontSize={6} fontWeight="600" fill="#16a34a"
        textAnchor="middle" alignmentBaseline="middle"
        transform={`rotate(-90 ${LX+4} ${(P1B+P2A)/2})`}>
        Registration Desk
      </SvgText>

      {/* Entrance / Escalators */}
      <SvgText x={LX + 2} y={BY + BH + 22}
        fontSize={6.5} fontWeight="700" fill="#b03030"
        textAnchor="start" alignmentBaseline="middle">← Entrance / Escalators</SvgText>

      {/* ── All booths ───────────────────────────────────────────── */}
      {ALL.map(b => <Booth key={b.id} b={b} vis={vis.has(b.id)} />)}

    </Svg>
  );
}
