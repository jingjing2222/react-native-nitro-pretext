import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AppStackParamList } from "./navigation/types";
import { BenchmarkResultsProvider } from "./context/BenchmarkResultsContext";
import { HomeScreen } from "./screens/HomeScreen";
import { BaseTextBenchmarkScreen } from "./screens/benchmark/BaseTextBenchmarkScreen";
import { BenchmarkIndexScreen } from "./screens/benchmark/BenchmarkIndexScreen";
import { BenchmarkMeasuredLayoutCaseStudyScreen } from "./screens/benchmark/BenchmarkMeasuredLayoutCaseStudyScreen";
import { PretextLayoutBenchmarkScreen } from "./screens/benchmark/PretextLayoutBenchmarkScreen";
import { ExampleIndexScreen } from "./screens/examples/ExampleIndexScreen";
import { createExampleRoutePlaceholder } from "./screens/examples/ExampleRoutePlaceholderScreen";
import { apiExampleManifest } from "./screens/examples/apiExampleManifest";
import { ExampleNoneUseCaseIndexScreen } from "./screens/examples/none-use-case/ExampleNoneUseCaseIndexScreen";
import { ExampleUseCaseIndexScreen } from "./screens/examples/use-case/ExampleUseCaseIndexScreen";
import { MeasuredLayoutComparisonScreen } from "./screens/examples/MeasuredLayoutComparisonScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

function getExampleEntry(routeName: keyof AppStackParamList) {
  const entry = apiExampleManifest.find(
    (candidate) => candidate.routeName === routeName,
  );
  if (!entry) {
    throw new Error(`Missing example manifest entry for ${routeName}`);
  }

  return entry;
}

const ExampleUseCasePrepareScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCasePrepare"),
);
const ExampleUseCaseLayoutMetricsScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCaseLayoutMetrics"),
);
const ExampleUseCaseLayoutOptionsScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCaseLayoutOptions"),
);
const ExampleUseCaseLayoutLinesScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCaseLayoutLines"),
);
const ExampleUseCaseDiagnosticsScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCaseDiagnostics"),
);
const ExampleUseCaseLayoutRichScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCaseLayoutRich"),
);
const ExampleUseCaseHookScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCaseHook"),
);
const ExampleUseCaseNamespaceAndTypesScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleUseCaseNamespaceAndTypes"),
);
const ExampleNoneUseCasePrepareScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleNoneUseCasePrepare"),
);
const ExampleNoneUseCaseLayoutMetricsScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleNoneUseCaseLayoutMetrics"),
);
const ExampleNoneUseCaseLayoutOptionsScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleNoneUseCaseLayoutOptions"),
);
const ExampleNoneUseCaseLayoutLinesScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleNoneUseCaseLayoutLines"),
);
const ExampleNoneUseCaseDiagnosticsScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleNoneUseCaseDiagnostics"),
);
const ExampleNoneUseCaseLayoutRichScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleNoneUseCaseLayoutRich"),
);
const ExampleNoneUseCaseHookScreen = createExampleRoutePlaceholder(
  getExampleEntry("ExampleNoneUseCaseHook"),
);

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#f3eee5",
    card: "#f3eee5",
    text: "#1f2725",
    border: "#e6ddcd",
  },
};

const linking = {
  prefixes: ["pretext://"],
  config: {
    screens: {
      Home: "",
      BenchmarkIndex: "benchmark",
      BenchmarkBaseText: "benchmark/base-text",
      BenchmarkPretextLayout: "benchmark/pretext-layout",
      BenchmarkMeasuredLayoutCaseStudy: "benchmark/measured-layout",
      ExampleIndex: "examples",
      ExampleMeasuredLayout: "examples/measured-layout",
      ExampleUseCaseIndex: "examples/use-case",
      ExampleUseCasePrepare: "examples/use-case/prepare",
      ExampleUseCaseLayoutMetrics: "examples/use-case/layout-metrics",
      ExampleUseCaseLayoutOptions: "examples/use-case/layout-options",
      ExampleUseCaseLayoutLines: "examples/use-case/layout-lines",
      ExampleUseCaseDiagnostics: "examples/use-case/layout-diagnostics",
      ExampleUseCaseLayoutRich: "examples/use-case/layout-rich",
      ExampleUseCaseHook: "examples/use-case/use-pretext-layout",
      ExampleUseCaseNamespaceAndTypes: "examples/use-case/namespace-and-types",
      ExampleNoneUseCaseIndex: "examples/none-use-case",
      ExampleNoneUseCasePrepare: "examples/none-use-case/prepare",
      ExampleNoneUseCaseLayoutMetrics: "examples/none-use-case/layout-metrics",
      ExampleNoneUseCaseLayoutOptions: "examples/none-use-case/layout-options",
      ExampleNoneUseCaseLayoutLines: "examples/none-use-case/layout-lines",
      ExampleNoneUseCaseDiagnostics:
        "examples/none-use-case/layout-diagnostics",
      ExampleNoneUseCaseLayoutRich: "examples/none-use-case/layout-rich",
      ExampleNoneUseCaseHook: "examples/none-use-case/use-pretext-layout",
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <BenchmarkResultsProvider>
        <NavigationContainer linking={linking} theme={navigationTheme}>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: {
                backgroundColor: "#f3eee5",
              },
              headerTintColor: "#1f2725",
              headerTitleStyle: {
                fontWeight: "800",
              },
              contentStyle: {
                backgroundColor: "#f3eee5",
              },
            }}
          >
            <Stack.Screen
              component={HomeScreen}
              name="Home"
              options={{ title: "Pretext Layout Lab" }}
            />
            <Stack.Screen
              component={BenchmarkIndexScreen}
              name="BenchmarkIndex"
              options={{ title: "benchmark/*" }}
            />
            <Stack.Screen
              component={BaseTextBenchmarkScreen}
              name="BenchmarkBaseText"
              options={{ title: "benchmark/base-text" }}
            />
            <Stack.Screen
              component={PretextLayoutBenchmarkScreen}
              name="BenchmarkPretextLayout"
              options={{ title: "benchmark/pretext-layout" }}
            />
            <Stack.Screen
              component={BenchmarkMeasuredLayoutCaseStudyScreen}
              name="BenchmarkMeasuredLayoutCaseStudy"
              options={{ title: "benchmark/measured-layout" }}
            />
            <Stack.Screen
              component={ExampleIndexScreen}
              name="ExampleIndex"
              options={{ title: "examples/*" }}
            />
            <Stack.Screen
              component={ExampleUseCaseIndexScreen}
              name="ExampleUseCaseIndex"
              options={{ title: "examples/use-case" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCaseIndexScreen}
              name="ExampleNoneUseCaseIndex"
              options={{ title: "examples/none-use-case" }}
            />
            <Stack.Screen
              component={MeasuredLayoutComparisonScreen}
              name="ExampleMeasuredLayout"
              options={{ title: "examples/measured-layout" }}
            />
            <Stack.Screen
              component={ExampleUseCasePrepareScreen}
              name="ExampleUseCasePrepare"
              options={{ title: "examples/use-case/prepare" }}
            />
            <Stack.Screen
              component={ExampleUseCaseLayoutMetricsScreen}
              name="ExampleUseCaseLayoutMetrics"
              options={{ title: "examples/use-case/layout-metrics" }}
            />
            <Stack.Screen
              component={ExampleUseCaseLayoutOptionsScreen}
              name="ExampleUseCaseLayoutOptions"
              options={{ title: "examples/use-case/layout-options" }}
            />
            <Stack.Screen
              component={ExampleUseCaseLayoutLinesScreen}
              name="ExampleUseCaseLayoutLines"
              options={{ title: "examples/use-case/layout-lines" }}
            />
            <Stack.Screen
              component={ExampleUseCaseDiagnosticsScreen}
              name="ExampleUseCaseDiagnostics"
              options={{ title: "examples/use-case/layout-diagnostics" }}
            />
            <Stack.Screen
              component={ExampleUseCaseLayoutRichScreen}
              name="ExampleUseCaseLayoutRich"
              options={{ title: "examples/use-case/layout-rich" }}
            />
            <Stack.Screen
              component={ExampleUseCaseHookScreen}
              name="ExampleUseCaseHook"
              options={{ title: "examples/use-case/use-pretext-layout" }}
            />
            <Stack.Screen
              component={ExampleUseCaseNamespaceAndTypesScreen}
              name="ExampleUseCaseNamespaceAndTypes"
              options={{ title: "examples/use-case/namespace-and-types" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCasePrepareScreen}
              name="ExampleNoneUseCasePrepare"
              options={{ title: "examples/none-use-case/prepare" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCaseLayoutMetricsScreen}
              name="ExampleNoneUseCaseLayoutMetrics"
              options={{ title: "examples/none-use-case/layout-metrics" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCaseLayoutOptionsScreen}
              name="ExampleNoneUseCaseLayoutOptions"
              options={{ title: "examples/none-use-case/layout-options" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCaseLayoutLinesScreen}
              name="ExampleNoneUseCaseLayoutLines"
              options={{ title: "examples/none-use-case/layout-lines" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCaseDiagnosticsScreen}
              name="ExampleNoneUseCaseDiagnostics"
              options={{ title: "examples/none-use-case/layout-diagnostics" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCaseLayoutRichScreen}
              name="ExampleNoneUseCaseLayoutRich"
              options={{ title: "examples/none-use-case/layout-rich" }}
            />
            <Stack.Screen
              component={ExampleNoneUseCaseHookScreen}
              name="ExampleNoneUseCaseHook"
              options={{ title: "examples/none-use-case/use-pretext-layout" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </BenchmarkResultsProvider>
    </SafeAreaProvider>
  );
}
