import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Bud",
  description: "Plan a personalized trip by destination, dates, budget, and travel style.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
