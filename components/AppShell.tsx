"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TemaToggle from "@/components/TemaToggle";
import LogoUsaha from "./LogoUsaha";

function Ikon({
  ukuran = 18,
  children,
}: {
  ukuran?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ikonKeluar = (
  <>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </>
);

const ikonCari = (
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>
);

const ikonLainnya = (
  <>
    <circle cx="12" cy="5" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="12" cy="19" r="1.4" />
  </>
);

const menu = [
  {
    href: "/",
    label: "Dashboard",
    ikon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    href: "/pelanggan",
    label: "Pelanggan",
    ikon: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </>
    ),
  },
  {
    href: "/layanan",
    label: "Layanan",
    ikon: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="11" />
      </>
    ),
  },
  {
    href: "/invoice",
    label: "Invoice",
    ikon: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  },
  {
    href: "/kwitansi",
    label: "Kwitansi",
    ikon: (
      <>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </>
    ),
  },
  {
    href: "/laporan",
    label: "Laporan",
    ikon: (
      <>
        <path d="M21.21 15.89A10 10 0 118 2.83" />
        <path d="M22 12A10 10 0 0012 2v10z" />
      </>
    ),
  },
  {
    href: "/wa",
    label: "Notifikasi WA",
    ikon: (
      <>
        <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 003.4 0" />
      </>
    ),
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    ikon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </>
    ),
  },
];

const isiBawah = ["/", "/pelanggan", "/invoice", "/kwitansi"];

export default function AppShell({
  children,
  role = "ADMIN",
  namaPengguna = null,
}: {
  children: React.ReactNode;
  role?: string;
  namaPengguna?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [lembar, setLembar] = useState(false);
  const [kataCari, setKataCari] = useState("");

  const menuTersedia =
    role === "PETUGAS"
      ? menu.filter(
          (m) =>
            m.href !== "/pengaturan" && m.href !== "/laporan" && m.href !== "/wa"
        )
      : menu;
  const menuBawah = menuTersedia.filter((m) => isiBawah.includes(m.href));
  const menuLembar = menuTersedia.filter((m) => !isiBawah.includes(m.href));

  useEffect(() => {
    setLembar(false);
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

  function aktif(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar kiri — layar sedang ke atas */}
      <aside className="sidebar no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col md:flex">
        <Link href="/" className="flex items-center gap-3.5 px-5 py-4">
          <LogoUsaha size={48} className="shrink-0" />
          <span>
            <span className="block text-base font-semibold tracking-tight text-slate-100">
              DFK Billing
            </span>
            <span className="block text-xs text-slate-500">
              Invoice &amp; Kwitansi
            </span>
          </span>
        </Link>
        {namaPengguna && (
          <p className="px-5 pb-2 text-xs text-slate-500">
            Masuk sebagai{" "}
            <span className="font-medium text-slate-300">{namaPengguna}</span>
          </p>
        )}

        <div className="px-4 pb-3">
          <form onSubmit={cari}>
            <input
              type="search"
              value={kataCari}
              onChange={(e) => setKataCari(e.target.value)}
              placeholder="Cari apa saja…"
              className="masukan w-full text-sm"
            />
          </form>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {menuTersedia.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-side ${aktif(item.href) ? "nav-side-aktif" : ""}`}
            >
              <Ikon>{item.ikon}</Ikon>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="space-y-1">
            <TemaToggle
              ukuran={18}
              className="nav-side w-full"
              denganLabel
            />
            <button
              onClick={keluar}
              className="nav-side w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Ikon>{ikonKeluar}</Ikon>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Bar atas — mobile */}
      <header className="navbar no-print sticky top-0 z-40 flex h-14 items-center gap-3 px-4 md:hidden">
        <Link href="/" className="flex items-center gap-3">
          <LogoUsaha size={40} className="shrink-0" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            DFK Billing
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <TemaToggle />
          <Link href="/cari" className="tombol-mini" aria-label="Cari">
            <Ikon ukuran={15}>{ikonCari}</Ikon>
          </Link>
          <button onClick={keluar} className="tombol-mini" aria-label="Keluar">
            <Ikon ukuran={15}>{ikonKeluar}</Ikon>
          </button>
        </div>
      </header>

      {/* Bar navigasi bawah — mobile ala e-commerce */}
      <nav className="bar-bawah no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 md:hidden">
        {menuBawah.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bar-bawah-taut ${
              aktif(item.href) ? "bar-bawah-aktif" : ""
            }`}
          >
            <Ikon ukuran={20}>{item.ikon}</Ikon>
            <span>{item.label}</span>
          </Link>
        ))}
        <button onClick={() => setLembar(true)} className="bar-bawah-taut">
          <Ikon ukuran={20}>{ikonLainnya}</Ikon>
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Sheet "Lainnya" — mobile */}
      {lembar && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setLembar(false)}
          />
          <div className="sheet sheet-kaca absolute inset-x-0 bottom-0 border-t border-white/10">
            <div className="flex justify-center pt-3">
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <p className="px-5 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              Menu lainnya
            </p>
            <nav className="flex flex-col gap-1 px-3 py-2">
              {menuLembar.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-side ${
                    aktif(item.href) ? "nav-side-aktif" : ""
                  }`}
                >
                  <Ikon>{item.ikon}</Ikon>
                  <span>{item.label}</span>
                </Link>
              ))}
              <TemaToggle
                ukuran={18}
                className="nav-side"
                denganLabel
              />
            </nav>
            <div className="border-t border-white/10 p-3">
              <button
                onClick={keluar}
                className="nav-side w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Ikon>{ikonKeluar}</Ikon>
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konten */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-8 md:pt-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
