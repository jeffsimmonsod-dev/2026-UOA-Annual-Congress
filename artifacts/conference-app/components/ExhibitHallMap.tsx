import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";

// ─── Booth name lookup (used by directory & passport) ─────────────────────────
export const BOOTH_NAMES: Record<string, string> = {
  "098": "Edward Jones",      "98":  "Kering Eyewear",     "100": "",
  "101": "Lenz Therapeutics", "102": "",
  "103": "Visionix",          "104": "",                    "105": "",
  "106": "Restoration Ophth.","107": "",
  "108": "DSBVI",             "109": "",
  "110": "Hope Alliance",     "111": "Rawzi Eyewear",       "112": "Friends for Sight",
  "200": "Dompé",
  "201": "The Eye Institute", "202": "Glaukos",
  "203": "LKC Technologies",  "204": "",
  "205": "MacuHealth",        "206": "Apellis Pharma.",
  "207": "VSP",               "210": "Rocky Mtn Univ.",
  "211": "J&J Vision",        "212": "Waite Vision",
  "300": "ADIT",              "301": "Bausch+Lomb",
  "302": "Medically USA",     "303": "",
  "304": "Eye Designs LLC",   "305": "Tarsus",
  "306": "Aseptikits",        "307": "Eyefficient",
  "308": "Cherry Optical",    "309": "Europa Eyewear",
  "310": "MyEyeDr",           "311": "Optikam Tech",
  "312": "iOR Partners",      "313": "CooperVision",
  "314": "IT4Eyes",           "315": "",
  "400": "Blue River Med.",   "401": "",
  "402": "Orgreens Optics",   "403": "",
  "404": "Shamir Insights",   "405": "",
  "406": "Contamac",          "407": "",
  "408": "Premier Vision",    "409": "L'Amy America",       "410": "Sun Pharma",
  "411": "Alcon",             "412": "Optometric Aesth.",
  "414": "Teem",              "415": "Optos, Inc",
  "500": "Topcon",            "501": "ZEISS",
  "502": "Utah Eye Centers",  "503": "ZEISS",
  "504": "",                  "505": "",                    "506": "EssilorLuxottica",
  "507": "",                  "508": "Essilor Labs",        "509": "Modern Optical",
  "510": "Luxottica Frames",  "511": "MOREL Eyewear",
  "512": "Essilor Instrum.",  "513": "",
  "514": "",                  "515": "Hoopes Vision",       "516": "Nikon Optical",
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
