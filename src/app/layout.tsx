import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sleeper Lock-In League Viewer",
  description: "Find and explore your Sleeper NBA Lock-In leagues.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
