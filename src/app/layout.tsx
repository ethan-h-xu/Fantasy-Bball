import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sleeper Lock-In League Viewer",
  description: "Find and explore your Sleeper NBA Lock-In leagues.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>
            <Link href="/">Sleeper Lock-In League Viewer</Link>
          </h1>
          {children}
        </main>
      </body>
    </html>
  );
}
