"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

interface Tab {
  label: string;
  href: string;
  /** Another path that belongs to this tab. */
  alsoActiveOn?: string;
  icon: React.ReactNode;
}

// Drawn on a 24px grid with coordinates on half pixels, so 1px lines stay crisp.
const TABS: Tab[] = [
  {
    label: "My Teams",
    href: "/my-teams",
    // A V-neck tank-top jersey.
    icon: <path d="M8.5 3.5v3l3.5 3 3.5-3v-3h3v17h-13v-17zM12 13.5v4" />,
  },
  {
    label: "League History",
    href: "/leagues",
    alsoActiveOn: "/league",
    // A championship banner, as hung from the rafters.
    icon: <path d="M6.5 3.5h11v17l-5.5-4-5.5 4zM9.5 7.5h5M9.5 10.5h5" />,
  },
  {
    label: "Rankings",
    href: "/rankings",
    // A three-step podium.
    icon: <path d="M3.5 20.5v-7h5.5v-6h6v9h5.5v4zM9 20.5v-7M15 20.5v-4" />,
  },
  {
    label: "Calculate",
    href: "/calculate",
    // The four math operators in a grid.
    icon: (
      <path d="M3.5 3.5h17v17h-17zM12 3.5v17M3.5 12h17M7.75 5.75v4M5.75 7.75h4M14.25 7.75h4M6.25 14.75l3 3M9.25 14.75l-3 3M14.25 15h4M14.25 17.5h4" />
    ),
  },
  {
    label: "Waiver",
    href: "/waiver",
    // A signed form.
    icon: <path d="M5.5 3.5h9l4 4v13h-13zM14.5 3.5v4h4M8.5 11.5h7M8.5 14.5h7M8.5 18l1.75-1.5 1.75 1.5 1.75-1.5 1.75 1.5" />,
  },
  {
    label: "Account",
    href: "/account",
    // An ID card.
    icon: <path d="M3.5 5.5h17v13h-17zM6.5 8.5h4v4h-4zM13.5 9.5h4M13.5 12.5h4M6.5 15.5h11" />,
  },
];

function isOn(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function TabList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="tabs">
      {TABS.map((tab) => {
        const active =
          pathname !== null && (isOn(pathname, tab.href) || (tab.alsoActiveOn && isOn(pathname, tab.alsoActiveOn)));
        return (
          <li key={tab.href}>
            <Link href={tab.href} className={active ? "tab active" : "tab"} aria-current={active ? "page" : undefined}>
              <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
                {tab.icon}
              </svg>
              {tab.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TabListWithActive() {
  return <TabList pathname={usePathname()} />;
}

export function SidebarNav() {
  return (
    <nav aria-label="Main">
      {/* usePathname suspends while prerendering /league/[leagueId], whose ID isn't known yet. */}
      <Suspense fallback={<TabList pathname={null} />}>
        <TabListWithActive />
      </Suspense>
    </nav>
  );
}
