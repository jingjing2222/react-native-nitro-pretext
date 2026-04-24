import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../../benchmark/constants";
import {
  CatalogCard,
  MetricPill,
} from "../../../components/BenchmarkComponents";
import type { AppStackParamList } from "../../../navigation/types";
import { noneUseCaseExamples } from "../apiExampleManifest";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "ExampleNoneUseCaseIndex"
>;

export function ExampleNoneUseCaseIndexScreen({ navigation }: Props) {
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
          <Text style={styles.eyebrow}>examples/none-use-case</Text>
          <Text style={styles.title}>RN-only workarounds show the cost.</Text>
          <Text style={styles.subtitle}>
            These routes show what has to be built with hidden Text,
            onLayout/onTextLayout, callback fan-in, and stale measurement state
            when Pretext is not used.
          </Text>
          <View style={styles.metricRow}>
            <MetricPill
              label="Mapped routes"
              value={String(noneUseCaseExamples.length)}
            />
            <MetricPill label="Workaround" value="RN Text callbacks" />
          </View>
        </View>

        {noneUseCaseExamples.map((entry) => (
          <CatalogCard
            buttonLabel={`Open ${entry.path}`}
            buttonTestID={`examples.none-use-case.open.${entry.pairId}`}
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
