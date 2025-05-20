import React, { useEffect } from "react";
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { usePostHog } from "posthog-react-native";

export default function PrivacyModal() {
  const router = useRouter();
  const pathname = usePathname();
  const posthog = usePostHog();
  
  useEffect(() => {
    // Track screen view when route becomes active, not on component mount
    if (posthog && pathname === "/(modals)/privacy-modal") {
      posthog.screen("Privacy-Modal");
    }
  }, [pathname, posthog]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1">
        <View className="w-16 h-1 bg-gray-300 rounded-full self-center my-4" />

        <View className="px-6 flex-1">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-['LexendDeca-Bold'] text-text-primary">Privacy Policy</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-['LexendDeca-Medium']">Close</Text>
            </TouchableOpacity>
          </View>

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
            <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">5. Data Security</Text>
            <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </Text>
            <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">6. Children's Privacy</Text>
            <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
              Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it.
            </Text>
            <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">7. Changes to This Policy</Text>
            <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </Text>
            <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">8. Contact Us</Text>
            <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4 mb-8">
              If you have questions about this Privacy Policy, please contact us at support@worlddex.com.
            </Text>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
} 