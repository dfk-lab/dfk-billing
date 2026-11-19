"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const menu = [
  { href: "/", label: "Dashboard" },
  { href: "/pelanggan", label: "Pelanggan" },
  { href: "/layanan", label: "Layanan" },
  { href: "/invoice", label: "Invoice" },
  { href: "/kwitansi", label: "Kwitansi" },
  { href: "/laporan", label: "Laporan" },
  { href: "/pengaturan", label: "Pengaturan" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [kataCari, setKataCari] = useState("");

  useEffect(() => {
    setTerbuka(false);
  }, [pathname]);

  async function keluar() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function cari(e: React.FormEvent) {
    e.preventDefault();
    const q = kataCari.trim();
    if (!q) return;
    router.push(`/cari?q=${encodeURIComponent(q)}`);
  }

  const isi = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <p className="text-lg font-semibold tracking-tight">DFK Billing</p>
        <p className="mt-0.5 text-xs text-zinc-500">Invoice &amp; Kwitansi</p>
      </div>
      <div className="px-3 pb-3">
        <form onSubmit={cari}>
          <input
            type="search"
            value={kataCari}
            onChange={(e) => setKataCari(e.target.value)}
            placeholder="Cari apa saja…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </form>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {menu.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setTerbuka(false)}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-zinc-200 p-3">
        <button
          onClick={keluar}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <button
          aria-label="Buka menu"
          onClick={() => setTerbuka(true)}
          className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span className="font-semibold tracking-tight">DFK Billing</span>
        <span className="w-9" />
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-zinc-200 bg-white lg:block">
        {isi}
      </aside>

      {terbuka && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setTerbuka(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            {isi}
          </aside>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:ml-56 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
