import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_OVERLAYS, PlanData, RoomOverlay } from "@/constants/defaultOverlays";

const STORAGE_KEY = "@uoa_overlays_v1";

/** Load all plans from storage, falling back to defaults for any missing plan */
export async function loadAllOverlays(): Promise<Record<string, PlanData>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OVERLAYS;
    const saved: Record<string, RoomOverlay[]> = JSON.parse(raw);
    const merged: Record<string, PlanData> = { ...DEFAULT_OVERLAYS };
    for (const id of Object.keys(saved)) {
      if (merged[id]) {
        merged[id] = { ...merged[id], overlays: saved[id] };
      }
    }
    return merged;
  } catch {
    return DEFAULT_OVERLAYS;
  }
}

/** Load overlays for a single plan from storage */
export async function loadPlanOverlays(planId: string): Promise<PlanData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OVERLAYS[planId] ?? DEFAULT_OVERLAYS.lake;
    const saved: Record<string, RoomOverlay[]> = JSON.parse(raw);
    const base = DEFAULT_OVERLAYS[planId] ?? DEFAULT_OVERLAYS.lake;
    if (saved[planId]) return { ...base, overlays: saved[planId] };
    return base;
  } catch {
    return DEFAULT_OVERLAYS[planId] ?? DEFAULT_OVERLAYS.lake;
  }
}

/** Persist updated overlays for a single plan */
export async function saveOverlaysForPlan(
  planId: string,
  overlays: RoomOverlay[]
): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const saved: Record<string, RoomOverlay[]> = raw ? JSON.parse(raw) : {};
  saved[planId] = overlays;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

/** Reset a single plan back to defaults */
export async function resetPlanOverlays(planId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const saved: Record<string, RoomOverlay[]> = JSON.parse(raw);
  delete saved[planId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}
