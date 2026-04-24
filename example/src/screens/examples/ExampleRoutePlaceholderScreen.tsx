import type { ComponentType } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../benchmark/constants";
import type { ApiExampleManifestEntry } from "./apiExampleManifest";

type PlaceholderProps = {
  entry: ApiExampleManifestEntry;
};

function createReport(entry: ApiExampleManifestEntry): string {
  return `${entry.reportPrefix}::${entry.path}::${JSON.stringify({
    apiSymbol: entry.apiSymbol,
    coveredDocSections: entry.coveredDocSections,
    pairId: entry.pairId,
    status: "planned",
  })}`;
}

export function ExampleRoutePlaceholderScreen({ entry }: PlaceholderProps) {
  const insets = useSafeAreaInsets();
  const report = createReport(entry);

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
          <Text style={styles.eyebrow}>{entry.path}</Text>
          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.subtitle}>{entry.shortDescription}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Mapped docs sections</Text>
          <View style={styles.codeList}>
            {entry.coveredDocSections.map((section) => (
              <Text key={section} style={styles.codeRow}>
                {section}
              </Text>
            ))}
          </View>
          <Text style={styles.noteMuted}>
            Placeholder route for the API-matched examples rebuild. The live
            example for this route is implemented in its dedicated session.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Automation report</Text>
          <Text selectable style={styles.codeRow}>
            {report}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export function createExampleRoutePlaceholder(
  entry: ApiExampleManifestEntry,
): ComponentType {
  return function PlaceholderRoute() {
    return <ExampleRoutePlaceholderScreen entry={entry} />;
  };
}
