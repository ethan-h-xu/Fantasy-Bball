import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/AccountMenu";
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
            {/* The proxy redirects "/" when signed in, so there's nothing useful to prefetch. */}
            <Link href="/" prefetch={false}>
              Sleeper Lock-In League Viewer
            </Link>
          </h1>
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
          {children}
        </main>
      </body>
    </html>
  );
}
