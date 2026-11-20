"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import StripAngka from "@/components/StripAngka";
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

const btnSekunder = "tombol-halus";
const btnBahaya = "tombol-bahaya";

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

  const nilaiKwitansi = useMemo(() => {
    const kini = new Date();
    const bulanKini = kini.getFullYear() * 12 + kini.getMonth();
    let bulanIni = 0;
    let tahunIni = 0;
    let total = 0;
    for (const k of daftar) {
      const d = new Date(k.tanggal);
      total += k.jumlah;
      if (d.getFullYear() === kini.getFullYear()) {
        tahunIni += k.jumlah;
        if (d.getFullYear() * 12 + d.getMonth() === bulanKini)
          bulanIni += k.jumlah;
      }
    }
    return {
      bulanIni,
      tahunIni,
      rataRata: daftar.length > 0 ? Math.round(total / daftar.length) : 0,
    };
  }, [daftar]);

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
        <p className="mt-1 text-sm text-slate-500">
          Bukti pembayaran — otomatis dibuat setiap kali pembayaran dicatat.
        </p>
      </div>

      <StripAngka
        kartu={[
          { label: "Total kwitansi", nilai: String(daftar.length) },
          {
            label: "Nilai bulan ini",
            nilai: formatRupiah(nilaiKwitansi.bulanIni),
            aksen: "text-emerald-300",
          },
          {
            label: "Nilai tahun ini",
            nilai: formatRupiah(nilaiKwitansi.tahunIni),
            aksen: "text-emerald-300",
          },
          {
            label: "Rata-rata nilai",
            nilai: formatRupiah(nilaiKwitansi.rataRata),
          },
        ]}
      />

      {notifikasi && (
        <div
          className={notifikasi.jenis === "ok" ? "notif-ok" : "notif-gagal"}
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
          className="masukan w-full max-w-sm text-sm"
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

      <div className="kaca">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Daftar kwitansi{" "}
            <span className="font-normal text-slate-500">
              ({daftar.length} kwitansi)
            </span>
          </h2>
        </div>

        {daftar.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl">§</p>
            <p className="mt-3 text-sm text-slate-500">
              {q
                ? "Tidak ada kwitansi yang cocok dengan pencarian."
                : "Belum ada kwitansi. Catat pembayaran pada salah satu invoice."}
            </p>
          </div>
        ) : (
          <>
            {/* Tabel — layar sedang ke atas */}
            <div className="hidden overflow-x-auto md:block">
              <table className="tabel">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
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
                    <tr key={k.id} className="border-b border-white/10 last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium">{k.nomor}</p>
                        {k.penerima && (
                          <p className="text-xs text-slate-500">
                            Penerima: {k.penerima}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/invoice/${k.invoiceId}`}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {k.invoiceNomor}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-slate-200">{k.pelangganNama}</p>
                        {k.pelangganPerusahaan && (
                          <p className="text-xs text-slate-500">
                            {k.pelangganPerusahaan}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-400">
                        {formatTanggal(k.tanggal)}
                      </td>
                      <td className="px-6 py-3 text-slate-400">
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
                            className="tombol-mini"
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
            <ul className="divide-y divide-white/10 md:hidden">
              {daftar.map((k) => (
                <li key={k.id} className="space-y-2 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{k.nomor}</p>
                      <p className="text-xs text-slate-500">
                        {k.pelangganNama}
                        {k.pelangganPerusahaan ? ` · ${k.pelangganPerusahaan}` : ""}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-medium">
                      {formatRupiah(k.jumlah)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    Invoice{" "}
                    <Link
                      href={`/invoice/${k.invoiceId}`}
                      className="text-cyan-400"
                    >
                      {k.invoiceNomor}
                    </Link>{" "}
                    · {formatTanggal(k.tanggal)}
                    {k.metode ? ` · ${LABEL_METODE[k.metode] ?? k.metode}` : ""}
                  </p>
                  {k.penerima && (
                    <p className="text-xs text-slate-600">Penerima: {k.penerima}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/cetak/kwitansi/${k.id}`}
                      target="_blank"
                      className="tombol-mini"
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
