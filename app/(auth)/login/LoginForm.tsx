"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const inputCls = "masukan w-full text-sm";
const errorKelas = "mt-1 text-xs text-rose-400";

function IkonMata({ terbuka }: { terbuka: boolean }) {
  return terbuka ? (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const refNama = useRef<HTMLInputElement>(null);
  const refPassword = useRef<HTMLInputElement>(null);
  const [lihatPassword, setLihatPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [salahNama, setSalahNama] = useState("");
  const [salahPassword, setSalahPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Nilai dibaca langsung dari DOM: autofill browser sering tidak
    // memicu onChange React, sehingga input terkontrol bisa terlihat
    // terisi padahal state kosong dan validasi selalu menolak.
    const isiNama = refNama.current?.value.trim() ?? "";
    const isiPassword = refPassword.current?.value ?? "";
    let sah = true;
    if (!isiNama) {
      setSalahNama("Nama pengguna wajib diisi.");
      sah = false;
    } else {
      setSalahNama("");
    }
    if (!isiPassword) {
      setSalahPassword("Password wajib diisi.");
      sah = false;
    } else if (isiPassword.length < 8) {
      setSalahPassword("Password minimal 8 karakter.");
      sah = false;
    } else {
      setSalahPassword("");
    }
    if (!sah) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: isiNama, password: isiPassword }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Gagal masuk.");
    } catch {
      setError("Tidak bisa menghubungi server. Muat ulang halaman lalu coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="nama">
          Nama pengguna
        </label>
        <input
          id="nama"
          ref={refNama}
          type="text"
          autoComplete="username"
          placeholder="Nama pengguna Anda"
          onChange={() => setSalahNama("")}
          className={inputCls}
        />
        {salahNama && <p className={errorKelas}>{salahNama}</p>}
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            ref={refPassword}
            type={lihatPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Minimal 8 karakter"
            onChange={() => setSalahPassword("")}
            style={{ paddingRight: "2.75rem" }}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setLihatPassword((v) => !v)}
            aria-label={
              lihatPassword ? "Sembunyikan password" : "Tampilkan password"
            }
            title={
              lihatPassword ? "Sembunyikan password" : "Tampilkan password"
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:text-slate-100"
          >
            <IkonMata terbuka={lihatPassword} />
          </button>
        </div>
        {salahPassword && <p className={errorKelas}>{salahPassword}</p>}
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" disabled={isLoading} className="tombol-utama w-full">
        {isLoading ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
