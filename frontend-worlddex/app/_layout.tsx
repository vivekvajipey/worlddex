import { Stack } from "expo-router";
import { View } from "react-native";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { PostHogProvider } from "posthog-react-native";
import { Slot } from "expo-router";     // expo-router's root
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationService } from "../src/services/NotificationService";
import { NotificationPermissionManager } from "./components/permissions/NotificationPermissionManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function SplashScreenComponent() {
  return (
    <View className="w-full h-full">
      <Image
        source={require("../assets/images/splash.png")}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        contentFit="cover"
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

      // Don't request notifications on app launch anymore
      // Will be requested after user engagement (3 captures or 2 days)
    }
  }, [fontsLoaded]);

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return <SplashScreenComponent />;
  }

  return (
    <PostHogProvider
      apiKey="phc_EyLCiDrJnGPqXma1f21WFwgAmRf35KANelGXVzmDDz4"
      autocapture={{                   // turn on automatic events
        captureLifecycleEvents: true,
        captureScreens: true,
        captureTouches: true,
      }}
      options={{
        host: "https://us.i.posthog.com",
        flushAt: 1,                    // lower thresholds while testing
        flushInterval: 3000,
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <Slot />
            <NotificationPermissionManager />
          </QueryClientProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}