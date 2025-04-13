import { Stack } from "expo-router";
import { View } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  console.log("Loading fonts...");
  
  // Revert to original font configuration to get app working
  const [fontsLoaded] = useFonts({
    "LexendDeca-Regular": require("../assets/fonts/LexendDeca-Regular.ttf"),
    "LexendDeca-Bold": require("../assets/fonts/LexendDeca-Bold.ttf"),
    "LexendDeca-Light": require("../assets/fonts/LexendDeca-Light.ttf"),
    "LexendDeca-Medium": require("../assets/fonts/LexendDeca-Medium.ttf"),
    "LexendDeca-SemiBold": require("../assets/fonts/LexendDeca-SemiBold.ttf"),
    // Temporarily comment out to debug
    // "PatrickHand": require("../assets/fonts/PatrickHand-Regular.ttf"),
  });

  useEffect(() => {
    console.log("Fonts loaded state:", fontsLoaded);
    if (fontsLoaded) {
      // Hide splash screen once fonts are loaded
      console.log("Hiding splash screen");
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />
        <Stack.Screen
          name="(screens)/camera"
          options={{
            animation: "none",
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}