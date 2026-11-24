"use client";

import { Fragment, useMemo, useState } from "react";
import { formatWaktu } from "@/lib/format";

export type BarisWa = {
  id: number;
  jenis: string;
  status: string;
  nomorTujuan: string;
  pesan: string;
  namaPelanggan: string | null;
  nomorInvoice: string | null;
  nomorKwitansi: string | null;
  keterangan: string | null;
  waktu: string;
};

const LABEL_JENIS: Record<string, string> = {
  INVOICE_BARU: "Invoice baru",
  TAGIHAN: "Tagihan",
  PENGINGAT: "Pengingat",
  PEMBAYARAN: "Pembayaran",
  KWITANSI: "Kwitansi",
  UJI: "Uji kirim",
  LAINNYA: "Lainnya",
};

const KELAS_JENIS: Record<string, string> = {
  INVOICE_BARU: "badge badge-cyan",
  TAGIHAN: "badge badge-cyan",
  PENGINGAT: "badge badge-amber",
  PEMBAYARAN: "badge badge-emerald",
  KWITANSI: "badge badge-emerald",
  UJI: "badge badge-slate",
  LAINNYA: "badge badge-slate",
};

function labelJenis(j: string) {
  return LABEL_JENIS[j] ?? j;
}

function kelasJenis(j: string) {
  return KELAS_JENIS[j] ?? "badge badge-slate";
}

export default function WaRiwayat({ daftar }: { daftar: BarisWa[] }) {
  const [kata, setKata] = useState("");
  const [jenis, setJenis] = useState("SEMUA");
  const [status, setStatus] = useState("SEMUA");
  const [terbuka, setTerbuka] = useState<number | null>(null);

  const jenisTersedia = useMemo(
    () => Array.from(new Set(daftar.map((d) => d.jenis))),
    [daftar]
  );

  const hasil = useMemo(() => {
    const q = kata.trim().toLowerCase();
    return daftar.filter((d) => {
      if (jenis !== "SEMUA" && d.jenis !== jenis) return false;
      if (status !== "SEMUA" && d.status !== status) return false;
      if (!q) return true;
      const gabung = [
        d.namaPelanggan,
        d.nomorTujuan,
        d.nomorInvoice,
        d.nomorKwitansi,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return gabung.includes(q);
    });
  }, [daftar, kata, jenis, status]);

  return (
    <div className="kaca overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <h2 className="text-sm font-semibold text-slate-100">
          Riwayat pesan
          <span className="ml-2 font-normal text-slate-500">
            {hasil.length} dari {daftar.length}
          </span>
        </h2>
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
          <input
            type="search"
            value={kata}
            onChange={(e) => setKata(e.target.value)}
            placeholder="Cari nama, nomor, invoice…"
            className="masukan w-full text-sm sm:w-56"
          />
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="masukan w-full text-sm sm:w-40"
            aria-label="Filter jenis pesan"
          >
            <option value="SEMUA">Semua jenis</option>
            {jenisTersedia.map((j) => (
              <option key={j} value={j}>
                {labelJenis(j)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="masukan w-full text-sm sm:w-36"
            aria-label="Filter status"
          >
            <option value="SEMUA">Semua status</option>
            <option value="TERKIRIM">Terkirim</option>
            <option value="GAGAL">Gagal</option>
          </select>
        </div>
      </div>

      {hasil.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-300">
            {daftar.length === 0
              ? "Belum ada notifikasi WhatsApp tercatat"
              : "Tidak ada pesan yang cocok dengan filter"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            {daftar.length === 0
              ? "Pesan yang dikirim dari halaman invoice, kwitansi, pengingat otomatis, atau uji kirim akan terekam di sini."
              : "Ubah kata kunci atau filter jenis/status."}
          </p>
        </div>
      ) : (
        <>
          {/* Tabel desktop */}
          <table className="tabel hidden md:table">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3 font-medium">Waktu</th>
                <th className="px-6 py-3 font-medium">Penerima</th>
                <th className="px-6 py-3 font-medium">Jenis</th>
                <th className="px-6 py-3 font-medium">Dokumen</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Isi</th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((d) => (
                <Fragment key={d.id}>
                  <tr
                    className="cursor-pointer border-b border-white/10"
                    onClick={() => setTerbuka(terbuka === d.id ? null : d.id)}
                  >
                    <td className="whitespace-nowrap px-6 py-3 text-slate-400">
                      {formatWaktu(d.waktu)}
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium">
                        {d.namaPelanggan || "—"}
                      </p>
                      <p className="angka text-xs text-slate-500">
                        {d.nomorTujuan}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={kelasJenis(d.jenis)}>
                        {labelJenis(d.jenis)}
                      </span>
                    </td>
                    <td className="angka px-6 py-3 text-xs text-slate-400">
                      {d.nomorInvoice || "—"}
                      {d.nomorKwitansi ? (
                        <span className="block text-slate-500">
                          {d.nomorKwitansi}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-3">
                      {d.status === "TERKIRIM" ? (
                        <span className="badge badge-emerald">Terkirim</span>
                      ) : (
                        <span className="badge badge-rose">Gagal</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-slate-500">
                      {terbuka === d.id ? "Tutup ▲" : "Lihat ▼"}
                    </td>
                  </tr>
                  {terbuka === d.id && (
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <td colSpan={6} className="px-6 py-4">
                        {d.keterangan && (
                          <p className="mb-2 text-xs text-slate-500">
                            {d.keterangan}
                          </p>
                        )}
                        <p className="max-w-2xl whitespace-pre-line text-xs leading-relaxed text-slate-300">
                          {d.pesan}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>

          {/* Kartu mobile */}
          <ul className="divide-y divide-white/10 md:hidden">
            {hasil.map((d) => (
              <li key={d.id}>
                <button
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setTerbuka(terbuka === d.id ? null : d.id)}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {d.namaPelanggan || d.nomorTujuan}
                    </p>
                    <p className="angka text-xs text-slate-500">
                      {d.nomorTujuan}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={kelasJenis(d.jenis)}>
                        {labelJenis(d.jenis)}
                      </span>
                      {d.status === "TERKIRIM" ? (
                        <span className="badge badge-emerald">Terkirim</span>
                      ) : (
                        <span className="badge badge-rose">Gagal</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatWaktu(d.waktu)}
                      {d.nomorInvoice ? ` · ${d.nomorInvoice}` : ""}
                      {d.nomorKwitansi ? ` · ${d.nomorKwitansi}` : ""}
                    </p>
                  </div>
                  <span className="mt-1 text-xs text-slate-500">
                    {terbuka === d.id ? "▲" : "▼"}
                  </span>
                </button>
                {terbuka === d.id && (
                  <div className="bg-white/[0.03] px-4 pb-4 pt-1">
                    {d.keterangan && (
                      <p className="mb-2 text-xs text-slate-500">
                        {d.keterangan}
                      </p>
                    )}
                    <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
                      {d.pesan}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <p className="border-t border-white/10 px-6 py-3 text-xs text-slate-500">
            Menampilkan {hasil.length} pesan terbaru (maks. 200). Riwayat hanya
            mencatat pesan yang dikirim setelah fitur ini aktif — klik baris
            untuk melihat isi pesan.
          </p>
        </>
      )}
    </div>
  );
}
