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
            These screens are not benchmark runs. Each page demonstrates one
            API or renderer surface without sharing a catch-all detail page.
          </Text>
        </View>

        <CatalogCard
          buttonLabel="Open examples/prepared-view"
          description="Native paragraph surface that consumes prepared state directly."
          onPress={() => navigation.navigate("ExamplePreparedView")}
          title="examples/prepared-view"
        />

        <CatalogCard
          buttonLabel="Open examples/prepared-text"
          description="React Native <Text> renderer backed by prepared paragraph breaks."
          onPress={() => navigation.navigate("ExamplePreparedText")}
          title="examples/prepared-text"
        />

        <CatalogCard
          buttonLabel="Open examples/inline-segments"
          description="Inline paragraph preparation with a non-breakable handle span."
          onPress={() => navigation.navigate("ExampleInlineSegments")}
          title="examples/inline-segments"
        />

        <CatalogCard
          buttonLabel="Open examples/line-cursor"
          description="Request-based relayout and cursor-style line streaming for custom renderers."
          onPress={() => navigation.navigate("ExampleLineCursor")}
          title="examples/line-cursor"
        />
      </ScrollView>
    </View>
  );
}
