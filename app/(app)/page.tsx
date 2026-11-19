import Link from "next/link";
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

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const sekarang = new Date();
  const awalBulan = new Date(
    Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1)
  );
  const awal6Bulan = new Date(
    Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() - 5, 1)
  );

  const [invoices, pembayaranBulanIni, layananAktif, layananList, pembayaranTerbaru, setting] =
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
      prisma.pembayaran.aggregate({
        where: { tanggal: { gte: awalBulan } },
        _sum: { jumlah: true },
      }),
      prisma.layanan.count({ where: { status: "AKTIF" } }),
      prisma.layanan.findMany({
        where: { status: "AKTIF", tanggalAkhir: { not: null } },
        include: { pelanggan: { select: { nama: true } } },
        orderBy: { tanggalAkhir: "asc" },
      }),
      prisma.pembayaran.findMany({
        include: {
          invoice: {
            select: { id: true, nomor: true, pelanggan: { select: { nama: true } } },
          },
        },
        orderBy: [{ tanggal: "desc" }, { id: "desc" }],
        take: 5,
      }),
      prisma.setting.findFirst(),
    ]);

  // Piutang & invoice yang perlu ditindaklanjuti
  let piutang = 0;
  let ditindaklanjuti = 0;
  const daftarJatuhTempo: {
    id: number;
    nomor: string;
    pelanggan: string;
    sisa: number;
    jatuhTempo: string | null;
    terlambat: boolean;
  }[] = [];
  for (const inv of invoices) {
    const { total } = hitungTotal(inv.items, inv.diskonPersen, inv.ppnPersen);
    const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
    const sisa = total - dibayar;
    if (sisa <= 0) continue;
    piutang += sisa;
    const hari = inv.jatuhTempo ? sisaHari(inv.jatuhTempo.toISOString()) : null;
    if (hari !== null && hari <= 7) {
      ditindaklanjuti++;
      if (daftarJatuhTempo.length < 5) {
        daftarJatuhTempo.push({
          id: inv.id,
          nomor: inv.nomor,
          pelanggan: inv.pelanggan.nama,
          sisa,
          jatuhTempo: inv.jatuhTempo ? inv.jatuhTempo.toISOString() : null,
          terlambat: hari < 0,
        });
      }
    }
  }

  // Perlu diperpanjang: layanan aktif berakhir ≤ 30 hari
  const perluPerpanjang = layananList
    .filter(
      (l) =>
        l.tanggalAkhir !== null && sisaHari(l.tanggalAkhir.toISOString()) <= 30
    )
    .slice(0, 5);

  // Grafik pembayaran 6 bulan
  const semuaPembayaran = await prisma.pembayaran.findMany({
    where: { tanggal: { gte: awal6Bulan } },
    select: { tanggal: true, jumlah: true },
  });
  const grafik: { label: string; jumlah: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(
      Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() - i, 1)
    );
    grafik.push({ label: NAMA_BULAN_PENDEK[d.getUTCMonth()], jumlah: 0 });
  }
  for (const p of semuaPembayaran) {
    const idx = 5 - (sekarang.getUTCMonth() - p.tanggal.getUTCMonth() +
      (sekarang.getUTCFullYear() - p.tanggal.getUTCFullYear()) * 12);
    if (idx >= 0 && idx < 6) grafik[idx].jumlah += p.jumlah;
  }
  const maksGrafik = Math.max(...grafik.map((g) => g.jumlah), 1);

  const stats = [
    {
      label: "Piutang berjalan",
      nilai: formatRupiah(piutang),
      href: "/invoice",
      catatan: "Invoice terkirim yang belum lunas",
      warna: "text-cyan-300",
    },
    {
      label: "Pembayaran bulan ini",
      nilai: formatRupiah(pembayaranBulanIni._sum.jumlah ?? 0),
      href: "/kwitansi",
      catatan: "Total masuk bulan berjalan",
      warna: "text-emerald-300",
    },
    {
      label: "Layanan aktif",
      nilai: String(layananAktif),
      href: "/layanan",
      catatan: "Langganan sedang berjalan",
      warna: "text-slate-100",
    },
    {
      label: "Perlu ditindaklanjuti",
      nilai: String(ditindaklanjuti),
      href: "/invoice",
      catatan: "Jatuh tempo ≤ 7 hari atau lewat",
      warna: ditindaklanjuti > 0 ? "text-rose-400" : "text-slate-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="muncul">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Selamat datang{setting?.namaUsaha ? ` di ${setting.namaUsaha}` : ""} —
          ringkasan bisnis Anda hari ini.
        </p>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className="kaca muncul p-5 transition-colors hover:border-cyan-400/30"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {s.label}
            </p>
            <p
              className={`angka mt-2 truncate text-xl font-bold sm:text-2xl ${s.warna}`}
            >
              {s.nilai}
            </p>
            <p className="mt-1 text-xs text-slate-500">{s.catatan}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Grafik 6 bulan */}
        <div className="kaca muncul p-6 lg:col-span-3" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-semibold text-slate-100">
            Pembayaran 6 bulan terakhir
          </h2>
          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
            {grafik.map((g) => (
              <div key={g.label} className="flex h-full flex-1 flex-col items-center">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t ${
                      g.jumlah > 0
                        ? "bg-gradient-to-t from-cyan-600/80 to-cyan-300 shadow-[0_0_14px_-2px_rgba(34,211,238,0.5)]"
                        : "bg-white/10"
                    }`}
                    style={{
                      height: `${Math.max((g.jumlah / maksGrafik) * 100, g.jumlah > 0 ? 6 : 2)}%`,
                    }}
                    title={formatRupiah(g.jumlah)}
                  />
                </div>
                <p className="angka mt-1 hidden text-[10px] text-slate-500 sm:block">
                  {g.jumlah > 0 ? formatRpPendek(g.jumlah) : ""}
                </p>
                <p className="text-xs text-slate-500">{g.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Perlu diperpanjang */}
        <div className="kaca muncul p-6 lg:col-span-2" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Perlu diperpanjang</h2>
            <Link
              href="/layanan"
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {perluPerpanjang.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Tidak ada layanan yang segera berakhir.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {perluPerpanjang.map((l) => {
                const sisa = sisaHari(l.tanggalAkhir!.toISOString());
                return (
                  <li
                    key={l.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-100">{l.nama}</p>
                      <p className="text-xs text-slate-500">{l.pelanggan.nama}</p>
                    </div>
                    <span
                      className={`badge ${
                        sisa < 0
                          ? "badge-rose"
                          : sisa <= 7
                            ? "badge-rose"
                            : "badge-amber"
                      }`}
                    >
                      {sisa < 0
                        ? "Berakhir"
                        : sisa === 0
                          ? "Hari ini"
                          : `${sisa} hari`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Jatuh tempo dekat */}
        <div className="kaca muncul p-6 lg:col-span-2" style={{ animationDelay: "240ms" }}>
          <h2 className="text-sm font-semibold text-slate-100">
            Invoice jatuh tempo dekat
          </h2>
          {daftarJatuhTempo.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Tidak ada invoice yang perlu ditagih segera.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {daftarJatuhTempo.map((inv) => (
                <li key={inv.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <Link
                      href={`/invoice/${inv.id}`}
                      className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {inv.nomor}
                    </Link>
                    <p className="text-xs text-slate-500">{inv.pelanggan}</p>
                  </div>
                  <div className="text-right">
                    <p className="angka font-medium text-slate-100">{formatRupiah(inv.sisa)}</p>
                    <p
                      className={`text-xs ${
                        inv.terlambat ? "text-rose-400" : "text-amber-400"
                      }`}
                    >
                      {inv.terlambat ? "Terlambat" : "Segera"}
                      {inv.jatuhTempo ? ` · ${formatTanggal(inv.jatuhTempo)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pembayaran terbaru */}
        <div className="kaca muncul p-6 lg:col-span-3" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Pembayaran terbaru</h2>
            <Link
              href="/kwitansi"
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {pembayaranTerbaru.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Belum ada pembayaran tercatat.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pembayaranTerbaru.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <Link
                      href={`/invoice/${p.invoice.id}`}
                      className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {p.invoice.nomor}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {p.invoice.pelanggan.nama} · {formatTanggal(p.tanggal.toISOString())}
                    </p>
                  </div>
                  <p className="angka whitespace-nowrap font-medium text-emerald-300">
                    +{formatRupiah(p.jumlah)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
