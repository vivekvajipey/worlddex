import Constants from 'expo-constants';

// Declare the __DEV__ global variable that Expo provides
declare const __DEV__: boolean;

// In development, use localhost
export const API_URL = __DEV__ 
  // ? 'http://10.0.0.195:3000/api'
  ? 'http://10.34.107.2:3000/api' // Stanford
  : 'https://your-api-url.com/api'; // TODO: Update with real URL

// Helper to check if we're running in Expo Go
export const isExpoGo = Constants.appOwnership === 'expo'; 