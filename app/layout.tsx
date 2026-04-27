import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { AssistantChatFab } from "@/components/assistant-chat-fab";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Памятка водолаза",
  description: "Одностраничное приложение водолазно-спасательной службы",
  applicationName: "Памятка водолаза",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1220",
};

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "manifest-src 'self'",
  "connect-src 'self' https: wss: http://127.0.0.1:8787 http://localhost:8787",
].join("; ");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {children}
        <Suspense fallback={null}>
          <AssistantChatFab />
        </Suspense>
      </body>
    </html>
  );
}
