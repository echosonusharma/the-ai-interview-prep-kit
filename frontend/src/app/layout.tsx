import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepPilot AI — AI Interview Prep Kit",
  description: "Practice interviews, get coaching, level up. Built with PrepPilot AI design system.",
  openGraph: {
    title: "PrepPilot AI — AI Interview Prep Kit",
    description: "The AI-powered career simulator for tech interviews.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-white text-[#0f172a] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
