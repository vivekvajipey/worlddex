import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { GoogleIcon } from "../../assets/images/GoogleIcon";

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

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
          className="w-32 h-32 mb-4"
          resizeMode="contain"
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

      <View className="flex-row flex-wrap justify-center items-center px-6 mt-2">
        <Text className="text-text-secondary text-center font-['LexendDeca-Regular'] text-sm">
          By signing in you agree to our{' '}
        </Text>
        <TouchableOpacity onPress={() => setShowTerms(true)} className="px-1">
          <Text className="text-primary font-['LexendDeca-Medium'] text-sm">
            Terms
          </Text>
        </TouchableOpacity>
        <Text className="text-text-secondary text-center font-['LexendDeca-Regular'] text-sm">
          {' '}and acknowledge that you have read our{' '}
        </Text>
        <TouchableOpacity onPress={() => setShowPrivacyPolicy(true)} className="px-1">
          <Text className="text-primary font-['LexendDeca-Medium'] text-sm">
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Terms Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTerms}
        onRequestClose={() => setShowTerms(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-surface rounded-t-3xl h-4/5">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center my-4" />
            <View className="px-6 flex-1">
              <Text className="text-2xl font-['LexendDeca-Bold'] text-text-primary mb-4">Terms of Service</Text>
              <ScrollView className="flex-1">
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  Last updated: {new Date().toLocaleDateString()}
                </Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  Welcome to WorldDex! These Terms of Service govern your use of our application and services. By accessing or using WorldDex, you agree to be bound by these Terms.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">1. User Accounts</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  When you create an account with us, you must provide accurate and complete information. You are responsible for the security of your account and for all activities that occur under your account.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">2. Content</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  Our service allows you to capture, store, and share content. You retain all rights to your content, but grant us a license to use it for providing and improving our services.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">3. Prohibited Activities</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  You agree not to use our services for any illegal purpose or in violation of any applicable laws, to post unauthorized commercial communications, or to engage in any activity that interferes with our services.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">4. Termination</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  We may terminate or suspend your account immediately, without prior notice, for conduct that we determine violates these Terms or is harmful to other users, us, or third parties.
                </Text>
              </ScrollView>
              <TouchableOpacity
                className="bg-primary w-full rounded-full py-4 my-4"
                onPress={() => setShowTerms(false)}
              >
                <Text className="font-['LexendDeca-Medium'] text-white text-center">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPrivacyPolicy}
        onRequestClose={() => setShowPrivacyPolicy(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-surface rounded-t-3xl h-4/5">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center my-4" />
            <View className="px-6 flex-1">
              <Text className="text-2xl font-['LexendDeca-Bold'] text-text-primary mb-4">Privacy Policy</Text>
              <ScrollView className="flex-1">
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  Last updated: {new Date().toLocaleDateString()}
                </Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  At WorldDex, we take your privacy seriously. This Privacy Policy explains how we collect, use, and share information about you when you use our app and services.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">1. Information We Collect</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  We collect information you provide directly, including account information, content you create, and communications. We also automatically collect certain information about your device and usage.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">2. How We Use Your Information</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  We use your information to provide, maintain, and improve our services, to communicate with you, and to personalize your experience.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">3. Information Sharing</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  We do not share your personal information with third parties except as described in this policy, with your consent, or as required by law.
                </Text>
                <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">4. Your Choices</Text>
                <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
                  You can access, update, or delete your account information at any time through the app settings. You may also opt out of certain communications.
                </Text>
              </ScrollView>
              <TouchableOpacity
                className="bg-primary w-full rounded-full py-4 my-4"
                onPress={() => setShowPrivacyPolicy(false)}
              >
                <Text className="font-['LexendDeca-Medium'] text-white text-center">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 