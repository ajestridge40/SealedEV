import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { InstallHint } from "@/components/install-hint";
import { ServiceWorker } from "@/components/service-worker";

export const metadata: Metadata = {
  title: { default: "SealedEV — sealed TCG value finder", template: "%s · SealedEV" },
  description: "Expected value of opening sealed trading card products vs. their market price.",
  applicationName: "SealedEV",
  // iOS home-screen app: full screen, own icon and title.
  appleWebApp: { capable: true, title: "SealedEV", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Next emits the generic "mobile-web-app-capable"; older iOS versions only read the Apple tag.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the layout use the full screen; safe-area padding keeps content clear of the notch/home bar.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <ThemeProvider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
            {children}
          </main>
          <InstallHint />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
