"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputCls = "masukan mt-1 w-full text-sm";

export default function SetupForm() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [error, setError] = useState("");
  const [memproses, setMemproses] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== konfirmasi) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setMemproses(true);
    setError("");
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, password }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Gagal membuat akun.");
      setMemproses(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="peringatan text-xs">
        Pertama kali menggunakan aplikasi ini. Buat akun admin untuk mulai.
      </p>
      <div>
        <label className="label" htmlFor="nama">
          Nama admin
        </label>
        <input
          id="nama"
          type="text"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password (minimal 6 karakter)
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="label" htmlFor="konfirmasi">
          Ulangi password
        </label>
        <input
          id="konfirmasi"
          type="password"
          required
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
          className={inputCls}
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={memproses}
        className="tombol-utama w-full"
      >
        {memproses ? "Memproses…" : "Buat akun admin"}
      </button>
    </form>
  );
}
