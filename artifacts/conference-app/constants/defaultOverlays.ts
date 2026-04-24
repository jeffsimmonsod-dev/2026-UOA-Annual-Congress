export interface OverlayRect { x: number; y: number; w: number; h: number }
export interface RoomOverlay { room: string; rects: OverlayRect[] }
export interface PlanData {
  nativeW: number;
  nativeH: number;
  overlays: RoomOverlay[];
}

export const DEFAULT_OVERLAYS: Record<string, PlanData> = {
  lake: {
    nativeW: 1000,
    nativeH: 880,
    overlays: [
      { room: "Deer Creek Ballroom",       rects: [{ x: 70,  y: 235, w: 232, h: 190 }, { x: 70, y: 425, w: 232, h: 275 }] },
      { room: "Jordanelle Ballroom",        rects: [{ x: 370, y: 360, w: 310, h: 475 }] },
      { room: "Strawberry Conference Room", rects: [{ x: 718, y: 235, w: 252, h: 140 }] },
    ],
  },
  mid: {
    nativeW: 530,
    nativeH: 589,
    overlays: [
      { room: "Empire Conference Room", rects: [{ x: 78,  y: 28,  w: 192, h: 150 }] },
      { room: "Dutch Conference Room",  rects: [{ x: 370, y: 413, w: 128, h: 115 }] },
    ],
  },
  main: {
    nativeW: 1163,
    nativeH: 767,
    overlays: [
      { room: "Hailstone Terrace",         rects: [{ x: 120, y: 75,  w: 255, h: 245 }] },
      { room: "Remington Hall Restaurant", rects: [{ x: 440, y: 10,  w: 178, h: 310 }] },
    ],
  },
};
