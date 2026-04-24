import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../../benchmark/constants";
import {
  CatalogCard,
  MetricPill,
} from "../../../components/BenchmarkComponents";
import type { AppStackParamList } from "../../../navigation/types";
import { useCaseExamples } from "../apiExampleManifest";

type Props = NativeStackScreenProps<AppStackParamList, "ExampleUseCaseIndex">;

export function ExampleUseCaseIndexScreen({ navigation }: Props) {
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
          <Text style={styles.eyebrow}>examples/use-case</Text>
          <Text style={styles.title}>
            Pretext API examples map to docs/api.
          </Text>
          <Text style={styles.subtitle}>
            Each route focuses on one public API contract: code, live controls,
            native result, and the ordinary RN surface that consumes it.
          </Text>
          <View style={styles.metricRow}>
            <MetricPill
              label="Mapped routes"
              value={String(useCaseExamples.length)}
            />
            <MetricPill label="Docs coverage" value="runtime API" />
          </View>
        </View>

        {useCaseExamples.map((entry) => (
          <CatalogCard
            buttonLabel={`Open ${entry.path}`}
            buttonTestID={`examples.use-case.open.${entry.pairId}`}
            description={entry.shortDescription}
            key={entry.path}
            onPress={() => navigation.navigate(entry.routeName)}
            title={entry.title}
          />
        ))}
      </ScrollView>
    </View>
  );
}
