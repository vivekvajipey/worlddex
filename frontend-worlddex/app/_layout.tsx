import { Stack } from "expo-router";
import { View, Image } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function SplashScreenComponent() {
  return (
    <View className="w-full h-full">
      <Image
        source={require("../assets/images/splash.png")}
        className="w-full h-full absolute"
        resizeMode="cover"
      />
    </View>
  );
}

function AppLayoutContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreenComponent />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="(screens)/camera"
        options={{
          animation: "none",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="(screens)/sign-in"
        options={{
          animation: "none",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="(screens)/social"
        options={{
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="(modals)/terms-modal"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="(modals)/privacy-modal"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "LexendDeca-Thin": require("../assets/fonts/LexendDeca-Thin.ttf"),
    "LexendDeca-ExtraLight": require("../assets/fonts/LexendDeca-ExtraLight.ttf"),
    "LexendDeca-Light": require("../assets/fonts/LexendDeca-Light.ttf"),
    "LexendDeca-Regular": require("../assets/fonts/LexendDeca-Regular.ttf"),
    "LexendDeca-Medium": require("../assets/fonts/LexendDeca-Medium.ttf"),
    "LexendDeca-SemiBold": require("../assets/fonts/LexendDeca-SemiBold.ttf"),
    "LexendDeca-Bold": require("../assets/fonts/LexendDeca-Bold.ttf"),
    "LexendDeca-ExtraBold": require("../assets/fonts/LexendDeca-ExtraBold.ttf"),
    "LexendDeca-Black": require("../assets/fonts/LexendDeca-Black.ttf"),
    "ShadowsIntoLight": require("../assets/fonts/ShadowsIntoLight.ttf"),
  })

  useEffect(() => {
    if (fontsLoaded) {
      // Hide splash screen once fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return <SplashScreenComponent />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppLayoutContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}