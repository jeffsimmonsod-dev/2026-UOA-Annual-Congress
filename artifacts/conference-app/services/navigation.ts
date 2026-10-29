import { router } from "expo-router";

/**
 * Back button for screens opened from More or Home (Speakers, Venue, Para).
 * Returns to wherever the user came from; falls back to the More tab when the
 * screen was opened directly (e.g. a deep link) and there is nothing to go back to.
 */
export function goBackOrMore() {
  if (router.canGoBack()) router.back();
  else router.replace("/more");
}
