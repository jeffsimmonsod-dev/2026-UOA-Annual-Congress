/**
 * One consistent color per conference room — used on the schedule cards
 * AND as the legend/indicator on the venue floor plans.
 */
export const ROOM_COLORS: Record<string, string> = {
  "Deer Creek Ballroom":        "#f59e0b", // amber   — main ballroom
  "Strawberry Conference Room": "#f43f5e", // rose    — strawberry!
  "Dutch Conference Room":      "#14b8a6", // teal
  "Empire Conference Room":     "#8b5cf6", // purple
  "Jordanelle Ballroom":        "#3b82f6", // blue    — the lake
  "Hailstone Terrace":          "#22c55e", // green   — outdoor
  "Remington Hall Restaurant":  "#f97316", // orange  — dining
};

export function getRoomColor(room: string): string {
  return ROOM_COLORS[room] ?? "#6b7280";
}
