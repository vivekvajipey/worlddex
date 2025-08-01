import 'react-native-get-random-values';
import React, { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import CameraScreen from './(screens)/camera';
import Profile from './components/profile/Profile';
import FeedbackForm from './components/profile/FeedbackForm';
import { useAuth } from '../src/contexts/AuthContext';
import { useAccountRecovery } from '../src/hooks/useAccountRecovery';

// This is the home route component at "/"
export default function HomeScreen() {
  const { session, isLoading: authLoading } = useAuth();
  const posthog = usePostHog();
  const pathname = usePathname();
  const router = useRouter();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [capturesButtonClicked, setCapturesButtonClicked] = useState(false);

  // Check for account recovery on sign in
  useAccountRecovery();

  // Handler for when the captures button is clicked
  const handleCapturesButtonClick = useCallback(() => {
    setCapturesButtonClicked(true);
    router.push('/personal-captures');
  }, [router]);

  // Effect to track the home screen view
  useEffect(() => {
    if (posthog && !authLoading && pathname === "/") {
      posthog.screen("Home");
    }
  }, [posthog, authLoading, pathname]);

  // If auth is loading, show nothing
  // (the splash screen is handled by _layout.tsx)
  if (authLoading) {
    return null;
  }

  // If not authenticated, redirect to sign-in
  if (!session) {
    return <Redirect href="/(screens)/sign-in" />;
  }

  // For authenticated users, show the home screen content
  return (
    <View className="flex-1">
      <CameraScreen 
        capturesButtonClicked={capturesButtonClicked} 
      />
      <Profile onOpenFeedback={() => setFeedbackVisible(true)} />
      <FeedbackForm
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />

      {/* Social button (bottom left) */}
      <View className="absolute bottom-8 left-8 items-center">
        <View className="bg-black/50 px-3 py-1 rounded-full mb-1">
          <Text className="text-sm text-white font-lexend-medium">Social</Text>
        </View>
        <TouchableOpacity
          className="w-20 h-20 rounded-full bg-background justify-center items-center shadow-lg overflow-hidden"
          onPress={() => router.push('/(screens)/social')}
        >
          <Image
            source={require('../assets/images/Social Icon.png')}
            style={{ width: 80, height: 80 }}
            contentFit="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Center app logo button */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <View className="bg-black/50 px-3 py-1 rounded-full mb-1">
          <Text className="text-sm text-white font-lexend-medium">WorldDex</Text>
        </View>
        <TouchableOpacity
          className="w-20 h-20 rounded-full bg-primary justify-center items-center shadow-lg overflow-hidden"
          onPress={handleCapturesButtonClick}
        >
          <Image
            source={require('../assets/images/icon.png')}
            style={{ width: 80, height: 80 }}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>


    </View>
  );
}