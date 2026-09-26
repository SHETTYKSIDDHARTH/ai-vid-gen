import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import { ClerkProvider} from '@clerk/nextjs'
import "./globals.css";
import Provider from "./provider";
import Header from "./_components/Header";
import VoiceAssistant from "./_components/VoiceAssistant";
import { Toaster } from "@/components/ui/toast";

const inter = Inter({
  variable: "--font-body-family",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-heading-family",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Video Course Generator",
  description: "Turn any topic into a structured AI-generated course",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
    <html
      lang="en"
      className={`dark ${inter.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <Provider>
          {children}
        </Provider>
        <VoiceAssistant />
        <Toaster />
      </body>
    </html>
    </ClerkProvider>
  );
}
