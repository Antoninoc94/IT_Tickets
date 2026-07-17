"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string };

export function MobileNav({
  isStaff,
  isAdmin,
}: {
  isStaff: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const gestioneItems: NavItem[] = isStaff
    ? [
        { href: "/reports",                label: "Report" },
        { href: "/admin/tags",             label: "Etichette" },
        { href: "/admin/templates",        label: "Modelli" },
        { href: "/admin/categories",       label: "Categorie" },
        { href: "/admin/canned-responses", label: "Risposte rapide" },
      ]
    : [];

  const adminItems: NavItem[] = isAdmin
    ? [
        { href: "/admin/users",    label: "Utenti" },
        { href: "/admin/settings", label: "Impostazioni" },
      ]
    : [];

  return (
    <div className="relative sm:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Chiudi menu" : "Apri menu"}
        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        {open ? (
          <svg viewBox="0 0 16 16" width={18} height={18} fill="currentColor" aria-hidden>
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width={18} height={18} fill="currentColor" aria-hidden>
            <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          <MobileLink href="/dashboard" close={() => setOpen(false)}>Dashboard</MobileLink>
          <MobileLink href="/tickets/new" close={() => setOpen(false)}>Nuovo ticket</MobileLink>

          {gestioneItems.length > 0 && (
            <>
              <SectionLabel>Gestione</SectionLabel>
              {gestioneItems.map((item) => (
                <MobileLink key={item.href} href={item.href} close={() => setOpen(false)}>
                  {item.label}
                </MobileLink>
              ))}
            </>
          )}

          {adminItems.length > 0 && (
            <>
              <SectionLabel>Admin</SectionLabel>
              {adminItems.map((item) => (
                <MobileLink key={item.href} href={item.href} close={() => setOpen(false)}>
                  {item.label}
                </MobileLink>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MobileLink({
  href,
  close,
  children,
}: {
  href: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={close}
      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 border-t border-[var(--border)] px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
      {children}
    </div>
  );
}
