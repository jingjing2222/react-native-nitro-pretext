import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../benchmark/constants";
import type { AppStackParamList } from "../../benchmark/types";
import { CatalogCard } from "../../components/BenchmarkComponents";

type Props = NativeStackScreenProps<AppStackParamList, "ExampleIndex">;

export function ExampleIndexScreen({ navigation }: Props) {
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
          <Text style={styles.eyebrow}>screens/examples</Text>
          <Text style={styles.title}>
            Example routes stay focused on API and renderer usage.
          </Text>
          <Text style={styles.subtitle}>
            These screens are not benchmark runs. Each page demonstrates one API
            or renderer surface without sharing a catch-all detail page. The
            `examples/slites/*` branch adds pretext-style scenario comparisons
            against plain React Native Text.
          </Text>
        </View>

        <CatalogCard
          buttonLabel="Open examples/slites/*"
          description="Scenario pages inspired by pretext demos: accordion height prediction, tight bubbles, dynamic obstacle-aware routing, and rich-note comparison."
          onPress={() => navigation.navigate("ExampleSlitesIndex")}
          title="examples/slites/*"
        />

        <CatalogCard
          buttonLabel="Open examples/prepared-view"
          description="Native paragraph surface that consumes prepared state directly."
          onPress={() => navigation.navigate("ExamplePreparedView")}
          title="examples/prepared-view"
        />

        <CatalogCard
          buttonLabel="Open examples/prepared-lines"
          description="JS renderer that consumes explicit line ranges and positions one text node per line."
          onPress={() => navigation.navigate("ExamplePreparedLines")}
          title="examples/prepared-lines"
        />

        <CatalogCard
          buttonLabel="Open examples/prepared-text"
          description="React Native <Text> renderer backed by prepared paragraph breaks."
          onPress={() => navigation.navigate("ExamplePreparedText")}
          title="examples/prepared-text"
        />

        <CatalogCard
          buttonLabel="Open examples/inline-segments"
          description="Inline paragraph preparation with mixed style runs and a caller-supplied atomic box."
          onPress={() => navigation.navigate("ExampleInlineSegments")}
          title="examples/inline-segments"
        />

        <CatalogCard
          buttonLabel="Open examples/line-cursor"
          description="Request-based relayout and cursor-style line streaming for custom renderers."
          onPress={() => navigation.navigate("ExampleLineCursor")}
          title="examples/line-cursor"
        />

        <CatalogCard
          buttonLabel="Open examples/measured-layout"
          description="A complex masonry layout that must measure Text width and height with onLayout before visible render, compared against prepared paragraph metadata."
          onPress={() => navigation.navigate("ExampleMeasuredLayout")}
          title="examples/measured-layout"
        />
      </ScrollView>
    </View>
  );
}
