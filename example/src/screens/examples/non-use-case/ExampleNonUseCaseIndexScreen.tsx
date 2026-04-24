import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../../../navigation/types";
import type { ApiExampleManifestEntry } from "../apiExampleManifest";
import { nonUseCaseExamples } from "../apiExampleManifest";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "ExampleNonUseCaseIndex"
>;

export function ExampleNonUseCaseIndexScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

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
          <Text style={localStyles.route}>examples/non-use-case</Text>
          <Text style={localStyles.title}>RN-only workarounds</Text>
          <Text style={localStyles.description}>
            Each page keeps the hidden Text and callback code in the screen file
            so the workaround is visible.
          </Text>
        </View>

        {nonUseCaseExamples.map((entry) => (
          <NonUseCaseLink
            entry={entry}
            key={entry.path}
            onPress={() => navigation.navigate(entry.routeName)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function NonUseCaseLink({
  entry,
  onPress,
}: {
  entry: ApiExampleManifestEntry;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.card,
        pressed && localStyles.cardPressed,
      ]}
      testID={`examples.non-use-case.open.${entry.pairId}`}
    >
      <Text style={localStyles.cardRoute}>{entry.path}</Text>
      <Text style={localStyles.cardTitle}>{entry.title}</Text>
      <Text style={localStyles.cardDescription}>{entry.shortDescription}</Text>
    </Pressable>
  );
}

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  cardDescription: {
    color: "#4f5b57",
    fontSize: 14,
    lineHeight: 20,
  },
  cardPressed: {
    opacity: 0.72,
  },
  cardRoute: {
    color: "#63706b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardTitle: {
    color: "#1f2725",
    fontSize: 17,
    fontWeight: "800",
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
    marginBottom: 4,
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
