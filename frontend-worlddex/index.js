// Debugging entry point for WorldDex app
import React from "react";
import { Text, View } from "react-native";
import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

// Debug logs for initialization
console.log("======= DEBUG: WorldDex Initialization Starting =======");
console.log("Current directory structure being loaded:", __dirname);

try {
  // Try to access app directory content
  console.log("Attempting to load app directory context...");
  const ctx = require.context("./app");
  console.log("App directory context loaded successfully!");
  console.log("Available routes:", Object.keys(ctx).length > 0 ? Object.keys(ctx) : "No routes found");
  
  // Export app component for Fast Refresh
  export function App() {
    console.log("App component rendering...");
    return <ExpoRoot context={ctx} />;
  }
} catch (error) {
  console.error("ERROR LOADING APP DIRECTORY:", error.message);
  
  // Fallback app to show error information
  export function App() {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: "center" }}>
          Debug Info: Error loading WorldDex app
        </Text>
        <Text style={{ color: "red", marginBottom: 10 }}>{error.message}</Text>
        <Text style={{ fontSize: 14, opacity: 0.7, textAlign: "center" }}>
          Check console logs for more details
        </Text>
      </View>
    );
  }
}

// Register the app component
console.log("Registering root component...");
registerRootComponent(App);