import React from "react";
import Svg, {
  Rect,
  Text as SvgText,
  G,
  Line,
  Path,
  Polygon,
} from "react-native-svg";

interface ExhibitHallMapProps {
  visitedBooths: string[];
  scale?: number;
}

type BoothCat = "foyer" | "island" | "perimeter" | "corner";

interface BoothDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cat: BoothCat;
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const FILL: Record<BoothCat, string> = {
  foyer:    "#c4b5fd",
  island:   "#bfdbfe",
  perimeter:"#fde68a",
  corner:   "#fed7aa",
};
const STROKE: Record<BoothCat, string> = {
  foyer:    "#7c3aed",
  island:   "#3b82f6",
  perimeter:"#d97706",
  corner:   "#ea580c",
};
const VISITED_FILL   = "#6ee7b7";
const VISITED_STROKE = "#059669";

// ─── Exhibitor names (abbreviated to fit booths) ─────────────────────────────
export const BOOTH_NAMES: Record<string, string> = {
  "98":  "Edward Jones",
  "101": "Lenz Therap.",
  "103": "Visionix",
  "106": "Restoration Ophth.",
  "108": "DSBVI",
  "110": "Hope Alliance",
  "111": "Rawzi Eyewear",
  "112": "Friends for Sight",
  "200": "Dompé",
  "202": "Glaukos",
  "204": "EssilorLuxottica",
  "206": "Apellis Pharma.",
  "210": "Rocky Mtn Univ.",
  "212": "Waite Vision",
  "201": "The Eye Institute",
  "203": "LKC Technologies",
  "205": "Coopervision",
  "207": "VSP",
  "211": "J&J Vision",
  "300": "ADIT",
  "302": "Medically USA",
  "304": "Eye Designs LLC",
  "306": "Aseptikits",
  "308": "Cherry Optical",
  "310": "MyEyeDr",
  "312": "Alcon",
  "301": "Bausch+Lomb",
  "303": "Sun Pharma",
  "305": "Europa Eyewear",
  "307": "Eyefficient",
  "309": "L'Amy America",
  "311": "Premier Vision",
  "313": "Modern Optical",
  "314": "IT4Eyes",
  "315": "MOREL Eyewear",
  "400": "Blue River Med.",
  "402": "Orgreens Optics",
  "404": "Shamir Insights",
  "406": "Contamac",
  "408": "",
  "410": "",
  "412": "Kering Eyewear",
  "403": "Essilor Labs",
  "405": "Luxottica Frames",
  "407": "Essilor Instrum.",
  "409": "",
  "411": "Optikam Tech",
  "414": "MacuHealth",
  "415": "Optos, Inc",
  "500": "Topcon",
  "502": "Utah Eye Centers",
  "504": "",
  "506": "",
  "508": "ZEISS",
  "510": "ZEISS",
  "512": "Optometric Aesth.",
  "503": "Teem",
  "507": "",
  "509": "",
  "511": "",
  "513": "",
  "514": "Nikon Optical",
  "515": "Hoopes Vision",
  "516": "",
};

// ─── Canvas dimensions ────────────────────────────────────────────────────────
const SVG_W   = 1020;
const LWALL_W = 96;   // left-wall booth strip width
const RWALL_W = 92;   // right-wall booth strip width
const CX0     = LWALL_W + 10;   // center area left edge  = 106
const CX1     = SVG_W - RWALL_W - 10; // center area right edge = 918
const CW      = CX1 - CX0;           // center width          = 812

// ─── FOYER ────────────────────────────────────────────────────────────────────
const FBOOTH_W = 85;
const FBOOTH_H = 76;
const FGAP     = 5;

const FA_IDS: string[] = ["98","99","100","102","104","106","108","110","112"];
const FA_TOTAL = FA_IDS.length * FBOOTH_W + (FA_IDS.length - 1) * FGAP;
const FA_X0    = CX0 + Math.floor((CW - FA_TOTAL) / 2);
const FA_Y     = 44;

// Hallway between main classrooms
const HALL_Y = FA_Y + FBOOTH_H + 4;
const HALL_H = 28;

// Bottom foyer row — aligns under booths 102-112 (index 3–8 of top row)
const FB_IDS: string[] = ["101","103","105","107","109","111"];
const FB_X0   = FA_X0 + 3 * (FBOOTH_W + FGAP);   // starts under "102"
const FB_Y    = HALL_Y + HALL_H + 4;

// ─── Transition gap (foyer → ballroom, contains main doors) ─────────────────
const TRANS_Y = FB_Y + FBOOTH_H + 10;
const TRANS_H = 54;

// ─── BALLROOM ─────────────────────────────────────────────────────────────────
const BALL_Y0 = TRANS_Y + TRANS_H;

// ── Top-wall row: 202, 204, 206, 210  (centered in CW) ──────────────────────
const TOP_BW  = 108;  // each top-wall booth width
const TOP_BH  = 78;
const TOP_GAP = 6;
const TOP_IDS: string[] = ["202","204","206","210"];
const TOP_ALL_W = TOP_IDS.length * TOP_BW + (TOP_IDS.length - 1) * TOP_GAP;
const TOP_X0  = CX0 + Math.floor((CW - TOP_ALL_W) / 2);  // center the 4 booths

const topWall: BoothDef[] = TOP_IDS.map((id, i) => ({
  id,
  x: TOP_X0 + i * (TOP_BW + TOP_GAP),
  y: BALL_Y0,
  w: TOP_BW,
  h: TOP_BH,
  cat: "perimeter",
}));

// Door arrow x positions (left door: left of 202, right door: right of 210)
const LDOOR_X = CX0 + Math.floor((TOP_X0 - CX0) / 2);
const RDOOR_X = TOP_X0 + TOP_ALL_W + Math.floor((CX1 - (TOP_X0 + TOP_ALL_W)) / 2);

// ── Island booth dimensions ──────────────────────────────────────────────────
const ISL_BW    = 120;
const ISL_BH    = 72;
const ISL_GAP   = 6;
const PAIR_AISL = 10;   // aisle between facing pair rows
const ROW_GAP   = 46;   // gap between pairs

function islandRow(ids: string[], y: number): BoothDef[] {
  const rowW = ids.length * ISL_BW + (ids.length - 1) * ISL_GAP;
  const x0   = CX0 + Math.floor((CW - rowW) / 2);
  return ids.map((id, i) => ({
    id,
    x: x0 + i * (ISL_BW + ISL_GAP),
    y,
    w: ISL_BW,
    h: ISL_BH,
    cat: "island" as BoothCat,
  }));
}

// Pair 1 — 5 booths each
const P1A_Y = BALL_Y0 + TOP_BH + 32;
const P1B_Y = P1A_Y + ISL_BH + PAIR_AISL;
const pair1A = islandRow(["201","203","205","207","211"], P1A_Y);
const pair1B = islandRow(["304","306","308","310","312"], P1B_Y);

// Pair 2 — 6 booths each
const P2A_Y = P1B_Y + ISL_BH + ROW_GAP;
const P2B_Y = P2A_Y + ISL_BH + PAIR_AISL;
const pair2A = islandRow(["301","303","305","307","309","311"], P2A_Y);
const pair2B = islandRow(["402","404","406","408","410","412"], P2B_Y);

// Pair 3 — 5 booths (A), 6 booths (B)
const P3A_Y = P2B_Y + ISL_BH + ROW_GAP;
const P3B_Y = P3A_Y + ISL_BH + PAIR_AISL;
const pair3A = islandRow(["403","405","407","409","411"], P3A_Y);
const pair3B = islandRow(["502","504","506","508","510","512"], P3B_Y);

// Bottom row — 501, 503, 505, 507, 509, 511 (left-aligned under pair 3)
const BOT_Y  = P3B_Y + ISL_BH + 36;
const BOT_BH = 76;
const BOT_IDS: string[] = ["501","503","505","507","509","511"];
const BOT_ALL_W = BOT_IDS.length * ISL_BW + (BOT_IDS.length - 1) * ISL_GAP;
const BOT_X0 = CX0 + Math.floor((CW - BOT_ALL_W) / 2);
const bottomRow: BoothDef[] = BOT_IDS.map((id, i) => ({
  id,
  x: BOT_X0 + i * (ISL_BW + ISL_GAP),
  y: BOT_Y,
  w: ISL_BW,
  h: BOT_BH,
  cat: "perimeter",
}));

// ── LEFT WALL booths (x=0, width=LWALL_W) ───────────────────────────────────
// Derived from floor plan: 200 at top, then 300, 302, 400, 500
const LW_H200 = P1A_Y - BALL_Y0 - 6;
const LW_H300 = ISL_BH + PAIR_AISL - 6;
const LW_H302 = ISL_BH - 4;
const LW_H400 = ISL_BH * 2 + PAIR_AISL + 4;
const LW_H500 = ISL_BH * 2 + PAIR_AISL + 4;

const leftWall: BoothDef[] = [
  { id: "200", x: 0, y: BALL_Y0,             w: LWALL_W, h: LW_H200, cat: "corner" },
  { id: "300", x: 0, y: P1A_Y,               w: LWALL_W, h: LW_H300, cat: "perimeter" },
  { id: "302", x: 0, y: P1B_Y,               w: LWALL_W, h: LW_H302, cat: "perimeter" },
  { id: "400", x: 0, y: P2A_Y,               w: LWALL_W, h: LW_H400, cat: "perimeter" },
  { id: "500", x: 0, y: P3A_Y,               w: LWALL_W, h: LW_H500, cat: "perimeter" },
];

// ── RIGHT WALL booths (x=CX1+8, width=RWALL_W) ──────────────────────────────
// Floor plan (top→bottom): 212, 314, 315, 313, 414, 415, 516, 515
// Then bottom-right: 513, 514
const RW_X     = CX1 + 10;
const RW_UNIT  = Math.floor((ISL_BH * 2 + PAIR_AISL) / 3); // ~51
const RW_H_212 = TOP_BH;
const RW_H_sm  = RW_UNIT - 3;  // 314 & 315 (each)
const RW_H_313 = ISL_BH - 4;

const rightWall: BoothDef[] = [
  { id: "212", x: RW_X, y: BALL_Y0,                        w: RWALL_W, h: RW_H_212,  cat: "corner" },
  { id: "314", x: RW_X, y: P1A_Y,                          w: RWALL_W, h: RW_H_sm,   cat: "perimeter" },
  { id: "315", x: RW_X, y: P1A_Y + RW_H_sm + 4,           w: RWALL_W, h: RW_H_sm,   cat: "perimeter" },
  { id: "313", x: RW_X, y: P1B_Y,                          w: RWALL_W, h: RW_H_313,  cat: "perimeter" },
  { id: "414", x: RW_X, y: P2A_Y,                          w: RWALL_W, h: ISL_BH,    cat: "perimeter" },
  { id: "415", x: RW_X, y: P2B_Y,                          w: RWALL_W, h: ISL_BH,    cat: "perimeter" },
  { id: "516", x: RW_X, y: P3A_Y,                          w: RWALL_W, h: ISL_BH,    cat: "perimeter" },
  { id: "515", x: RW_X, y: P3B_Y,                          w: RWALL_W, h: ISL_BH,    cat: "perimeter" },
];

// 513, 514 — bottom-right corner booths (face north)
const BR_W = Math.floor(RWALL_W / 2) - 2;
const bottomRight: BoothDef[] = [
  { id: "513", x: RW_X,           y: BOT_Y, w: BR_W, h: BOT_BH, cat: "perimeter" },
  { id: "514", x: RW_X + BR_W + 4, y: BOT_Y, w: BR_W, h: BOT_BH, cat: "perimeter" },
];

// Foyer booths arrays
const foyerTop: BoothDef[]    = FA_IDS.map((id, i) => ({ id, x: FA_X0 + i * (FBOOTH_W + FGAP), y: FA_Y, w: FBOOTH_W, h: FBOOTH_H, cat: "foyer" }));
const foyerBottom: BoothDef[] = FB_IDS.map((id, i) => ({ id, x: FB_X0 + i * (FBOOTH_W + FGAP), y: FB_Y, w: FBOOTH_W, h: FBOOTH_H, cat: "foyer" }));

const ALL_BOOTHS: BoothDef[] = [
  ...foyerTop, ...foyerBottom,
  ...topWall,
  ...pair1A, ...pair1B,
  ...pair2A, ...pair2B,
  ...pair3A, ...pair3B,
  ...bottomRow,
  ...bottomRight,
  ...leftWall,
  ...rightWall,
];

const SVG_H = BOT_Y + BOT_BH + 90;

// ─── Text helpers ─────────────────────────────────────────────────────────────
function wrapName(name: string, maxCh: number): string[] {
  if (!name || name.length <= maxCh) return name ? [name] : [];
  const mid = Math.floor(name.length / 2);
  let split = name.lastIndexOf(" ", mid);
  if (split < 2) split = name.indexOf(" ");
  if (split < 0) return [name.slice(0, maxCh - 1) + "…"];
  return [name.slice(0, split), name.slice(split + 1)];
}

// ─── Booth renderer ───────────────────────────────────────────────────────────
function BoothRect({ booth, visited }: { booth: BoothDef; visited: boolean }) {
  const fill   = visited ? VISITED_FILL   : FILL[booth.cat];
  const stroke = visited ? VISITED_STROKE : STROKE[booth.cat];
  const cx     = booth.x + booth.w / 2;
  const narrow = booth.w < 90;
  const company = BOOTH_NAMES[booth.id] ?? "";

  const numSz  = narrow ? 11 : 13;
  const nameSz = narrow ? 9  : 11;

  const numY = company
    ? booth.y + (narrow ? 20 : 22)
    : booth.y + booth.h / 2;

  const nameLines = wrapName(company, narrow ? 11 : 14);

  return (
    <G>
      <Rect x={booth.x} y={booth.y} width={booth.w} height={booth.h}
        rx={4} fill={fill} stroke={stroke} strokeWidth={1.5} />

      {visited && (
        <Rect x={booth.x + booth.w - 18} y={booth.y + 3}
          width={15} height={15} rx={3} fill={VISITED_STROKE} />
      )}

      <SvgText x={cx} y={numY} fontSize={numSz} fontWeight="700"
        fill={visited ? "#065f46" : "#1e293b"}
        textAnchor="middle" alignmentBaseline="middle">
        {booth.id}
      </SvgText>

      {nameLines.map((line, i) => (
        <SvgText key={i}
          x={cx}
          y={numY + numSz * 0.9 + i * (nameSz + 2) + 5}
          fontSize={nameSz} fontWeight="400"
          fill={visited ? "#065f46" : "#334155"}
          textAnchor="middle" alignmentBaseline="middle">
          {line}
        </SvgText>
      ))}

      {visited && (
        <SvgText x={booth.x + booth.w - 10} y={booth.y + 11}
          fontSize={9} fontWeight="700" fill="#fff"
          textAnchor="middle" alignmentBaseline="middle">
          ✓
        </SvgText>
      )}
    </G>
  );
}

// ─── Door arrow helper ────────────────────────────────────────────────────────
function DoorArrow({ x, y, label }: { x: number; y: number; label: string }) {
  const AW = 20;
  const AH = 18;
  return (
    <G>
      <Polygon
        points={`${x},${y + AH} ${x - AW / 2},${y} ${x + AW / 2},${y}`}
        fill="#dc2626"
        opacity={0.85}
      />
      <SvgText x={x} y={y - 6} fontSize={8} fontWeight="700"
        fill="#dc2626" textAnchor="middle" alignmentBaseline="middle">
        {label}
      </SvgText>
    </G>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExhibitHallMap({ visitedBooths, scale = 1 }: ExhibitHallMapProps) {
  const visitedSet = new Set(visitedBooths.map(String));

  // Derived geometry
  const FOYER_BG_Y  = FA_Y - 20;
  const FOYER_BG_H  = FB_Y + FBOOTH_H - FA_Y + 28;
  const BALL_BG_Y   = BALL_Y0 - 6;
  const BALL_BG_H   = SVG_H - BALL_BG_Y - 20;

  return (
    <Svg width={SVG_W * scale} height={SVG_H * scale} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>

      {/* ── FOYER background ─────────────────────────────────────── */}
      <Rect x={CX0 - 6} y={FOYER_BG_Y} width={CW + 12} height={FOYER_BG_H}
        rx={8} fill="#f5f3ff" stroke="#7c3aed" strokeWidth={1.5} />

      {/* Hallway strip */}
      <Rect x={CX0 - 6} y={HALL_Y} width={CW + 12} height={HALL_H}
        fill="#e8e5f4" opacity={0.9} />

      {/* FOYER section title */}
      <SvgText x={SVG_W / 2} y={FA_Y - 8}
        fontSize={12} fontWeight="700" fill="#5b21b6"
        textAnchor="middle" alignmentBaseline="middle">
        JORDANELLE FOYER — HALLWAY (outside exhibit hall)
      </SvgText>

      {/* Load in doors label — top left */}
      <SvgText x={8} y={FA_Y + 18} fontSize={8} fontWeight="700"
        fill="#dc2626" textAnchor="start" alignmentBaseline="middle">
        ↓ Load-in Doors
      </SvgText>

      {/* Hallway label */}
      <SvgText x={SVG_W / 2} y={HALL_Y + HALL_H / 2}
        fontSize={8} fontWeight="600" fill="#7c3aed"
        textAnchor="middle" alignmentBaseline="middle">
        ← 8' Hallway between main classrooms →
      </SvgText>

      {/* ── BALLROOM background ────────────────────────────────────── */}
      <Rect x={0} y={BALL_BG_Y} width={SVG_W} height={BALL_BG_H}
        rx={8} fill="#eff6ff" stroke="#3b82f6" strokeWidth={1.5} />

      {/* Ballroom label */}
      <SvgText x={SVG_W / 2} y={P2A_Y + (P2B_Y - P2A_Y + ISL_BH) / 2}
        fontSize={14} fontWeight="700" fill="#1d4ed830"
        textAnchor="middle" alignmentBaseline="middle">
        JORDANELLE BALLROOM
      </SvgText>

      {/* Registration Desk label — left wall */}
      <SvgText x={4} y={P2A_Y - 12} fontSize={7} fontWeight="600"
        fill="#16a34a" textAnchor="start" alignmentBaseline="middle"
        transform={`rotate(-90, 4, ${P2A_Y - 12})`}>
        Registration Desk →
      </SvgText>

      {/* Entrance from hotel lobby — bottom left */}
      <SvgText x={8} y={BOT_Y + BOT_BH + 18} fontSize={8} fontWeight="600"
        fill="#dc2626" textAnchor="start" alignmentBaseline="middle">
        ← Entrance from hotel lobby
      </SvgText>
      <SvgText x={8} y={BOT_Y + BOT_BH + 32} fontSize={8} fontWeight="600"
        fill="#7c3aed" textAnchor="start" alignmentBaseline="middle">
        ESCALATORS ↑
      </SvgText>

      {/* ── TRANSITION / MAIN DOORS ──────────────────────────────────── */}
      <Rect x={CX0 - 6} y={TRANS_Y} width={CW + 12} height={TRANS_H}
        rx={4} fill="#e2e8f0" opacity={0.7} />
      <SvgText x={SVG_W / 2} y={TRANS_Y + TRANS_H / 2}
        fontSize={9} fontWeight="600" fill="#475569"
        textAnchor="middle" alignmentBaseline="middle">
        ← Main Ballroom Lobby →
      </SvgText>

      {/* Main Door arrows (two doors into the ballroom from the foyer) */}
      <DoorArrow x={LDOOR_X} y={BALL_Y0 - 2} label="Main Doors" />
      <DoorArrow x={RDOOR_X} y={BALL_Y0 - 2} label="Main Doors" />

      {/* ── All booths ────────────────────────────────────────────── */}
      {ALL_BOOTHS.map((b) => (
        <BoothRect key={b.id} booth={b} visited={visitedSet.has(b.id)} />
      ))}

      {/* ── Aisle labels ─────────────────────────────────────────── */}
      {[
        P1A_Y + ISL_BH + PAIR_AISL / 2,
        P2A_Y + ISL_BH + PAIR_AISL / 2,
        P3A_Y + ISL_BH + PAIR_AISL / 2,
      ].map((ay, i) => (
        <SvgText key={i} x={SVG_W / 2} y={ay}
          fontSize={7} fill="#94a3b8"
          textAnchor="middle" alignmentBaseline="middle">
          ← aisle →
        </SvgText>
      ))}

    </Svg>
  );
}
