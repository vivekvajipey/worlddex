import Constants from "expo-constants";

// Declare the __DEV__ global variable that Expo provides
declare const __DEV__: boolean;

// export const API_URL = "https://backend-worlddex.fly.dev/api";
// export const API_URL = "http://192.168.4.38:3000/api"; // 1 Brady St.
// export const API_URL = "https://10.35.9.132:3000/api";
// export const API_URL = "http://10.32.122.153:3000/api";
// export const API_URL = "http://10.0.0.195:3000/api";
export const API_URL = "http://10.80.82.111:3000/api"; // True SF Office
// export const API_URL = "http://192.168.0.75:3000/api"; // Shan's apartment

// // In development, use localhost
// export const API_URL = __DEV__
//   ? "http://10.35.7.53:3000/api" // Vivek's home
// //   ? "http://10.0.0.195:3000/api" // Vivek's home
// //   ? "http://10.31.147.38:3000/api" // Stanford
//   : "https://backend-worlddex.fly.dev/api"; // Production URL

// Helper to check if we're running in Expo Go
export const isExpoGo = Constants.appOwnership === "expo";