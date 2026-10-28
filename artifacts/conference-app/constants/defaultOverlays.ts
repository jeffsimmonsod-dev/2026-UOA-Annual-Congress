import event from "@event";
import type { OverlayRect, RoomOverlay } from "@/events/types";

export type { OverlayRect, RoomOverlay };
export interface PlanData {
  nativeW: number;
  nativeH: number;
  overlays: RoomOverlay[];
}

/** Default room highlight areas per floor plan, from the event folder. */
export const DEFAULT_OVERLAYS: Record<string, PlanData> = Object.fromEntries(
  event.content.floorPlans.map((plan) => [
    plan.id,
    { nativeW: plan.nativeW, nativeH: plan.nativeH, overlays: plan.overlays },
  ])
);

/** Used when a plan id is unknown: the first floor plan, or an empty plan. */
export const FALLBACK_PLAN: PlanData =
  DEFAULT_OVERLAYS[event.content.floorPlans[0]?.id ?? ""] ?? { nativeW: 1, nativeH: 1, overlays: [] };
