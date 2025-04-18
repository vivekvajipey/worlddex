import 'react-native-get-random-values';
import React, { useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Redirect } from 'expo-router';
import CameraScreen from './(screens)/camera';
import Profile from './components/profile/Profile';
import FeedbackForm from './components/profile/FeedbackForm';
import { useAuth } from '../src/contexts/AuthContext';
import CapturesModal from './(screens)/personal-captures';

// This is the home route component at "/"
export default function HomeScreen() {
  const { session, isLoading } = useAuth();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [capturesModalVisible, setCapturesModalVisible] = useState(false);

  // If loading, show nothing 
  // (the splash screen is handled by _layout.tsx)
  if (isLoading) {
    return null;
  }

  // If not authenticated, redirect to sign-in
  if (!session) {
    return <Redirect href="/(screens)/sign-in" />;
  }

  // For authenticated users, show the home screen content
  return (
    <View className="flex-1">
      <CameraScreen />
      <Profile onOpenFeedback={() => setFeedbackVisible(true)} />
      <FeedbackForm
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />

      {/* Center app logo button */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <TouchableOpacity
          className="w-16 h-16 rounded-full bg-primary justify-center items-center shadow-lg overflow-hidden"
          onPress={() => setCapturesModalVisible(true)}
        >
          <Image
            source={require('../assets/images/icon.png')}
            className="w-16 h-16"
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      {/* Captures Modal */}
      <CapturesModal
        visible={capturesModalVisible}
        onClose={() => setCapturesModalVisible(false)}
      />
    </View>
  );
}