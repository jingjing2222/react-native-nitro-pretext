import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../benchmark/constants";

export function BenchmarkMeasuredLayoutCaseStudyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.appShell}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 56 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>benchmark/measured-layout</Text>
          <Text style={styles.title}>Measured layout case study</Text>
          <Text style={styles.subtitle}>
            Placeholder route for moving the existing measured layout comparison
            out of examples and into benchmark. The screen is moved in Session
            2.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
