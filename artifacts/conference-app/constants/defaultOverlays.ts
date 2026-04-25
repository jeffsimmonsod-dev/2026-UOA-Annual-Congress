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
      { room: "Deer Creek Ballroom",        rects: [{ x: 103, y: 239, w: 213, h: 257 }] },
      { room: "Jordanelle Ballroom",         rects: [{ x: 385, y: 354, w: 320, h: 404 }] },
      { room: "Strawberry Conference Room",  rects: [{ x: 777, y: 239, w: 191, h: 129 }] },
    ],
  },
  mid: {
    nativeW: 530,
    nativeH: 589,
    overlays: [
      { room: "Empire Conference Room", rects: [{ x: 91,  y: 48,  w: 176, h: 93  }] },
      { room: "Dutch Conference Room",  rects: [{ x: 322, y: 399, w: 120, h: 80  }] },
    ],
  },
  main: {
    nativeW: 1163,
    nativeH: 767,
    overlays: [
      { room: "Hailstone Terrace",         rects: [{ x: 237, y: 58,  w: 341, h: 379 }] },
      { room: "Remington Hall Restaurant", rects: [{ x: 579, y: 152, w: 107, h: 231 }] },
    ],
  },
};
