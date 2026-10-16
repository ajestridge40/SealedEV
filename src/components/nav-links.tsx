"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Briefcase, Calculator, Eye, Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Value Finder", short: "Finder", icon: Search },
  { href: "/watchlist", label: "Watchlist", short: "Watching", icon: Eye },
  { href: "/collection", label: "My Collection", short: "Owned", icon: Briefcase },
  { href: "/notifications", label: "Alerts", short: "Alerts", icon: Bell },
  { href: "/methodology", label: "How EV works", short: "EV math", icon: Calculator },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/products") : pathname.startsWith(href);
}

export function DesktopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin", short: "Admin", icon: Shield }] : LINKS;
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
            isActive(pathname, l.href) && "bg-accent text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar on phones. */
export function MobileNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
                isActive(pathname, l.href) && "text-foreground",
              )}
            >
              <l.icon className="size-5" />
              {l.short}
              {l.href === "/notifications" && unread > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-4 rounded-full bg-bad px-1.5 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
