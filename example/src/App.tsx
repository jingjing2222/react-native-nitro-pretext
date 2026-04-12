import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AppStackParamList } from "./benchmark/types";
import { BenchmarkResultsProvider } from "./context/BenchmarkResultsContext";
import { BaseTextBenchmarkScreen } from "./screens/BaseTextBenchmarkScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { PreparedParagraphViewBenchmarkScreen } from "./screens/PreparedParagraphViewBenchmarkScreen";

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

export default function App() {
  return (
    <SafeAreaProvider>
      <BenchmarkResultsProvider>
        <NavigationContainer theme={navigationTheme}>
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
              options={{ title: "Text Relayout Benchmark" }}
            />
            <Stack.Screen
              component={BaseTextBenchmarkScreen}
              name="BaseText"
              options={{ title: "BaseText Page" }}
            />
            <Stack.Screen
              component={PreparedParagraphViewBenchmarkScreen}
              name="PreparedView"
              options={{ title: "Prepared View Page" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </BenchmarkResultsProvider>
    </SafeAreaProvider>
  );
}
