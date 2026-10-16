import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS shell (optional — the PWA needs none of this).
 * The app is server-rendered, so the shell loads your deployed site:
 *   CAP_SERVER_URL=https://your-domain npx cap sync ios
 * mobile/www is only the fallback page shown if no URL is configured.
 */
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID ?? "com.sealedev.app",
  appName: "SealedEV",
  webDir: "mobile/www",
  server: serverUrl ? { url: serverUrl, cleartext: false } : undefined,
  ios: {
    contentInset: "never", // the web app pads itself with safe-area insets
    backgroundColor: "#0a0a0a",
  },
};

export default config;
