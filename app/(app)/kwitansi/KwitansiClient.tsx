"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatRupiah, formatTanggal, LABEL_METODE } from "@/lib/format";

export type KwitansiRingkas = {
  id: number;
  nomor: string;
  penerima: string | null;
  pembayaranId: number;
  jumlah: number;
  tanggal: string;
  metode: string | null;
  invoiceNomor: string;
  invoiceId: number;
  pelangganNama: string;
  pelangganPerusahaan: string | null;
};

const btnSekunder =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50";
const btnBahaya =
  "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50";

export default function KwitansiClient({
  daftar,
  q,
}: {
  daftar: KwitansiRingkas[];
  q: string;
}) {
  const router = useRouter();
  const [kataCari, setKataCari] = useState(q);
  const [notifikasi, setNotifikasi] = useState<{
    jenis: "ok" | "gagal";
    teks: string;
  } | null>(null);

  async function hapus(k: KwitansiRingkas) {
    if (
      !window.confirm(
        `Hapus kwitansi ${k.nomor}? Pembayaran ${formatRupiah(k.jumlah)} juga terhapus.`
      )
    )
      return;
    const res = await fetch(`/api/pembayaran/${k.pembayaranId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotifikasi({
        jenis: "ok",
        teks: `Kwitansi ${k.nomor} dihapus.`,
      });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal menghapus kwitansi.",
      });
    }
  }

  function cari(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      kataCari.trim()
        ? `/kwitansi?q=${encodeURIComponent(kataCari.trim())}`
        : "/kwitansi"
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kwitansi</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Bukti pembayaran — otomatis dibuat setiap kali pembayaran dicatat.
        </p>
      </div>

      {notifikasi && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ${
            notifikasi.jenis === "ok"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {notifikasi.teks}
        </div>
      )}

      <form onSubmit={cari} className="flex gap-2">
        <input
          type="search"
          placeholder="Cari nomor kwitansi, invoice, atau pelanggan…"
          value={kataCari}
          onChange={(e) => setKataCari(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
        <button type="submit" className={btnSekunder}>
          Cari
        </button>
        {q && (
          <button
            type="button"
            onClick={() => {
              setKataCari("");
              router.push("/kwitansi");
            }}
            className={btnSekunder}
          >
            Reset
          </button>
        )}
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-sm font-semibold">
            Daftar kwitansi{" "}
            <span className="font-normal text-zinc-500">
              ({daftar.length} kwitansi)
            </span>
          </h2>
        </div>

        {daftar.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl">§</p>
            <p className="mt-3 text-sm text-zinc-500">
              {q
                ? "Tidak ada kwitansi yang cocok dengan pencarian."
                : "Belum ada kwitansi. Catat pembayaran pada salah satu invoice."}
            </p>
          </div>
        ) : (
          <>
            {/* Tabel — layar sedang ke atas */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-6 py-3 font-medium">Nomor kwitansi</th>
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Pelanggan</th>
                    <th className="px-6 py-3 font-medium">Tanggal</th>
                    <th className="px-6 py-3 font-medium">Metode</th>
                    <th className="px-6 py-3 font-medium text-right">Jumlah</th>
                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((k) => (
                    <tr key={k.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium">{k.nomor}</p>
                        {k.penerima && (
                          <p className="text-xs text-zinc-500">
                            Penerima: {k.penerima}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/invoice/${k.invoiceId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {k.invoiceNomor}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-zinc-700">{k.pelangganNama}</p>
                        {k.pelangganPerusahaan && (
                          <p className="text-xs text-zinc-500">
                            {k.pelangganPerusahaan}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-600">
                        {formatTanggal(k.tanggal)}
                      </td>
                      <td className="px-6 py-3 text-zinc-600">
                        {k.metode ? (LABEL_METODE[k.metode] ?? k.metode) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-medium">
                        {formatRupiah(k.jumlah)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/cetak/kwitansi/${k.id}`}
                            target="_blank"
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Cetak
                          </Link>
                          <button onClick={() => hapus(k)} className={btnBahaya}>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kartu — layar kecil */}
            <ul className="divide-y divide-zinc-100 md:hidden">
              {daftar.map((k) => (
                <li key={k.id} className="space-y-2 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{k.nomor}</p>
                      <p className="text-xs text-zinc-500">
                        {k.pelangganNama}
                        {k.pelangganPerusahaan ? ` · ${k.pelangganPerusahaan}` : ""}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-medium">
                      {formatRupiah(k.jumlah)}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-600">
                    Invoice{" "}
                    <Link
                      href={`/invoice/${k.invoiceId}`}
                      className="text-blue-600"
                    >
                      {k.invoiceNomor}
                    </Link>{" "}
                    · {formatTanggal(k.tanggal)}
                    {k.metode ? ` · ${LABEL_METODE[k.metode] ?? k.metode}` : ""}
                  </p>
                  {k.penerima && (
                    <p className="text-xs text-zinc-400">Penerima: {k.penerima}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/cetak/kwitansi/${k.id}`}
                      target="_blank"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
                    >
                      Cetak
                    </Link>
                    <button onClick={() => hapus(k)} className={btnBahaya}>
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
