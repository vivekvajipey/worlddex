import React, { useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { usePostHog } from "posthog-react-native";

export default function TermsModal() {
  const router = useRouter();
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    // Track screen view when route becomes active, not on component mount
    if (posthog && pathname === "/(modals)/terms-modal") {
      posthog.screen("Terms-Modal");
    }
  }, [pathname, posthog]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1">
        <View className="w-16 h-1 bg-gray-300 rounded-full self-center my-4" />

        <View className="px-6 flex-1">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-['LexendDeca-Bold'] text-text-primary">Terms of Service</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-['LexendDeca-Medium']">Close</Text>
            </TouchableOpacity>
          </View>

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
            <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">5. Limitation of Liability</Text>
            <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
            </Text>
            <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">6. Changes to Terms</Text>
            <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4">
              We may revise these Terms at any time by updating this page. By continuing to access or use our services after those revisions become effective, you agree to be bound by the revised Terms.
            </Text>
            <Text className="font-['LexendDeca-Medium'] text-text-primary mb-2">7. Governing Law</Text>
            <Text className="font-['LexendDeca-Regular'] text-text-secondary mb-4 mb-8">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate, without regard to its conflict of law provisions.
            </Text>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
} 