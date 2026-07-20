import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { getSiteUrl } from "@/lib/env";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Askbase — Turn Your Docs Into an AI Chatbot",
    template: "%s · Askbase",
  },
  description:
    "Upload your company docs and get a RAG-powered AI chatbot in minutes. Chat inside the app or embed a widget on your website. No code required.",
  openGraph: {
    type: "website",
    siteName: "Askbase",
    title: "Askbase — Turn Your Docs Into an AI Chatbot",
    description:
      "Upload your company docs and get a RAG-powered AI chatbot in minutes. Embed it anywhere.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Askbase — Turn Your Docs Into an AI Chatbot",
    description:
      "Upload your company docs and get a RAG-powered AI chatbot in minutes. Embed it anywhere.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen">
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}
