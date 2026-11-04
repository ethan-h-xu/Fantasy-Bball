import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/Logo";
import { SidebarNav } from "@/components/SidebarNav";

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/leagues" className="sidebar-logo" aria-label="League History">
          <Logo />
        </Link>
        <SidebarNav />
      </aside>
      <div className="shell-body">
        <Suspense fallback={null}>
          <AccountMenu />
        </Suspense>
        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}
