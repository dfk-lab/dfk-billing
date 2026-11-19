import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  formatRupiah,
  formatRpPendek,
  formatTanggal,
  sisaHari,
  NAMA_BULAN_PENDEK,
  hitungTotal,
} from "@/lib/format";
import CadanganKontrol from "./CadanganKontrol";

export const instant = false;

const BUKET = [
  { label: "Belum jatuh tempo", mulai: 0, akhir: Infinity, cls: "bg-zinc-100 text-zinc-700" },
  { label: "Terlambat 1–30 hari", mulai: -30, akhir: -1, cls: "bg-amber-50 text-amber-700" },
  { label: "Terlambat 31–60 hari", mulai: -60, akhir: -31, cls: "bg-amber-50 text-amber-700" },
  { label: "Terlambat 61–90 hari", mulai: -90, akhir: -61, cls: "bg-red-50 text-red-700" },
  { label: "Terlambat > 90 hari", mulai: -Infinity, akhir: -91, cls: "bg-red-50 text-red-700" },
];

export default async function LaporanPage() {
  await connection();
  const sekarang = new Date();
  const awal12Bulan = new Date(
    Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() - 11, 1)
  );
  const awalTahun = Date.UTC(sekarang.getUTCFullYear(), 0, 1);

  const [invoicesTerbuka, pembayaran12, pembayaranTahun, invoiceTahun] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { status: "TERKIRIM" },
        include: {
          items: true,
          pembayaran: { select: { jumlah: true } },
          pelanggan: { select: { nama: true } },
        },
        orderBy: [{ jatuhTempo: "asc" }],
      }),
      prisma.pembayaran.findMany({
        where: { tanggal: { gte: awal12Bulan } },
        select: { tanggal: true, jumlah: true },
      }),
      prisma.pembayaran.aggregate({
        where: { tanggal: { gte: new Date(awalTahun) } },
        _sum: { jumlah: true },
      }),
      prisma.invoice.aggregate({
        where: { tanggal: { gte: new Date(awalTahun) } },
        _count: true,
      }),
    ]);

  // Umur piutang
  const perBuket = BUKET.map((b) => ({ ...b, jumlah: 0, total: 0 }));
  const detail: {
    nomor: string;
    pelanggan: string;
    sisa: number;
    jatuhTempo: string | null;
    terlambatHari: number;
  }[] = [];
  for (const inv of invoicesTerbuka) {
    const { total } = hitungTotal(inv.items, inv.diskonPersen, inv.ppnPersen);
    const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
    const sisa = total - dibayar;
    if (sisa <= 0) continue;
    const hari = inv.jatuhTempo ? sisaHari(inv.jatuhTempo.toISOString()) : null;
    const buket = perBuket.find(
      (b) =>
        hari !== null && hari >= b.mulai && hari <= b.akhir && b.mulai <= b.akhir
    );
    const idx = buket
      ? perBuket.indexOf(buket)
      : perBuket.findIndex((b) => b.label === "Belum jatuh tempo");
    perBuket[idx].jumlah += 1;
    perBuket[idx].total += sisa;
    detail.push({
      nomor: inv.nomor,
      pelanggan: inv.pelanggan.nama,
      sisa,
      jatuhTempo: inv.jatuhTempo ? inv.jatuhTempo.toISOString() : null,
      terlambatHari: hari !== null ? Math.max(-hari, 0) : 0,
    });
  }
  detail.sort((a, b) => b.terlambatHari - a.terlambatHari);
  const totalPiutang = detail.reduce((a, d) => a + d.sisa, 0);

  // Grafik 12 bulan
  const grafik: { label: string; jumlah: number; tahun: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(
      Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() - i, 1)
    );
    grafik.push({
      label: NAMA_BULAN_PENDEK[d.getUTCMonth()],
      tahun: d.getUTCFullYear(),
      jumlah: 0,
    });
  }
  const bulanSekarang = sekarang.getUTCMonth();
  const tahunSekarang = sekarang.getUTCFullYear();
  for (const p of pembayaran12) {
    const selisih =
      (tahunSekarang - p.tanggal.getUTCFullYear()) * 12 +
      (bulanSekarang - p.tanggal.getUTCMonth());
    const idx = 11 - selisih;
    if (idx >= 0 && idx < 12) grafik[idx].jumlah += p.jumlah;
  }
  const maks = Math.max(...grafik.map((g) => g.jumlah), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ringkasan keuangan tahun berjalan dan analisis piutang.
        </p>
      </div>

      {/* Ringkasan tahun */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Invoice {tahunSekarang}
          </p>
          <p className="mt-2 text-2xl font-bold">{invoiceTahun._count}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Pembayaran masuk {tahunSekarang}
          </p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatRupiah(pembayaranTahun._sum.jumlah ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Total piutang
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            {formatRupiah(totalPiutang)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Invoice belum lunas
          </p>
          <p className="mt-2 text-2xl font-bold">{detail.length}</p>
        </div>
      </div>

      {/* Grafik 12 bulan */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold">Pembayaran 12 bulan terakhir</h2>
        <div className="mt-6 flex h-44 items-end gap-1 sm:gap-1.5">
          {grafik.map((g) => (
            <div
              key={`${g.tahun}-${g.label}`}
              className="flex h-full flex-1 flex-col items-center"
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t ${g.jumlah > 0 ? "bg-blue-600" : "bg-zinc-200"}`}
                  style={{
                    height: `${Math.max((g.jumlah / maks) * 100, g.jumlah > 0 ? 6 : 2)}%`,
                  }}
                  title={formatRupiah(g.jumlah)}
                />
              </div>
              <p className="mt-1 hidden text-[10px] text-zinc-500 md:block">
                {g.jumlah > 0 ? formatRpPendek(g.jumlah) : ""}
              </p>
              <p className="text-[10px] text-zinc-500 sm:text-xs">{g.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Umur piutang */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-sm font-semibold">Umur piutang</h2>
        </div>
        {detail.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">
            Tidak ada piutang — semua invoice terkirim sudah lunas.
          </p>
        ) : (
          <>
            {/* Ringkasan bucket */}
            <div className="grid grid-cols-2 gap-3 px-6 py-4 sm:grid-cols-5">
              {perBuket.map((b) => (
                <div
                  key={b.label}
                  className={`rounded-lg px-3 py-2 ${b.jumlah > 0 ? b.cls : "bg-zinc-50 text-zinc-400"}`}
                >
                  <p className="text-xs font-medium">{b.label}</p>
                  <p className="mt-1 text-sm font-bold">
                    {formatRupiah(b.total)}
                  </p>
                  <p className="text-[10px]">{b.jumlah} invoice</p>
                </div>
              ))}
            </div>
            {/* Tabel detail */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Pelanggan</th>
                  <th className="px-6 py-3 font-medium">Jatuh tempo</th>
                  <th className="px-6 py-3 font-medium text-right">Keterlambatan</th>
                  <th className="px-6 py-3 font-medium text-right">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {detail.map((d) => (
                  <tr key={d.nomor} className="border-b border-zinc-100 last:border-0">
                    <td className="px-6 py-3 font-medium">{d.nomor}</td>
                    <td className="px-6 py-3 text-zinc-600">{d.pelanggan}</td>
                    <td className="px-6 py-3 text-zinc-600">
                      {d.jatuhTempo ? formatTanggal(d.jatuhTempo) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {d.terlambatHari > 0 ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          {d.terlambatHari} hari
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">Belum jatuh tempo</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {formatRupiah(d.sisa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Kartu mobile */}
            <ul className="divide-y divide-zinc-100 px-4 md:hidden">
              {detail.map((d) => (
                <li key={d.nomor} className="flex items-start justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{d.nomor}</p>
                    <p className="text-xs text-zinc-500">
                      {d.pelanggan}
                      {d.jatuhTempo ? ` · ${formatTanggal(d.jatuhTempo)}` : ""}
                    </p>
                    {d.terlambatHari > 0 && (
                      <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        Terlambat {d.terlambatHari} hari
                      </span>
                    )}
                  </div>
                  <p className="whitespace-nowrap font-medium">{formatRupiah(d.sisa)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Cadangan */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold">Cadangan data</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Unduh seluruh data (pengaturan, pelanggan, layanan, invoice, pembayaran,
          kwitansi) sebagai file JSON, atau pulihkan dari cadangan sebelumnya.
          Memulihkan akan <b>mengganti seluruh data saat ini</b>.
        </p>
        <CadanganKontrol />
      </div>
    </div>
  );
}
