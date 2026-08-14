import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zansphere HR Portal",
  description: "Internal HR management portal for Zansphere Private Limited — Candidate & Employee Management",
  keywords: ["HR", "portal", "recruitment", "employee management", "Zansphere"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-[family-name:var(--font-inter)] antialiased">
        {children}
      </body>
    </html>
  );
}
