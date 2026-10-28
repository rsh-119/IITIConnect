"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { Wordmark } from "@/components/brand";

const links = [
  { href: "/community", label: "Trips" },
  { href: "/community/trips/new", label: "Post trip" },
  { href: "/community/activity", label: "Activity" },
  { href: "/community/messages", label: "Messages" },
];

const pill =
  "aria-[current=page]:bg-white aria-[current=page]:text-ink aria-[current=page]:shadow-sm text-muted inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-semibold whitespace-nowrap no-underline hover:bg-white/70 hover:text-ink";

export function CommunityNav() {
  const pathname = usePathname();
  const current = (href: string) =>
    href === "/community"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      <header className="relative left-1/2 flex w-[min(61rem,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-full bg-white/70 py-2 pr-2 pl-4 shadow-(--shadow-card) backdrop-blur">
        <Wordmark href="/community" />
        <nav aria-label="Community" className="hidden md:block">
          <ul className="flex gap-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current(href) ? "page" : undefined}
                  className={pill}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/community/notifications"
            aria-current={
              current("/community/notifications") ? "page" : undefined
            }
            className={pill}
          >
            Alerts
          </Link>
          <Link
            href="/community/settings"
            aria-current={current("/community/settings") ? "page" : undefined}
            className={pill}
          >
            Settings
          </Link>
          <form action={signOut} className="hidden sm:block">
            <button className="text-muted hover:text-ink min-h-10 rounded-full px-3.5 text-sm hover:bg-white/70">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <nav
        aria-label="Community tabs"
        className="fixed inset-x-3 bottom-3 z-20 rounded-full bg-white/90 p-1.5 shadow-(--shadow-float) backdrop-blur md:hidden"
      >
        <ul className="flex justify-between gap-1">
          {links.map(({ href, label }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current(href) ? "page" : undefined}
                className="aria-[current=page]:bg-ink text-muted flex min-h-11 items-center justify-center rounded-full px-2 text-sm font-bold whitespace-nowrap no-underline aria-[current=page]:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
