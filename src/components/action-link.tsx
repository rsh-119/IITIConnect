import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = { href: string; children: ReactNode };

export function ActionLink({ href, children }: ActionLinkProps) {
  return (
    <Link
      className="bg-accent inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-white no-underline"
      href={href}
    >
      {children}
    </Link>
  );
}
