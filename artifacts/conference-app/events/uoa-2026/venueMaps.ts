// UOA 2026 venue: Grand Hyatt Deer Valley floor plans, room highlight areas and room colors.
import type { FloorPlan } from "../types";

export const floorPlans: FloorPlan[] = [
  {
    id: "lake",
    label: "Lake Level",
    source: require("./assets/floorplan-lake-level.png"),
    nativeW: 1000,
    nativeH: 880,
    rooms: ["Deer Creek Ballroom", "Jordanelle Ballroom", "Strawberry Conference Room"],
    overlays: [
      { room: "Deer Creek Ballroom",        rects: [{ x: 103, y: 239, w: 213, h: 257 }] },
      { room: "Jordanelle Ballroom",         rects: [{ x: 385, y: 354, w: 320, h: 404 }] },
      { room: "Strawberry Conference Room",  rects: [{ x: 777, y: 239, w: 191, h: 129 }] },
    ],
  },
  {
    id: "mid",
    label: "Mid Mountain Level",
    source: require("./assets/floorplan-mid-mountain.png"),
    nativeW: 530,
    nativeH: 589,
    rooms: ["Empire Conference Room", "Dutch Conference Room"],
    overlays: [
      { room: "Empire Conference Room", rects: [{ x: 91,  y: 48,  w: 176, h: 93  }] },
      { room: "Dutch Conference Room",  rects: [{ x: 322, y: 399, w: 120, h: 80  }] },
    ],
  },
  {
    id: "main",
    label: "Main Level",
    source: require("./assets/floorplan-main-level.png"),
    nativeW: 1163,
    nativeH: 767,
    rooms: ["Hailstone Terrace", "Remington Hall Restaurant"],
    overlays: [
      { room: "Hailstone Terrace",         rects: [{ x: 237, y: 58,  w: 341, h: 379 }] },
      { room: "Remington Hall Restaurant", rects: [{ x: 579, y: 152, w: 107, h: 231 }] },
    ],
  },
];

/** One consistent color per room: schedule cards AND floor-plan legend. */
export const roomColors: Record<string, string> = {
  "Deer Creek Ballroom":        "#f59e0b", // amber   — main ballroom
  "Strawberry Conference Room": "#f43f5e", // rose    — strawberry!
  "Dutch Conference Room":      "#14b8a6", // teal
  "Empire Conference Room":     "#8b5cf6", // purple
  "Jordanelle Ballroom":        "#3b82f6", // blue    — the lake
  "Hailstone Terrace":          "#22c55e", // green   — outdoor
  "Remington Hall Restaurant":  "#f97316", // orange  — dining
};
