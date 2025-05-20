import 'react-native-get-random-values';
import React, { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, usePathname } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import CameraScreen from './(screens)/camera';
import Profile from './components/profile/Profile';
import FeedbackForm from './components/profile/FeedbackForm';
import { useAuth } from '../src/contexts/AuthContext';
import CapturesModal from './(screens)/personal-captures';
import SocialModal from './(screens)/social';
import { checkServerStatus } from '../src/services/apiService';

// This is the home route component at "/"
export default function HomeScreen() {
  const { session, isLoading: authLoading } = useAuth();
  const posthog = usePostHog();
  const pathname = usePathname();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [capturesModalVisible, setCapturesModalVisible] = useState(false);
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [capturesButtonClicked, setCapturesButtonClicked] = useState(false);

  // Server connection state
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isCheckingServer, setIsCheckingServer] = useState(true);

  // Handler for when the captures button is clicked
  const handleCapturesButtonClick = useCallback(() => {
    setCapturesButtonClicked(true);
    setCapturesModalVisible(true);
  }, []);

  // Function to manually retry the connection
  const handleRetryConnection = useCallback(async () => {
    if (session && !authLoading) {
      setIsCheckingServer(true);
      const status = await checkServerStatus();
      setIsServerConnected(status);
      setIsCheckingServer(false);
    }
  }, [session, authLoading]);

  // Effect to check server status on mount or when session changes
  useEffect(() => {
    const performHealthCheck = async () => {
      if (session && !authLoading) {
        setIsCheckingServer(true);
        const status = await checkServerStatus();
        setIsServerConnected(status);
        setIsCheckingServer(false);
      }
    };

    performHealthCheck();

    // Optional: Set up an interval to periodically check server status
    const intervalId = setInterval(performHealthCheck, 60000); // Check every minute
    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [session, authLoading]);

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
        isServerConnected={isServerConnected}
        isCheckingServer={isCheckingServer}
        onRetryConnection={handleRetryConnection}
      />
      <Profile onOpenFeedback={() => setFeedbackVisible(true)} />
      <FeedbackForm
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />

      {/* Social button (bottom left) */}
      <View className="absolute bottom-8 left-8 items-center">
        <TouchableOpacity
          className="w-16 h-16 rounded-full bg-background justify-center items-center shadow-lg overflow-hidden"
          onPress={() => setSocialModalVisible(true)}
        >
          <Image
            source={require('../assets/images/Social Icon.png')}
            style={{ width: 64, height: 64 }}
            contentFit="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Center app logo button */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <TouchableOpacity
          className="w-16 h-16 rounded-full bg-primary justify-center items-center shadow-lg overflow-hidden"
          onPress={handleCapturesButtonClick}
        >
          <Image
            source={require('../assets/images/icon.png')}
            style={{ width: 64, height: 64 }}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>

      {/* Captures Modal */}
      <CapturesModal
        visible={capturesModalVisible}
        onClose={() => setCapturesModalVisible(false)}
      />

      {/* Social Modal */}
      <SocialModal
        visible={socialModalVisible}
        onClose={() => setSocialModalVisible(false)}
      />
    </View>
  );
}