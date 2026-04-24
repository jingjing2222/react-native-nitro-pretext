import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../benchmark/constants";
import type { AppStackParamList } from "../../navigation/types";
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
          <Text style={styles.title}>Examples map API use cases to docs.</Text>
          <Text style={styles.subtitle}>
            Start with the Pretext API examples, then open the matching RN-only
            workarounds to see what hidden measurement code they replace.
          </Text>
        </View>

        <CatalogCard
          buttonLabel="Open examples/use-case"
          buttonTestID="examples.open-use-case"
          description="Focused examples for prepare, layout outputs, hook lifecycle, namespace calls, and exported types."
          onPress={() => navigation.navigate("ExampleUseCaseIndex")}
          title="examples/use-case"
        />

        <CatalogCard
          buttonLabel="Open examples/none-use-case"
          buttonTestID="examples.open-none-use-case"
          description="Side-by-side RN-only measurement flows using hidden Text, onLayout, and onTextLayout."
          onPress={() => navigation.navigate("ExampleNoneUseCaseIndex")}
          title="examples/none-use-case"
        />
      </ScrollView>
    </View>
  );
}
