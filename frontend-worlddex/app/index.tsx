import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import CameraScreen from './(screens)/camera';
import Profile from './components/Profile';
import { useAuth } from '../src/contexts/AuthContext';

export default function App() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    // If not loading and there's no session, redirect to sign-in
    if (!isLoading && !session) {
      router.replace("(screens)/sign-in" as any);
    }
  }, [session, isLoading, router]);

  // While checking auth status, show nothing
  if (isLoading) {
    return <View className="flex-1 bg-background" />;
  }

  // If no session, the useEffect will redirect
  if (!session) {
    return <View className="flex-1 bg-background" />;
  }

  // User is logged in, show main screen with profile button
  return (
    <View className="flex-1">
      <CameraScreen />
      <Profile />
    </View>
  );
}