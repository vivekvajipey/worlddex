import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, Link, usePathname } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { GoogleIcon } from "../../assets/images/GoogleIcon";
import { usePostHog } from "posthog-react-native";

export default function SignInScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    // Track screen view when route becomes active
    if (posthog && pathname === "/(screens)/sign-in") {
      posthog.screen("Sign-in");
    }
  }, [pathname, posthog]);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await signInWithGoogle();
      router.replace("/");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Google sign in error:", error.message, error.stack);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true);
      await signInWithApple();
      router.replace("/");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Apple sign in error:", error.message, error.stack);
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background justify-center items-center px-6">
      <View className="mb-10 items-center">
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: 128, height: 128, marginBottom: 4 }}
          contentFit="contain"
        />
        <Text className="text-3xl font-['LexendDeca-Black'] text-text-primary mb-2">
          WorldDex
        </Text>
        <Text className="text-text-secondary text-center font-['LexendDeca-Regular']">
          Sign in to capture and collect your world
        </Text>
      </View>

      <TouchableOpacity
        className="bg-white w-full rounded-full py-4 px-6 flex-row items-center justify-center mb-4 border border-gray-200"
        onPress={handleGoogleSignIn}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <ActivityIndicator size="small" color="#F97316" />
        ) : (
          <>
            <View className="mr-3">
              <GoogleIcon size={20} />
            </View>
            <Text className="font-['LexendDeca-Medium'] text-text-primary">
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-black w-full rounded-full py-4 px-6 flex-row items-center justify-center mb-6"
        onPress={handleAppleSignIn}
        disabled={isAppleLoading}
      >
        {isAppleLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text className="font-['LexendDeca-Medium'] text-white">
              Continue with Apple
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text className="text-text-secondary text-center font-['LexendDeca-Regular'] text-sm px-6 mt-2">
        By signing in you agree to our{" "}
        <Link href="/(modals)/terms-modal" asChild>
          <Text className="text-primary font-['LexendDeca-Medium']">
            Terms
          </Text>
        </Link>{" "}
        and acknowledge that you have read our{" "}
        <Link href="/(modals)/privacy-modal" asChild>
          <Text className="text-primary font-['LexendDeca-Medium']">
            Privacy Policy
          </Text>
        </Link>
      </Text>
    </View>
  );
} 