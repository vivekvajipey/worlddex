import Constants from "expo-constants";

// Declare the __DEV__ global variable that Expo provides
declare const __DEV__: boolean;

/**
 * Use a hardcoded development server IP address
 * This works better than trying to auto-detect, which often falls back to localhost
 */
const getDevelopmentServerIp = (): string => {
  // Return your computer's actual local network IP address
  return "10.0.0.195";
};

// Server configurations
const DEV_SERVER = {
  ip: getDevelopmentServerIp(),
  port: 3000,
  apiPath: "api"
};

const PROD_SERVER = {
  url: "https://your-api-url.com/api" // TODO: Update for production
};

// Build API URL with automatic IP detection
export const API_URL = __DEV__
  ? `http://${DEV_SERVER.ip}:${DEV_SERVER.port}/${DEV_SERVER.apiPath}`
  : PROD_SERVER.url;

// Helper to check if we're running in Expo Go
export const isExpoGo = Constants.appOwnership === "expo";