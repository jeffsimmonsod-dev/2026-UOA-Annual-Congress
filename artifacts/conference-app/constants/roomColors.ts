import event from "@event";

/**
 * One consistent color per conference room — used on the schedule cards
 * AND as the legend/indicator on the venue floor plans. Set per event.
 */
export const ROOM_COLORS: Record<string, string> = event.content.roomColors;

export function getRoomColor(room: string): string {
  return ROOM_COLORS[room] ?? "#6b7280";
}
