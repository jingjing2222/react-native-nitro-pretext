import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../../benchmark/constants";
import type { AppStackParamList } from "../../../benchmark/types";
import { CatalogCard } from "../../../components/BenchmarkComponents";

type Props = NativeStackScreenProps<AppStackParamList, "ExampleSlitesIndex">;

export function SlitesIndexScreen({ navigation }: Props) {
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
          <Text style={styles.eyebrow}>screens/examples/slites</Text>
          <Text style={styles.title}>
            Pretext-style scenarios, rebuilt as RN comparison pages.
          </Text>
          <Text style={styles.subtitle}>
            These routes are not generic API samples. Each page puts plain React
            Native Text next to a prepared paragraph path and shows what changes
            in a concrete UI pattern.
          </Text>
        </View>

        <CatalogCard
          buttonLabel="Open examples/slites/accordion"
          description="Height prediction before mount for accordion content."
          onPress={() => navigation.navigate("ExampleSlitesAccordion")}
          title="examples/slites/accordion"
        />

        <CatalogCard
          buttonLabel="Open examples/slites/bubbles"
          description="Find the tightest bubble width that preserves the same wrapped lines."
          onPress={() => navigation.navigate("ExampleSlitesBubbles")}
          title="examples/slites/bubbles"
        />

        <CatalogCard
          buttonLabel="Open examples/slites/dynamic-layout"
          description="Route only the affected line bands around an obstacle instead of shrinking the whole paragraph."
          onPress={() => navigation.navigate("ExampleSlitesDynamicLayout")}
          title="examples/slites/dynamic-layout"
        />

        <CatalogCard
          buttonLabel="Open examples/slites/rich-note"
          description="Styled inline runs plus a non-breakable handle span, with prepared layout known before render."
          onPress={() => navigation.navigate("ExampleSlitesRichNote")}
          title="examples/slites/rich-note"
        />
      </ScrollView>
    </View>
  );
}
