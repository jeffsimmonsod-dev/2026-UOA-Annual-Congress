import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";

// ─── Booth name lookup (used by directory & passport) ─────────────────────────
export const BOOTH_NAMES: Record<string, string> = {
  "98":  "Edward Jones",      "99":  "Edward Jones",      "100": "Edward Jones",
  "101": "Lenz Therapeutics", "102": "Lenz Therapeutics",
  "103": "Visionix",          "104": "Visionix",           "105": "Visionix",
  "106": "Restoration Ophth.","107": "Restoration Ophth.",
  "108": "DSBVI",             "109": "DSBVI",
  "110": "Hope Alliance",     "111": "Rawzi Eyewear",      "112": "Friends for Sight",
  "200": "Dompé",
  "201": "The Eye Institute", "202": "Glaukos",
  "203": "LKC Technologies",  "204": "EssilorLuxottica",
  "205": "CooperVision",      "206": "Apellis Pharma.",
  "207": "VSP",               "210": "Rocky Mtn Univ.",
  "211": "J&J Vision",        "212": "Waite Vision",
  "300": "ADIT",              "301": "Bausch+Lomb",
  "302": "Medically USA",     "303": "Sun Pharma",
  "304": "Eye Designs LLC",   "305": "Europa Eyewear",
  "306": "Aseptikits",        "307": "Eyefficient",
  "308": "Cherry Optical",    "309": "L'Amy America",
  "310": "MyEyeDr",           "311": "Premier Vision",
  "312": "Alcon",             "313": "Modern Optical",
  "314": "IT4Eyes",           "315": "MOREL Eyewear",
  "400": "Blue River Med.",   "401": "Blue River Med.",
  "402": "Orgreens Optics",   "403": "Essilor Labs",
  "404": "Shamir Insights",   "405": "Luxottica Frames",
  "406": "Contamac",          "407": "Essilor Instrum.",
  "408": "",                  "409": "",                   "410": "",
  "411": "Optikam Tech",      "412": "Kering Eyewear",
  "414": "MacuHealth",        "415": "Optos, Inc",
  "500": "Topcon",            "501": "",
  "502": "Utah Eye Centers",  "503": "Teem",
  "504": "",                  "505": "",                   "506": "",
  "507": "",                  "508": "ZEISS",              "509": "",
  "510": "ZEISS",             "511": "",
  "512": "Optometric Aesth.", "513": "",
  "514": "Nikon Optical",     "515": "Hoopes Vision",      "516": "",
};

// ─── Map image ─────────────────────────────────────────────────────────────────
const MAP_IMAGE = require("../assets/images/exhibit-hall-map.png");

// Natural dimensions of the supplied image (portrait)
const IMG_W = 795;
const IMG_H = 1024;

interface Props {
  visitedBooths: string[];
  scale?: number;
}

export default function ExhibitHallMap({ visitedBooths, scale = 1 }: Props) {
  const w = IMG_W * scale;
  const h = IMG_H * scale;

  const visited = visitedBooths.filter(Boolean);

  return (
    <View style={{ width: w }}>
      <Image
        source={MAP_IMAGE}
        style={{ width: w, height: h }}
        resizeMode="contain"
      />

      {visited.length > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            ✓ {visited.length} booth{visited.length !== 1 ? "s" : ""} visited:{" "}
            {visited.join(", ")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    marginTop: 6,
    marginHorizontal: 8,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#6ee7b7",
  },
  badgeText: {
    fontSize: 12,
    color: "#065f46",
    fontWeight: "600",
    flexWrap: "wrap",
  },
});
