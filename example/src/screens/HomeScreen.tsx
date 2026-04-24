import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../benchmark/constants";
import { CatalogCard, MetricPill } from "../components/BenchmarkComponents";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
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
          <Text style={styles.eyebrow}>Pretext Layout Lab</Text>
          <Text style={styles.title}>
            Measure text height before visible render.
          </Text>
          <Text style={styles.subtitle}>
            Learn each public API through focused examples, then compare the
            same use cases against plain RN Text measurement flows.
          </Text>

          <View style={styles.metricRow}>
            <MetricPill label="Examples" value="API matched" />
            <MetricPill label="Comparison" value="RN-only flows" />
            <MetricPill label="Benchmarks" value="isolated routes" />
          </View>
        </View>

        <CatalogCard
          buttonLabel="Open examples/*"
          buttonTestID="home.open-examples"
          description="Browse API-focused use cases and matching RN-only workarounds."
          onPress={() => navigation.navigate("ExampleIndex")}
          title="Examples"
        />

        <CatalogCard
          buttonLabel="Open benchmark/*"
          buttonTestID="home.open-benchmark"
          description="Run timing and parity validation screens separately from API examples."
          onPress={() => navigation.navigate("BenchmarkIndex")}
          title="Benchmarks"
        />
      </ScrollView>
    </View>
  );
}
