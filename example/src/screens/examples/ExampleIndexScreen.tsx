import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "ExampleIndex">;

export function ExampleIndexScreen({ navigation }: Props) {
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
          <Text style={localStyles.route}>examples</Text>
          <Text style={localStyles.title}>API examples</Text>
          <Text style={localStyles.description}>
            Pick a Pretext API page, then compare the matching RN-only
            workaround.
          </Text>
        </View>

        <ExampleLink
          description="A draggable circle demo adapted from pretext-react-native-example, using Pretext line output and shapeSlices."
          onPress={() => navigation.navigate("PretextReactNativeExample")}
          testID="examples.open-pretext-react-native-example"
          title="examples/pretext-react-native-example"
        />

        <ExampleLink
          description="Focused pages for prepare, layout outputs, hook lifecycle, namespace calls, and exported types."
          onPress={() => navigation.navigate("ExampleUseCaseIndex")}
          testID="examples.open-use-case"
          title="examples/use-case"
        />

        <ExampleLink
          description="Matching RN-only pages using hidden Text, onLayout, and onTextLayout."
          onPress={() => navigation.navigate("ExampleNonUseCaseIndex")}
          testID="examples.open-non-use-case"
          title="examples/non-use-case"
        />
      </ScrollView>
    </View>
  );
}

function ExampleLink({
  description,
  onPress,
  testID,
  title,
}: {
  description: string;
  onPress: () => void;
  testID: string;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.card,
        pressed && localStyles.cardPressed,
      ]}
      testID={testID}
    >
      <Text style={localStyles.cardTitle}>{title}</Text>
      <Text style={localStyles.cardDescription}>{description}</Text>
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
