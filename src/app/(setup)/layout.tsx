import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/Logo";

// Sign-in and onboarding: a single column with no sidebar, since the tabs need a finished account.
export default function SetupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="setup-main">
      <h1 className="setup-title">
        <Logo />
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
  );
}
