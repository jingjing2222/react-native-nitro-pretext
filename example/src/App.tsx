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
import { ExampleNonUseCaseDiagnosticsScreen } from "./screens/examples/non-use-case/ExampleNonUseCaseDiagnosticsScreen";
import { ExampleNonUseCaseIndexScreen } from "./screens/examples/non-use-case/ExampleNonUseCaseIndexScreen";
import { ExampleNonUseCaseLayoutLinesScreen } from "./screens/examples/non-use-case/ExampleNonUseCaseLayoutLinesScreen";
import { ExampleNonUseCaseLayoutMetricsScreen } from "./screens/examples/non-use-case/ExampleNonUseCaseLayoutMetricsScreen";
import { ExampleNonUseCaseLayoutOptionsScreen } from "./screens/examples/non-use-case/ExampleNonUseCaseLayoutOptionsScreen";
import { ExampleNonUseCaseLayoutRichScreen } from "./screens/examples/non-use-case/ExampleNonUseCaseLayoutRichScreen";
import { ExampleNonUseCasePrepareScreen } from "./screens/examples/non-use-case/ExampleNonUseCasePrepareScreen";
import { ExampleNonUseCaseHookScreen } from "./screens/examples/non-use-case/ExampleNonUseCaseHookScreen";
import { ExampleUseCaseDiagnosticsScreen } from "./screens/examples/use-case/ExampleUseCaseDiagnosticsScreen";
import { ExampleUseCaseIndexScreen } from "./screens/examples/use-case/ExampleUseCaseIndexScreen";
import { ExampleUseCaseLayoutLinesScreen } from "./screens/examples/use-case/ExampleUseCaseLayoutLinesScreen";
import { ExampleUseCaseLayoutMetricsScreen } from "./screens/examples/use-case/ExampleUseCaseLayoutMetricsScreen";
import { ExampleUseCaseLayoutOptionsScreen } from "./screens/examples/use-case/ExampleUseCaseLayoutOptionsScreen";
import { ExampleUseCaseLayoutRichScreen } from "./screens/examples/use-case/ExampleUseCaseLayoutRichScreen";
import { ExampleUseCaseHookScreen } from "./screens/examples/use-case/ExampleUseCaseHookScreen";
import { ExampleUseCaseNamespaceAndTypesScreen } from "./screens/examples/use-case/ExampleUseCaseNamespaceAndTypesScreen";
import { ExampleUseCasePrepareScreen } from "./screens/examples/use-case/ExampleUseCasePrepareScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

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
      ExampleUseCaseIndex: "examples/use-case",
      ExampleUseCasePrepare: "examples/use-case/prepare",
      ExampleUseCaseLayoutMetrics: "examples/use-case/layout-metrics",
      ExampleUseCaseLayoutOptions: "examples/use-case/layout-options",
      ExampleUseCaseLayoutLines: "examples/use-case/layout-lines",
      ExampleUseCaseDiagnostics: "examples/use-case/layout-diagnostics",
      ExampleUseCaseLayoutRich: "examples/use-case/layout-rich",
      ExampleUseCaseHook: "examples/use-case/use-pretext-layout",
      ExampleUseCaseNamespaceAndTypes: "examples/use-case/namespace-and-types",
      ExampleNonUseCaseIndex: "examples/non-use-case",
      ExampleNonUseCasePrepare: "examples/non-use-case/prepare",
      ExampleNonUseCaseLayoutMetrics: "examples/non-use-case/layout-metrics",
      ExampleNonUseCaseLayoutOptions: "examples/non-use-case/layout-options",
      ExampleNonUseCaseLayoutLines: "examples/non-use-case/layout-lines",
      ExampleNonUseCaseDiagnostics: "examples/non-use-case/layout-diagnostics",
      ExampleNonUseCaseLayoutRich: "examples/non-use-case/layout-rich",
      ExampleNonUseCaseHook: "examples/non-use-case/use-pretext-layout",
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
              component={ExampleNonUseCaseIndexScreen}
              name="ExampleNonUseCaseIndex"
              options={{ title: "examples/non-use-case" }}
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
              component={ExampleNonUseCasePrepareScreen}
              name="ExampleNonUseCasePrepare"
              options={{ title: "examples/non-use-case/prepare" }}
            />
            <Stack.Screen
              component={ExampleNonUseCaseLayoutMetricsScreen}
              name="ExampleNonUseCaseLayoutMetrics"
              options={{ title: "examples/non-use-case/layout-metrics" }}
            />
            <Stack.Screen
              component={ExampleNonUseCaseLayoutOptionsScreen}
              name="ExampleNonUseCaseLayoutOptions"
              options={{ title: "examples/non-use-case/layout-options" }}
            />
            <Stack.Screen
              component={ExampleNonUseCaseLayoutLinesScreen}
              name="ExampleNonUseCaseLayoutLines"
              options={{ title: "examples/non-use-case/layout-lines" }}
            />
            <Stack.Screen
              component={ExampleNonUseCaseDiagnosticsScreen}
              name="ExampleNonUseCaseDiagnostics"
              options={{ title: "examples/non-use-case/layout-diagnostics" }}
            />
            <Stack.Screen
              component={ExampleNonUseCaseLayoutRichScreen}
              name="ExampleNonUseCaseLayoutRich"
              options={{ title: "examples/non-use-case/layout-rich" }}
            />
            <Stack.Screen
              component={ExampleNonUseCaseHookScreen}
              name="ExampleNonUseCaseHook"
              options={{ title: "examples/non-use-case/use-pretext-layout" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </BenchmarkResultsProvider>
    </SafeAreaProvider>
  );
}
