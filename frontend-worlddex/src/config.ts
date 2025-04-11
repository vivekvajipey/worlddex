import Constants from "expo-constants";

// Declare the __DEV__ global variable that Expo provides
declare const __DEV__: boolean;

// Get the IP address based on the Expo manifest
const getLocalHostAddress = (): string | undefined => {
  const expoHost = Constants.expoConfig?.hostUri;
  const hostIp = expoHost?.split(":")[0];
  return hostIp;
};

export const API_URL = __DEV__
  ? `${getLocalHostAddress()}:3000/api`
  : "https://your-api-url.com/api"; // TODO: Update with real URL

// Helper to check if we're running in Expo Go
export const isExpoGo = Constants.appOwnership === "expo";