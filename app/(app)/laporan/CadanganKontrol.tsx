"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function CadanganKontrol() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [memproses, setMemproses] = useState(false);
  const [notifikasi, setNotifikasi] = useState<{
    jenis: "ok" | "gagal";
    teks: string;
  } | null>(null);

  async function pulihkan(file: File) {
    if (
      !window.confirm(
        "PULIHKAN akan MENGGANTI SELURUH data saat ini dengan isi file cadangan. Lanjutkan?"
      )
    )
      return;
    if (!window.confirm("Konfirmasi terakhir: semua data saat ini tidak bisa dikembalikan. Yakin?"))
      return;
    setMemproses(true);
    setNotifikasi(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/cadangan", { method: "POST", body: fd });
    setMemproses(false);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "ok",
        teks: `Cadangan dipulihkan: ${data?.ringkasan?.pelanggan ?? 0} pelanggan, ${data?.ringkasan?.invoice ?? 0} invoice, ${data?.ringkasan?.kwitansi ?? 0} kwitansi.`,
      });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal memulihkan cadangan.",
      });
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="mt-4">
      {notifikasi && (
        <div
          className={notifikasi.jenis === "ok" ? "notif-ok" : "notif-gagal"}
        >
          {notifikasi.teks}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="/api/cadangan"
          download
          className="tombol-utama"
        >
          Unduh cadangan (.json)
        </a>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          disabled={memproses}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pulihkan(file);
          }}
        />
        <button
          onClick={() => input.current?.click()}
          disabled={memproses}
          className="tombol-halus disabled:opacity-50"
        >
          {memproses ? "Memulihkan…" : "Pulihkan dari JSON"}
        </button>
      </div>
    </div>
  );
}
