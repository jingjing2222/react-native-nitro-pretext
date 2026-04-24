import type { ComponentType } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    <View style={localStyles.screen}>
      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          { paddingBottom: 56 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.header}>
          <Text style={localStyles.route}>{entry.path}</Text>
          <Text style={localStyles.title}>{entry.title}</Text>
          <Text style={localStyles.description}>{entry.shortDescription}</Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage page pending</Text>
          <Text style={localStyles.body}>
            This route exists so navigation and docs mapping are stable. The
            dedicated implementation session replaces this placeholder with
            inline API usage code only.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Automation report</Text>
          <Text selectable style={localStyles.code}>
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

const localStyles = StyleSheet.create({
  body: {
    color: "#4f5b57",
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    backgroundColor: "#1f2725",
    borderRadius: 6,
    color: "#f5efe4",
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 16,
    padding: 12,
  },
  content: {
    gap: 12,
    padding: 20,
  },
  description: {
    color: "#4f5b57",
    fontSize: 15,
    lineHeight: 22,
  },
  header: {
    gap: 8,
  },
  panel: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: {
    color: "#1f2725",
    fontSize: 15,
    fontWeight: "800",
  },
  route: {
    color: "#63706b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  screen: {
    backgroundColor: "#f3eee5",
    flex: 1,
  },
  title: {
    color: "#1f2725",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
  },
});
