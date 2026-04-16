import { ScrollView, View } from "react-native";
import ExhibitHallMap from "@/components/ExhibitHallMap";
export default function MapPreview() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f0f4f8" }}>
      <ScrollView horizontal>
        <ScrollView>
          <ExhibitHallMap visitedBooths={[]} scale={1} />
        </ScrollView>
      </ScrollView>
    </View>
  );
}
