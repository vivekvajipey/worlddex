import Constants from 'expo-constants';

// Declare the __DEV__ global variable that Expo provides
declare const __DEV__: boolean;

// In development, use localhost
export const API_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://your-api-url.com/api'; // TODO: Update with real URL

// Helper to check if we're running in Expo Go
export const isExpoGo = Constants.appOwnership === 'expo'; 