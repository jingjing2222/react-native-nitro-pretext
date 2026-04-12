import { Text, View, StyleSheet } from "react-native";
import { measure, measureBatch } from "react-native-nitro-pretext";

export default function App() {
  const titleWidth = measure(
    "React Native Nitro Pretext",
    "System",
    24,
  ).toFixed(2);
  const sampleWords = ["Typography", "Kerning", "Ligature"];
  const sampleWidths = measureBatch(sampleWords, "System", 18);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TextMeasure via Nitro</Text>
      <Text style={styles.subtitle}>
        measure("React Native Nitro Pretext", 24)
      </Text>
      <Text style={styles.value}>{titleWidth}px</Text>
      {sampleWords.map((word, index) => (
        <Text key={word} style={styles.row}>
          {word}: {(sampleWidths[index] ?? 0).toFixed(2)}px
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f8f7f4",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  value: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 28,
    fontWeight: "600",
    color: "#111827",
  },
  row: {
    fontSize: 16,
    color: "#374151",
    marginTop: 8,
  },
});
