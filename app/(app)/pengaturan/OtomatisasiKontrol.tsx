"use client";

import { useCallback, useEffect, useState } from "react";

type InfoFile = { nama: string; ukuran: number; tanggal: string };

type Status = {
  backupOtomatisAktif: boolean;
  lastRunInvoiceOtomatis: string | null;
  lastRunBackupOtomatis: string | null;
  schedulerAktif: boolean;
  jumlahCadangan: number;
  daftar: InfoFile[];
};

const kartuCls = "rounded-xl border border-zinc-200 bg-white p-6 space-y-5";
const btnSekunder =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50";
const btnBahaya =
  "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50";

function formatWaktu(iso: string | null) {
  if (!iso) return "belum pernah";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function formatUkuran(bait: number) {
  if (bait >= 1024 * 1024) return `${(bait / (1024 * 1024)).toFixed(1)} MB`;
  if (bait >= 1024) return `${Math.round(bait / 1024)} KB`;
  return `${bait} B`;
}

export default function OtomatisasiKontrol() {
  const [status, setStatus] = useState<Status | null>(null);
  const [sedangProses, setSedangProses] = useState<"invoice" | "backup" | null>(null);
  const [pesan, setPesan] = useState<{ jenis: "ok" | "gagal"; teks: string } | null>(null);

  const muat = useCallback(async () => {
    const res = await fetch("/api/otomatis");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  async function aksi(aksi: "invoice" | "backup") {
    setSedangProses(aksi);
    setPesan(null);
    const res = await fetch("/api/otomatis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aksi }),
    });
    const data = await res.json().catch(() => null);
    setSedangProses(null);
    if (!res.ok) {
      setPesan({ jenis: "gagal", teks: data?.error ?? "Gagal menjalankan aksi." });
      return;
    }
    if (aksi === "invoice") {
      setPesan(
        data.jumlah > 0
          ? {
              jenis: "ok",
              teks: `${data.jumlah} invoice dibuat: ${data.dibuat
                .map((d: { nomor: string }) => d.nomor)
                .join(", ")}`,
            }
          : { jenis: "ok", teks: "Tidak ada layanan yang perlu diperpanjang saat ini." }
      );
    } else {
      setPesan({ jenis: "ok", teks: `Cadangan dibuat: ${data.nama}` });
    }
    muat();
  }

  async function ubahToggle(aktif: boolean) {
    setStatus((s) => (s ? { ...s, backupOtomatisAktif: aktif } : s));
    await fetch("/api/otomatis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aksi: "ubahBackupAktif", aktif }),
    });
  }

  async function hapusFile(nama: string) {
    if (!window.confirm(`Hapus file cadangan "${nama}"?`)) return;
    const res = await fetch(
      `/api/backup-otomatis/${encodeURIComponent(nama)}`,
      { method: "DELETE" }
    );
    if (res.ok) muat();
    else setPesan({ jenis: "gagal", teks: "Gagal menghapus file." });
  }

  if (!status) {
    return (
      <section className={kartuCls}>
        <h2 className="text-base font-semibold">Otomatisasi</h2>
        <p className="text-sm text-zinc-500">Memuat…</p>
      </section>
    );
  }

  return (
    <section className={kartuCls}>
      <div>
        <h2 className="text-base font-semibold">Otomatisasi</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {status.schedulerAktif
            ? "Scheduler berjalan — pemeriksaan otomatis setiap 15 menit."
            : "Scheduler tidak aktif (server belum memuat otomatisasi)."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold">Invoice otomatis</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Layanan langganan Bulanan/Tahunan dengan opsi &quot;Perpanjang
            otomatis&quot; di halaman Layanan otomatis dibuatkan invoice saat
            masanya berakhir.
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Terakhir diperiksa: <b>{formatWaktu(status.lastRunInvoiceOtomatis)}</b>
          </p>
          <button
            onClick={() => aksi("invoice")}
            disabled={sedangProses !== null}
            className={`${btnSekunder} mt-3`}
          >
            {sedangProses === "invoice"
              ? "Memproses…"
              : "Jalankan pemeriksaan sekarang"}
          </button>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={status.backupOtomatisAktif}
              onChange={(e) => ubahToggle(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm font-semibold">Cadangan harian otomatis</span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Setiap hari disimpan maksimal 10 file JSON di folder
            cadangan-otomatis di dalam data aplikasi.
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Terakhir dibuat: <b>{formatWaktu(status.lastRunBackupOtomatis)}</b>
          </p>
          <button
            onClick={() => aksi("backup")}
            disabled={sedangProses !== null}
            className={`${btnSekunder} mt-3`}
          >
            {sedangProses === "backup" ? "Membuat…" : "Cadangkan sekarang"}
          </button>
        </div>
      </div>

      {pesan && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ${
            pesan.jenis === "ok"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {pesan.teks}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold">
          File cadangan otomatis{" "}
          <span className="font-normal text-zinc-500">
            ({status.daftar.length} file)
          </span>
        </h3>
        {status.daftar.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Belum ada file cadangan otomatis.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {status.daftar.map((f) => (
              <li
                key={f.nama}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.nama}</p>
                  <p className="text-xs text-zinc-500">
                    {formatUkuran(f.ukuran)} ·{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Jakarta",
                    }).format(new Date(f.tanggal))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={`/api/backup-otomatis/${encodeURIComponent(f.nama)}`}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Unduh
                  </a>
                  <button onClick={() => hapusFile(f.nama)} className={btnBahaya}>
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        File di sini bisa dipulihkan lewat menu{" "}
        <a href="/laporan" className="font-medium underline">
          Laporan → Cadangan
        </a>
        : unduh lalu unggah kembali.
      </p>
    </section>
  );
}
