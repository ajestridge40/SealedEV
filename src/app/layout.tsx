import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: "SealedEV — sealed TCG value finder", template: "%s · SealedEV" },
  description: "Expected value of opening sealed trading card products vs. their market price.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
          <main className="mx-auto max-w-6xl px-4 pt-4 pb-24 md:pb-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
