import React from "react";
import Svg, {
  Rect,
  Text as SvgText,
  G,
  Line,
  Circle,
} from "react-native-svg";

interface ExhibitHallMapProps {
  visitedBooths: string[];
  scale?: number;
}

type BoothCategory = "foyer" | "island" | "perimeter";

interface BoothDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cat: BoothCategory;
  labelY?: number;
}

const FILL: Record<BoothCategory, string> = {
  foyer: "#c4b5fd",
  island: "#bfdbfe",
  perimeter: "#fde68a",
};
const STROKE: Record<BoothCategory, string> = {
  foyer: "#7c3aed",
  island: "#3b82f6",
  perimeter: "#d97706",
};
const VISITED_FILL = "#6ee7b7";
const VISITED_STROKE = "#059669";

const SVG_W = 760;

// ─── Foyer row (above hallway) ──────────────────────────────────────────────
const FOYER_ABOVE_IDS = ["98", "99", "100", "102", "104", "106", "108", "110", "112"];
const FOYER_BELOW_IDS = ["101", "103", "105", "107", "109", "111"];

const FA_BW = 73;
const FA_BH = 52;
const FA_GAP = 5;
const FA_TOTAL = FOYER_ABOVE_IDS.length * FA_BW + (FOYER_ABOVE_IDS.length - 1) * FA_GAP;
const FA_X0 = (SVG_W - FA_TOTAL) / 2;
const FA_Y = 30;

const FB_BW = 100;
const FB_BH = 52;
const FB_GAP = 10;
const FB_TOTAL = FOYER_BELOW_IDS.length * FB_BW + (FOYER_BELOW_IDS.length - 1) * FB_GAP;
const FB_X0 = (SVG_W - FB_TOTAL) / 2;
const FB_Y = FA_Y + FA_BH + 32;

const foyerAbove: BoothDef[] = FOYER_ABOVE_IDS.map((id, i) => ({
  id,
  x: FA_X0 + i * (FA_BW + FA_GAP),
  y: FA_Y,
  w: FA_BW,
  h: FA_BH,
  cat: "foyer",
}));

const foyerBelow: BoothDef[] = FOYER_BELOW_IDS.map((id, i) => ({
  id,
  x: FB_X0 + i * (FB_BW + FB_GAP),
  y: FB_Y,
  w: FB_BW,
  h: FB_BH,
  cat: "foyer",
}));

// ─── Ballroom layout ────────────────────────────────────────────────────────
const BALL_Y0 = FB_Y + FB_BH + 80; // ballroom starts here (after entrance/doors area)
const PERIM_W = 65;
const PERIM_BH = 58;
const PERIM_GAP = 6;
const CENTER_X0 = PERIM_W + 6;
const CENTER_W = SVG_W - 2 * (PERIM_W + 6);

// Top-wall booths: 200, 202, 204, 206, 210, 212
const TOP_IDS = ["200", "202", "204", "206", "210", "212"];
const TOP_BW = Math.floor((CENTER_W - 5 * 6) / TOP_IDS.length);
const TOP_Y = BALL_Y0;
const topWall: BoothDef[] = TOP_IDS.map((id, i) => ({
  id,
  x: CENTER_X0 + i * (TOP_BW + 6),
  y: TOP_Y,
  w: TOP_BW,
  h: 58,
  cat: "perimeter",
}));

// Island booth rows — 3 back-to-back pairs
const ISL_BW = 98;
const ISL_BH = 50;
const ISL_GAP = 6;
const ISL_PAIR_GAP = 8;
const ISL_ROW_GAP = 48;

function islandRow(ids: string[], y: number): BoothDef[] {
  const total = ids.length * ISL_BW + (ids.length - 1) * ISL_GAP;
  const x0 = CENTER_X0 + (CENTER_W - total) / 2;
  return ids.map((id, i) => ({
    id,
    x: x0 + i * (ISL_BW + ISL_GAP),
    y,
    w: ISL_BW,
    h: ISL_BH,
    cat: "island" as BoothCategory,
  }));
}

// Pair 1
const PAIR1_Y = TOP_Y + 58 + 40;
const pair1A = islandRow(["201", "203", "205", "207", "211"], PAIR1_Y);
const pair1B = islandRow(["304", "306", "308", "310", "312"], PAIR1_Y + ISL_BH + ISL_PAIR_GAP);

// Pair 2
const PAIR2_Y = PAIR1_Y + ISL_BH * 2 + ISL_PAIR_GAP + ISL_ROW_GAP;
const pair2A = islandRow(["301", "303", "305", "307", "309", "311"], PAIR2_Y);
const pair2B = islandRow(["402", "404", "406", "408", "410", "412"], PAIR2_Y + ISL_BH + ISL_PAIR_GAP);

// Pair 3
const PAIR3_Y = PAIR2_Y + ISL_BH * 2 + ISL_PAIR_GAP + ISL_ROW_GAP;
const pair3A = islandRow(["403", "405", "407", "409", "411"], PAIR3_Y);
const pair3B = islandRow(["502", "504", "506", "508", "510", "512"], PAIR3_Y + ISL_BH + ISL_PAIR_GAP);

// Bottom row booths
const BOT_Y = PAIR3_Y + ISL_BH * 2 + ISL_PAIR_GAP + 40;
const BOT_IDS = ["501", "503", "505", "507", "509", "511", "513", "514"];
const BOT_BW = Math.floor((CENTER_W - 7 * 6) / BOT_IDS.length);
const bottomRow: BoothDef[] = BOT_IDS.map((id, i) => ({
  id,
  x: CENTER_X0 + i * (BOT_BW + 6),
  y: BOT_Y,
  w: BOT_BW,
  h: 58,
  cat: "perimeter",
}));

// Left wall booths: 300, 302, 400, 401, 500
const leftWall: BoothDef[] = [
  { id: "300", x: 0, y: PAIR1_Y, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "302", x: 0, y: PAIR1_Y + PERIM_BH + PERIM_GAP, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "400", x: 0, y: PAIR2_Y, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "401", x: 0, y: PAIR2_Y + PERIM_BH + PERIM_GAP, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "500", x: 0, y: PAIR3_Y, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
];

// Right wall booths: 313, 314, 315, 414, 415, 515, 516
const RW_X = SVG_W - PERIM_W;
const rightWall: BoothDef[] = [
  { id: "313", x: RW_X, y: PAIR1_Y, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "314", x: RW_X, y: PAIR1_Y + PERIM_BH + PERIM_GAP, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "315", x: RW_X, y: PAIR1_Y + (PERIM_BH + PERIM_GAP) * 2, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "414", x: RW_X, y: PAIR2_Y, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "415", x: RW_X, y: PAIR2_Y + PERIM_BH + PERIM_GAP, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "515", x: RW_X, y: PAIR3_Y, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
  { id: "516", x: RW_X, y: PAIR3_Y + PERIM_BH + PERIM_GAP, w: PERIM_W, h: PERIM_BH, cat: "perimeter" },
];

const ALL_BOOTHS: BoothDef[] = [
  ...foyerAbove,
  ...foyerBelow,
  ...topWall,
  ...pair1A,
  ...pair1B,
  ...pair2A,
  ...pair2B,
  ...pair3A,
  ...pair3B,
  ...bottomRow,
  ...leftWall,
  ...rightWall,
];

const SVG_H = BOT_Y + 58 + 40;

function BoothRect({
  booth,
  visited,
}: {
  booth: BoothDef;
  visited: boolean;
}) {
  const fill = visited ? VISITED_FILL : FILL[booth.cat];
  const stroke = visited ? VISITED_STROKE : STROKE[booth.cat];
  const cx = booth.x + booth.w / 2;
  const cy = booth.y + booth.h / 2;
  const fontSize = booth.w < 68 ? 9 : booth.w < 90 ? 10 : 11;

  return (
    <G>
      <Rect
        x={booth.x}
        y={booth.y}
        width={booth.w}
        height={booth.h}
        rx={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      {visited && (
        <Circle cx={cx + booth.w * 0.2} cy={booth.y + 11} r={7} fill={VISITED_STROKE} />
      )}
      <SvgText
        x={cx}
        y={cy + (visited ? 3 : 0)}
        fontSize={fontSize}
        fontWeight="700"
        fill={visited ? "#065f46" : "#1e293b"}
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {booth.id}
      </SvgText>
      {visited && (
        <SvgText
          x={cx + booth.w * 0.2}
          y={booth.y + 11.5}
          fontSize={8}
          fontWeight="700"
          fill="#fff"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          ✓
        </SvgText>
      )}
    </G>
  );
}

export default function ExhibitHallMap({ visitedBooths, scale = 1 }: ExhibitHallMapProps) {
  const visitedSet = new Set(visitedBooths.map((b) => String(b)));
  const HALLWAY_Y = FA_Y + FA_BH + 2;
  const HALLWAY_H = FB_Y - HALLWAY_Y - 2;
  const ENTRANCE_Y = FB_Y + FB_BH + 8;
  const ENTRANCE_H = BALL_Y0 - ENTRANCE_Y - 8;

  return (
    <Svg
      width={SVG_W * scale}
      height={SVG_H * scale}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
    >
        {/* ── Foyer background ─────────────────────────────────────── */}
        <Rect
          x={0}
          y={FA_Y - 22}
          width={SVG_W}
          height={FB_Y + FB_BH - FA_Y + 22 + 10}
          rx={8}
          fill="#f5f3ff"
          stroke="#7c3aed"
          strokeWidth={1.5}
        />
        {/* Hallway strip */}
        <Rect
          x={0}
          y={HALLWAY_Y}
          width={SVG_W}
          height={HALLWAY_H}
          fill="#e8e5f4"
          opacity={0.9}
        />
        {/* Foyer label */}
        <SvgText
          x={SVG_W / 2}
          y={FA_Y - 8}
          fontSize={11}
          fontWeight="700"
          fill="#5b21b6"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          JORDANELLE FOYER
        </SvgText>
        {/* Left label */}
        <SvgText
          x={8}
          y={HALLWAY_Y + HALLWAY_H / 2}
          fontSize={8}
          fill="#7c3aed"
          textAnchor="start"
          alignmentBaseline="middle"
        >
          ← Entrance from Hotel Lobby
        </SvgText>
        {/* Right label */}
        <SvgText
          x={SVG_W - 8}
          y={HALLWAY_Y + HALLWAY_H / 2}
          fontSize={8}
          fill="#7c3aed"
          textAnchor="end"
          alignmentBaseline="middle"
        >
          Escalators →
        </SvgText>

        {/* ── Entrance / doors area ─────────────────────────────────── */}
        <Rect
          x={0}
          y={ENTRANCE_Y}
          width={SVG_W}
          height={ENTRANCE_H + 6}
          fill="#e2e8f0"
          rx={4}
        />
        <SvgText
          x={SVG_W / 2}
          y={ENTRANCE_Y + ENTRANCE_H / 2 + 3}
          fontSize={10}
          fontWeight="600"
          fill="#475569"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          Main Doors
        </SvgText>
        <SvgText
          x={SVG_W - 12}
          y={ENTRANCE_Y + ENTRANCE_H / 2 + 3}
          fontSize={9}
          fill="#64748b"
          textAnchor="end"
          alignmentBaseline="middle"
        >
          Registration Desk →
        </SvgText>
        {/* Door lines */}
        <Line
          x1={SVG_W / 2 - 55}
          y1={ENTRANCE_Y + 2}
          x2={SVG_W / 2 - 55}
          y2={ENTRANCE_Y + ENTRANCE_H + 4}
          stroke="#94a3b8"
          strokeWidth={2}
        />
        <Line
          x1={SVG_W / 2 + 55}
          y1={ENTRANCE_Y + 2}
          x2={SVG_W / 2 + 55}
          y2={ENTRANCE_Y + ENTRANCE_H + 4}
          stroke="#94a3b8"
          strokeWidth={2}
        />

        {/* ── Ballroom background ──────────────────────────────────── */}
        <Rect
          x={0}
          y={BALL_Y0 - 8}
          width={SVG_W}
          height={SVG_H - BALL_Y0 + 8}
          rx={8}
          fill="#eff6ff"
          stroke="#3b82f6"
          strokeWidth={1.5}
        />
        <SvgText
          x={SVG_W / 2}
          y={BALL_Y0 + 8}
          fontSize={11}
          fontWeight="700"
          fill="#1d4ed8"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          JORDANELLE BALLROOM
        </SvgText>

        {/* ── All booths ────────────────────────────────────────────── */}
        {ALL_BOOTHS.map((b) => (
          <BoothRect
            key={b.id}
            booth={b}
            visited={visitedSet.has(b.id)}
          />
        ))}

        {/* ── Aisle labels between island pairs ───────────────────── */}
        <SvgText
          x={SVG_W / 2}
          y={PAIR1_Y + ISL_BH + ISL_PAIR_GAP / 2}
          fontSize={7}
          fill="#94a3b8"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          ← aisle →
        </SvgText>
        <SvgText
          x={SVG_W / 2}
          y={PAIR2_Y + ISL_BH + ISL_PAIR_GAP / 2}
          fontSize={7}
          fill="#94a3b8"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          ← aisle →
        </SvgText>
        <SvgText
          x={SVG_W / 2}
          y={PAIR3_Y + ISL_BH + ISL_PAIR_GAP / 2}
          fontSize={7}
          fill="#94a3b8"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          ← aisle →
        </SvgText>
    </Svg>
  );
}
