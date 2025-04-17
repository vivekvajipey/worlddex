import 'react-native-get-random-values';
import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import CameraScreen from './(screens)/camera';
import Profile from './components/Profile';
import { useAuth } from '../src/contexts/AuthContext';

// This is the home route component at "/"
export default function HomeScreen() {
  const { session, isLoading } = useAuth();

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
      <Profile />
    </View>
  );
}