import Constants from "expo-constants";

let devLocalIp: string;
const devConfig = require("./dev.local.config");
devLocalIp = devConfig.DEV_LOCAL_IP;
if (!devLocalIp) {
  throw new Error("DEV_LOCAL_IP not found in dev.local.config.ts");
}

// Declare the __DEV__ global variable that Expo provides
declare const __DEV__: boolean;

const getDevelopmentServerIp = (): string => {
  return devLocalIp;
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

export const API_URL = __DEV__
  ? `http://${DEV_SERVER.ip}:${DEV_SERVER.port}/${DEV_SERVER.apiPath}`
  : PROD_SERVER.url;

// Helper to check if we're running in Expo Go
export const isExpoGo = Constants.appOwnership === "expo";