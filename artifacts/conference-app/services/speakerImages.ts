const SPEAKER_IMAGES: Record<string, any> = {
  s1: require("../assets/speakers/borgman.jpg"),
  s2: require("../assets/speakers/echiverri.jpg"),
  s3: require("../assets/speakers/klute.jpg"),
  s4: require("../assets/speakers/petrosyan.jpg"),
  s5: require("../assets/speakers/davies.jpg"),
  s6: require("../assets/speakers/johnston.jpg"),
  s7: require("../assets/speakers/brujic.jpg"),
  s8: require("../assets/speakers/stclair.jpg"),
  s9: require("../assets/speakers/moy.jpg"),
};

export function getSpeakerImage(speakerId: string): any {
  return SPEAKER_IMAGES[speakerId] ?? null;
}
