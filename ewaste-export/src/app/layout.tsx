import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Waste Submission Portal",
  description:
    "A private owner dashboard and a public, read-only submission portal for E-Waste coursework, assignments and academic submissions.",
  keywords: [
    "E-Waste",
    "Submission Portal",
    "Academic",
    "Coursework",
    "Assignments",
  ],
  authors: [{ name: "E-Waste Submission Portal" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "E-Waste Submission Portal",
    description: "My E-Waste coursework, assignments and academic submissions.",
    siteName: "E-Waste Submission Portal",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "E-Waste Submission Portal",
    description: "My E-Waste coursework, assignments and academic submissions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F7FAF5] text-[#303832]`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
