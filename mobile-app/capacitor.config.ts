import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "id.lecarassa.hadirku",
  appName: "Hadirku Lecarassa",
  webDir: "dist",
  backgroundColor: "#f7f7f2",
  // Release builds must always use HTTPS. Local API testing should use the
  // deployed HTTPS URL or a tunnel, never cleartext traffic.
  server: {
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#f7f7f2",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f7f7f2",
    },
  },
};

export default config;
