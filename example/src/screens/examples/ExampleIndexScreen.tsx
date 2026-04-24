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
            Example routes focus on layout before render.
          </Text>
          <Text style={styles.subtitle}>
            This app now treats PreText as a layout engine, not a renderer. The
            main example below shows a MeasureLayout-style UI that must know
            text width and height before placing visible content.
          </Text>
        </View>

        <CatalogCard
          buttonLabel="Open examples/measured-layout"
          description="A complex masonry layout that normally needs hidden RN Text plus onLayout before visible render, compared against PreText layout metrics."
          onPress={() => navigation.navigate("ExampleMeasuredLayout")}
          title="examples/measured-layout"
        />
      </ScrollView>
    </View>
  );
}
