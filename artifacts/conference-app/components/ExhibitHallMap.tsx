import React from "react";
import Svg, { Rect, Text as SvgText, G, Path, Circle } from "react-native-svg";

// ─── Public booth name lookup (used by directory too) ────────────────────────
export const BOOTH_NAMES: Record<string, string> = {
  "98":  "Edward Jones",       "99": "Edward Jones",       "100": "Edward Jones",
  "102": "Lenz Therapeutics",  "101": "Lenz Therapeutics",
  "104": "Visionix",           "103": "Visionix",          "105": "Visionix",
  "106": "Restoration Ophth.", "107": "Restoration Ophth.",
  "108": "DSBVI",              "109": "DSBVI",
  "110": "Hope Alliance",
  "111": "Rawzi Eyewear",
  "112": "Friends for Sight",
  "200": "Dompé",
  "201": "The Eye Institute",  "202": "Glaukos",
  "203": "LKC Technologies",   "204": "EssilorLuxottica",
  "205": "CooperVision",       "206": "Apellis Pharma.",
  "207": "VSP",                "210": "Rocky Mtn Univ.",
  "211": "J&J Vision",         "212": "Waite Vision",
  "300": "ADIT",               "301": "Bausch+Lomb",
  "302": "Medically USA",      "303": "Sun Pharma",
  "304": "Eye Designs LLC",    "305": "Europa Eyewear",
  "306": "Aseptikits",         "307": "Eyefficient/S4Optik",
  "308": "Cherry Optical",     "309": "L'Amy America",
  "310": "MyEyeDr",            "311": "Premier Vision",
  "312": "Alcon",              "313": "Modern Optical",
  "314": "IT4Eyes",            "315": "MOREL Eyewear",
  "400": "Blue River Med.",    "401": "Blue River Med.",
  "402": "Orgreens Optics",    "403": "Essilor Labs",
  "404": "Shamir Insights",    "405": "Luxottica Frames",
  "406": "Contamac",           "407": "Essilor Instrum.",
  "410": "",                   "408": "",                  "409": "",
  "411": "Optikam Tech",       "412": "Kering Eyewear",
  "414": "MacuHealth",         "415": "Optos, Inc",
  "500": "Topcon",             "501": "",
  "502": "Utah Eye Centers",   "503": "Teem",
  "504": "",                   "505": "",
  "506": "",                   "507": "",
  "508": "ZEISS",              "509": "",
  "510": "ZEISS",              "511": "",
  "512": "Optometric Aesth.",  "513": "",
  "514": "Nikon Optical",      "515": "Hoopes Vision",
  "516": "",
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const SVG_W = 820;

// Foyer
const FB_W  = 74;   const FB_H  = 52;   const F_GAP = 5;
const FA_Y  = 30;
const FA_IDS = ["98","99","100","102","104","106","108","110","112"];
const FA_TOT = FA_IDS.length * FB_W + (FA_IDS.length - 1) * F_GAP; // 9*74+8*5=666+40=706
const FA_X0 = (SVG_W - FA_TOT) / 2;  // = 57

const HALL_Y = FA_Y + FB_H + 4;   // = 86
const HALL_H = 16;

const FC_Y  = HALL_Y + HALL_H + 4;  // = 106  (foyer bottom row)
const FC_IDS = ["101","103","105","107","109","111"];
const FC_X0 = FA_X0 + 3 * (FB_W + F_GAP);  // starts under "102" → 57+237=294

// Transition (foyer→ballroom): door arcs live here
const TRANS_Y = FC_Y + FB_H + 8;   // = 166
const TRANS_H = 70;

// Ballroom start
const BALL_Y0 = TRANS_Y + TRANS_H;  // = 236

// Wall strips
const LW_X = 8;   const LW_W = 76;  // left wall main booths
const RW_W = 76;  const RW_X = SVG_W - 8 - RW_W;  // = 736
const NW   = 20;  // narrow booth width (302, 401, 315, 415)

// Center island area
const CX0   = LW_X + LW_W + 6;              // = 90
const CX1   = RW_X - 6;                     // = 730
const CW    = CX1 - CX0;                    // = 640
// Islands are further inset (past the narrow booths)
const IX0   = CX0 + NW + 8;                 // = 118
const IX1   = CX1 - NW - 8;                 // = 702
const IW    = IX1 - IX0;                    // = 584

// Top-wall booths (202, 204, 206, 210)
const TW_BW = 90;  const TW_BH = 54;  const TW_GAP = 8;
const TW_IDS = ["202","204","206","210"];
const TW_TOT = TW_IDS.length * TW_BW + (TW_IDS.length - 1) * TW_GAP; // 360+24=384
const TW_X0  = CX0 + Math.floor((CW - TW_TOT) / 2);   // = 90+128=218

// Island rows
const IB_W = 82;  const IB_H = 58;  const I_GAP = 7;
const PA    = 10;   // aisle between back-to-back pair rows
const RG    = 40;   // gap between pairs

const P1A_Y = BALL_Y0 + TW_BH + 24;              // = 236+54+24=314
const P1B_Y = P1A_Y + IB_H + PA;                  // = 314+58+10=382
const P2A_Y = P1B_Y + IB_H + RG;                  // = 382+58+40=480
const P2B_Y = P2A_Y + IB_H + PA;                  // = 480+58+10=548
const P3A_Y = P2B_Y + IB_H + RG;                  // = 548+58+40=646
const P3B_Y = P3A_Y + IB_H + PA;                  // = 646+58+10=714

const BOT_Y  = P3B_Y + IB_H + 34;                 // = 714+58+34=806
const BOT_H  = 58;

const SVG_H  = BOT_Y + BOT_H + 70;                // = 806+58+70=934

// ─── Colors ───────────────────────────────────────────────────────────────────
const C_BOOTH   = "#b3d4e8";
const C_STROKE  = "#7aafc8";
const C_VISITED = "#6ee7b7";
const C_VIS_STR = "#059669";
const C_BG      = "#dde3e9";
const C_WALL    = "#b8c8d4";
const C_DOOR    = "#8fa8b8";
const C_TEXT_N  = "#1e293b";
const C_TEXT_V  = "#064e3b";
const RX        = 8;  // booth corner radius

// ─── Types ────────────────────────────────────────────────────────────────────
interface BoothDef {
  id: string; x: number; y: number; w: number; h: number;
  narrow?: boolean; // rotated text
}

// ─── Text wrap helper ─────────────────────────────────────────────────────────
function wrap(name: string, maxCh: number): string[] {
  if (!name) return [];
  if (name.length <= maxCh) return [name];
  const mid = Math.floor(name.length / 2);
  let sp = name.lastIndexOf(" ", mid);
  if (sp < 2) sp = name.indexOf(" ");
  if (sp < 0) return [name.slice(0, maxCh - 1) + "…"];
  return [name.slice(0, sp), name.slice(sp + 1)];
}

// ─── Island row factory ───────────────────────────────────────────────────────
function iRow(ids: string[], y: number): BoothDef[] {
  const n = ids.length;
  const rowW = n * IB_W + (n - 1) * I_GAP;
  const x0 = IX0 + Math.floor((IW - rowW) / 2);
  return ids.map((id, i) => ({ id, x: x0 + i * (IB_W + I_GAP), y, w: IB_W, h: IB_H }));
}

// ─── All booth definitions ────────────────────────────────────────────────────
const LEFT_WALL: BoothDef[] = [
  { id: "200", x: LW_X, y: BALL_Y0,   w: LW_W, h: P1A_Y - BALL_Y0 - 6 },
  { id: "300", x: LW_X, y: P1A_Y,     w: LW_W, h: IB_H + PA / 2 },
  { id: "400", x: LW_X, y: P2A_Y,     w: LW_W, h: IB_H * 2 + PA - 6 },
  { id: "500", x: LW_X, y: P3A_Y,     w: LW_W, h: IB_H * 2 + PA - 6 },
];
// Narrow booths on left (protrude inward from main left wall)
const LEFT_NARROW: BoothDef[] = [
  { id: "302", x: CX0, y: P1B_Y + 4,      w: NW, h: IB_H - 10, narrow: true },
  { id: "401", x: CX0, y: P2A_Y + 4,      w: NW, h: 44,         narrow: true },
];

const TOP_WALL: BoothDef[] = TW_IDS.map((id, i) => ({
  id, x: TW_X0 + i * (TW_BW + TW_GAP), y: BALL_Y0, w: TW_BW, h: TW_BH,
}));

const RIGHT_WALL: BoothDef[] = [
  { id: "212", x: RW_X, y: BALL_Y0,   w: RW_W, h: TW_BH - 2 },
  { id: "314", x: RW_X, y: P1A_Y,     w: RW_W, h: IB_H - 4 },
  { id: "313", x: RW_X, y: P1B_Y,     w: RW_W, h: IB_H - 4 },
  { id: "414", x: RW_X, y: P2A_Y,     w: RW_W, h: IB_H - 4 },
  { id: "516", x: RW_X, y: P3A_Y,     w: RW_W, h: IB_H - 4 },
  { id: "515", x: RW_X, y: P3B_Y,     w: RW_W, h: IB_H - 4 },
];
// Narrow booths on right
const RIGHT_NARROW: BoothDef[] = [
  { id: "315", x: CX1 - NW, y: P1A_Y + IB_H - 2, w: NW, h: PA + 18, narrow: true },
  { id: "415", x: CX1 - NW, y: P2A_Y + IB_H - 2, w: NW, h: PA + 18, narrow: true },
];

const PAIR_1A = iRow(["201","203","205","207","211"], P1A_Y);
const PAIR_1B = iRow(["304","306","308","310","312"], P1B_Y);
const PAIR_2A = iRow(["301","303","305","307","309","311"], P2A_Y);
const PAIR_2B = iRow(["402","404","406","408","410","412"], P2B_Y);
const PAIR_3A = iRow(["403","405","407","409","411"], P3A_Y);
const PAIR_3B = iRow(["502","504","506","508","510","512"], P3B_Y);

// Bottom row + corner booths
const BOT_IDS  = ["501","503","505","507","509","511"];
const BOT_ROW  = iRow(BOT_IDS, BOT_Y);
const BOT_BW   = Math.floor(RW_W / 2) - 2;
const BOT_CORN: BoothDef[] = [
  { id: "513", x: RW_X,             y: BOT_Y, w: BOT_BW, h: BOT_H },
  { id: "514", x: RW_X + BOT_BW + 4, y: BOT_Y, w: BOT_BW, h: BOT_H },
];

const FOYER_TOP: BoothDef[] = FA_IDS.map((id, i) => ({
  id, x: FA_X0 + i * (FB_W + F_GAP), y: FA_Y, w: FB_W, h: FB_H,
}));
const FOYER_BOT: BoothDef[] = FC_IDS.map((id, i) => ({
  id, x: FC_X0 + i * (FB_W + F_GAP), y: FC_Y, w: FB_W, h: FB_H,
}));

const ALL_BOOTHS: BoothDef[] = [
  ...FOYER_TOP, ...FOYER_BOT,
  ...TOP_WALL,
  ...PAIR_1A, ...PAIR_1B,
  ...PAIR_2A, ...PAIR_2B,
  ...PAIR_3A, ...PAIR_3B,
  ...BOT_ROW, ...BOT_CORN,
  ...LEFT_WALL, ...LEFT_NARROW,
  ...RIGHT_WALL, ...RIGHT_NARROW,
];

// ─── Door arc helper (quarter-circle swing) ───────────────────────────────────
function DoorArc({ cx, cy, r, dir }: { cx: number; cy: number; r: number; dir: "down-right" | "down-left" }) {
  // Draw a door leaf line and quarter-circle sweep
  if (dir === "down-right") {
    return (
      <G>
        <Path d={`M ${cx},${cy} L ${cx + r},${cy}`} stroke={C_DOOR} strokeWidth={1.5} fill="none" />
        <Path d={`M ${cx + r},${cy} A ${r},${r} 0 0,1 ${cx},${cy + r}`} stroke={C_DOOR} strokeWidth={1.2} fill="none" strokeDasharray="3,2" />
      </G>
    );
  }
  return (
    <G>
      <Path d={`M ${cx},${cy} L ${cx - r},${cy}`} stroke={C_DOOR} strokeWidth={1.5} fill="none" />
      <Path d={`M ${cx - r},${cy} A ${r},${r} 0 0,0 ${cx},${cy + r}`} stroke={C_DOOR} strokeWidth={1.2} fill="none" strokeDasharray="3,2" />
    </G>
  );
}

// ─── Single booth renderer ────────────────────────────────────────────────────
function Booth({ b, visited }: { b: BoothDef; visited: boolean }) {
  const fill   = visited ? C_VISITED : C_BOOTH;
  const stroke = visited ? C_VIS_STR : C_STROKE;
  const tcol   = visited ? C_TEXT_V  : C_TEXT_N;
  const cx     = b.x + b.w / 2;
  const cy     = b.y + b.h / 2;
  const name   = BOOTH_NAMES[b.id] ?? "";

  if (b.narrow) {
    // Rotated narrow booth — number and name sideways
    return (
      <G>
        <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5}
          fill={fill} stroke={stroke} strokeWidth={1.2} />
        <SvgText
          x={cx} y={cy}
          fontSize={9} fontWeight="700" fill={tcol}
          textAnchor="middle" alignmentBaseline="middle"
          transform={`rotate(-90 ${cx} ${cy})`}>
          {b.id}
        </SvgText>
      </G>
    );
  }

  const narrow     = b.w < 88;
  const numSize    = narrow ? 10 : 12;
  const nameSize   = narrow ? 7.5 : 9;
  const maxCh      = narrow ? 10 : 13;
  const nameLines  = wrap(name, maxCh);
  const totalLines = nameLines.length;

  // Vertical centering: stack number + name lines
  const lineH      = nameSize + 2;
  const blockH     = numSize + (totalLines > 0 ? 3 + totalLines * lineH : 0);
  const topY       = cy - blockH / 2 + numSize / 2;

  return (
    <G>
      <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={RX}
        fill={fill} stroke={stroke} strokeWidth={1.4} />

      {/* Booth number */}
      <SvgText x={cx} y={topY}
        fontSize={numSize} fontWeight="700" fill={tcol}
        textAnchor="middle" alignmentBaseline="middle">
        {b.id}
      </SvgText>

      {/* Vendor name lines */}
      {nameLines.map((line, i) => (
        <SvgText key={i}
          x={cx} y={topY + numSize * 0.6 + 3 + i * lineH + lineH / 2}
          fontSize={nameSize} fill={tcol}
          textAnchor="middle" alignmentBaseline="middle">
          {line}
        </SvgText>
      ))}

      {/* Visited check */}
      {visited && (
        <SvgText x={b.x + b.w - 9} y={b.y + 10}
          fontSize={9} fontWeight="900" fill={C_VIS_STR}
          textAnchor="middle" alignmentBaseline="middle">
          ✓
        </SvgText>
      )}
    </G>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props { visitedBooths: string[]; scale?: number; }

export default function ExhibitHallMap({ visitedBooths, scale = 1 }: Props) {
  const visited = new Set(visitedBooths.map(String));

  // Door arc positions (top entrance into ballroom)
  const LDOOR_X = Math.floor((LW_X + LW_W + TW_X0) / 2);  // between 200 and 202
  const RDOOR_X = Math.floor((TW_X0 + TW_TOT + RW_X) / 2); // between 210 and 212

  // Bottom door positions (exits near 505 and 511)
  const bot505 = BOT_ROW.find(b => b.id === "505");
  const bot511 = BOT_ROW.find(b => b.id === "511");
  const BDOOR1_X = bot505 ? bot505.x + bot505.w / 2 : 0;
  const BDOOR2_X = bot511 ? bot511.x + bot511.w / 2 : 0;

  return (
    <Svg width={SVG_W * scale} height={SVG_H * scale}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}>

      {/* ── Building background ─────────────────────────────────── */}
      <Rect x={0} y={0} width={SVG_W} height={SVG_H} rx={12}
        fill={C_BG} stroke={C_WALL} strokeWidth={2} />

      {/* ── FOYER section label ─────────────────────────────────── */}
      <SvgText x={SVG_W / 2} y={FA_Y - 14}
        fontSize={10} fontWeight="700" fill="#4b5563"
        textAnchor="middle" alignmentBaseline="middle">
        JORDANELLE FOYER — HALLWAY (outside exhibit hall)
      </SvgText>

      {/* Foyer background */}
      <Rect x={FA_X0 - 6} y={FA_Y - 6}
        width={FA_TOT + 12}
        height={FC_Y + FB_H - FA_Y + 12}
        rx={6} fill="#ccd8e2" stroke={C_WALL} strokeWidth={1} />

      {/* Hallway strip */}
      <Rect x={FA_X0 - 6} y={HALL_Y} width={FA_TOT + 12} height={HALL_H}
        fill="#b8c8d4" opacity={0.6} />
      <SvgText x={FA_X0 + FA_TOT / 2} y={HALL_Y + HALL_H / 2}
        fontSize={7.5} fontWeight="600" fill="#374151"
        textAnchor="middle" alignmentBaseline="middle">
        ← 8' Hallway between main classrooms →
      </SvgText>

      {/* Load-in doors label */}
      <SvgText x={10} y={FA_Y + FB_H / 2}
        fontSize={7.5} fontWeight="700" fill="#dc2626"
        textAnchor="start" alignmentBaseline="middle">
        ↓ Load-in Doors
      </SvgText>

      {/* ── Transition / Door area ─────────────────────────────── */}
      <Rect x={LW_X} y={TRANS_Y} width={SVG_W - LW_X * 2} height={TRANS_H}
        rx={4} fill="#cdd6de" opacity={0.5} />
      <SvgText x={SVG_W / 2} y={TRANS_Y + TRANS_H / 2}
        fontSize={8.5} fontWeight="600" fill="#374151"
        textAnchor="middle" alignmentBaseline="middle">
        — Main Ballroom Lobby —
      </SvgText>

      {/* Door arcs (top) */}
      <DoorArc cx={LDOOR_X} cy={BALL_Y0} r={28} dir="down-right" />
      <DoorArc cx={RDOOR_X} cy={BALL_Y0} r={28} dir="down-left" />

      {/* ── Ballroom background ─────────────────────────────────── */}
      <Rect x={LW_X} y={BALL_Y0 - 4} width={SVG_W - LW_X * 2} height={SVG_H - BALL_Y0 - 20}
        rx={6} fill="#d6e0e8" stroke={C_WALL} strokeWidth={1.2} />

      {/* Ballroom label (watermark) */}
      <SvgText x={SVG_W / 2} y={P2A_Y + IB_H + PA / 2}
        fontSize={13} fontWeight="700" fill="#b8c8d430"
        textAnchor="middle" alignmentBaseline="middle">
        JORDANELLE BALLROOM
      </SvgText>

      {/* Registration Desk label (left side) */}
      <SvgText
        x={LW_X + 4} y={(P1B_Y + P2A_Y) / 2}
        fontSize={6.5} fontWeight="600" fill="#16a34a"
        textAnchor="middle" alignmentBaseline="middle"
        transform={`rotate(-90 ${LW_X + 4} ${(P1B_Y + P2A_Y) / 2})`}>
        Registration Desk
      </SvgText>

      {/* Entrance from hotel lobby label */}
      <SvgText x={LW_X + 4} y={BOT_Y + BOT_H + 20}
        fontSize={7} fontWeight="700" fill="#dc2626"
        textAnchor="start" alignmentBaseline="middle">
        ← Entrance / Escalators
      </SvgText>

      {/* Door arcs (bottom exits at 505 & 511) */}
      {bot505 && (
        <DoorArc cx={BDOOR1_X} cy={BOT_Y + BOT_H} r={22} dir="down-right" />
      )}
      {bot511 && (
        <DoorArc cx={BDOOR2_X} cy={BOT_Y + BOT_H} r={22} dir="down-left" />
      )}

      {/* ── Aisle labels ─────────────────────────────────────────── */}
      {[P1A_Y + IB_H + PA / 2, P2A_Y + IB_H + PA / 2, P3A_Y + IB_H + PA / 2].map((ay, i) => (
        <SvgText key={i} x={SVG_W / 2} y={ay}
          fontSize={6.5} fill="#94a3b8"
          textAnchor="middle" alignmentBaseline="middle">
          ← aisle →
        </SvgText>
      ))}

      {/* ── All booths ────────────────────────────────────────────── */}
      {ALL_BOOTHS.map(b => <Booth key={b.id} b={b} visited={visited.has(b.id)} />)}

    </Svg>
  );
}
