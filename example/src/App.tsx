import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AppStackParamList } from "./benchmark/types";
import { BenchmarkResultsProvider } from "./context/BenchmarkResultsContext";
import { HomeScreen } from "./screens/HomeScreen";
import { BaseTextBenchmarkScreen } from "./screens/benchmark/BaseTextBenchmarkScreen";
import { BenchmarkIndexScreen } from "./screens/benchmark/BenchmarkIndexScreen";
import { PreparedParagraphViewBenchmarkScreen } from "./screens/benchmark/PreparedParagraphViewBenchmarkScreen";
import { ExampleIndexScreen } from "./screens/examples/ExampleIndexScreen";
import { InlineSegmentsExampleScreen } from "./screens/examples/InlineSegmentsExampleScreen";
import { LineCursorExampleScreen } from "./screens/examples/LineCursorExampleScreen";
import { PreparedLinesExampleScreen } from "./screens/examples/PreparedLinesExampleScreen";
import { PreparedTextExampleScreen } from "./screens/examples/PreparedTextExampleScreen";
import { PreparedViewExampleScreen } from "./screens/examples/PreparedViewExampleScreen";

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
      BenchmarkPreparedView: "benchmark/prepared-view",
      ExampleIndex: "examples",
      ExamplePreparedView: "examples/prepared-view",
      ExamplePreparedLines: "examples/prepared-lines",
      ExamplePreparedText: "examples/prepared-text",
      ExampleInlineSegments: "examples/inline-segments",
      ExampleLineCursor: "examples/line-cursor",
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
              options={{ title: "Prepared Paragraph Lab" }}
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
              component={PreparedParagraphViewBenchmarkScreen}
              name="BenchmarkPreparedView"
              options={{ title: "benchmark/prepared-view" }}
            />
            <Stack.Screen
              component={ExampleIndexScreen}
              name="ExampleIndex"
              options={{ title: "examples/*" }}
            />
            <Stack.Screen
              component={PreparedViewExampleScreen}
              name="ExamplePreparedView"
              options={{ title: "examples/prepared-view" }}
            />
            <Stack.Screen
              component={PreparedLinesExampleScreen}
              name="ExamplePreparedLines"
              options={{ title: "examples/prepared-lines" }}
            />
            <Stack.Screen
              component={PreparedTextExampleScreen}
              name="ExamplePreparedText"
              options={{ title: "examples/prepared-text" }}
            />
            <Stack.Screen
              component={InlineSegmentsExampleScreen}
              name="ExampleInlineSegments"
              options={{ title: "examples/inline-segments" }}
            />
            <Stack.Screen
              component={LineCursorExampleScreen}
              name="ExampleLineCursor"
              options={{ title: "examples/line-cursor" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </BenchmarkResultsProvider>
    </SafeAreaProvider>
  );
}
