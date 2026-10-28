import event from "@event";

// Bundled speaker photos come from the event folder (content.speakerImages).
const SPEAKER_IMAGES: Record<string, any> = event.content.speakerImages;

export function getSpeakerImage(speakerId: string): any {
  return SPEAKER_IMAGES[speakerId] ?? null;
}
