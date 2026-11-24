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

function Ikon({
  ukuran = 16,
  className,
  children,
}: {
  ukuran?: number;
  className?: string;
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
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ikonDompet = (
  <>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </>
);

const ikonMasuk = (
  <>
    <line x1="17" y1="7" x2="7" y2="17" />
    <polyline points="17 17 7 17 7 7" />
  </>
);

const ikonPaket = (
  <>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="11" />
  </>
);

const ikonPeringatan = (
  <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>
);

const ikonPanahKanan = (
  <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>
);

const ikonNaik = (
  <>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </>
);

const ikonTurun = (
  <>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </>
);

const ikonKosong = (
  <>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </>
);

const GAYA_CHIP = {
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  slate: "border-white/15 bg-white/[0.06] text-slate-300",
} as const;

function ChipIkon({
  gaya,
  children,
}: {
  gaya: keyof typeof GAYA_CHIP;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${GAYA_CHIP[gaya]}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function Kosong({ pesan }: { pesan: string }) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
      <Ikon ukuran={18} className="text-slate-600">
        {ikonKosong}
      </Ikon>
      <p className="text-sm text-slate-500">{pesan}</p>
    </div>
  );
}

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

  // Turunan presentasi (tidak menyentuh data bisnis)
  const totalGrafik = grafik.reduce((a, g) => a + g.jumlah, 0);
  const bulanLalu = grafik[4].jumlah;
  const perubahanPersen =
    bulanLalu > 0
      ? Math.round(((grafik[5].jumlah - bulanLalu) / bulanLalu) * 100)
      : null;
  const tanggalHariIni = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(sekarang);

  return (
    <div className="space-y-6">
      <div className="muncul flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Selamat datang{setting?.namaUsaha ? ` di ${setting.namaUsaha}` : ""} —
            ringkasan bisnis Anda hari ini.
          </p>
        </div>
        <p className="angka rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-slate-400">
          {tanggalHariIni}
        </p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {/* Hero: piutang berjalan */}
        <Link
          href="/invoice"
          className="kaca muncul group col-span-2 overflow-hidden bg-gradient-to-br from-cyan-500/15 via-white/[0.03] to-transparent p-5 transition-colors hover:border-cyan-400/40 sm:p-6 md:col-span-2"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Piutang berjalan
            </p>
            <ChipIkon gaya="cyan">
              <Ikon>{ikonDompet}</Ikon>
            </ChipIkon>
          </div>
          <p className="angka mt-3 truncate text-3xl font-bold text-cyan-300 sm:text-4xl">
            {formatRupiah(piutang)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Invoice terkirim yang belum lunas
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-400 transition-transform duration-150 group-hover:translate-x-0.5">
            Kelola invoice
            <Ikon ukuran={14}>{ikonPanahKanan}</Ikon>
          </span>
        </Link>

        {/* Pembayaran bulan ini */}
        <Link
          href="/kwitansi"
          className="kaca muncul group col-span-2 p-5 transition-colors hover:border-emerald-400/30 sm:p-6 md:col-span-2"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Pembayaran bulan ini
            </p>
            <ChipIkon gaya="emerald">
              <Ikon>{ikonMasuk}</Ikon>
            </ChipIkon>
          </div>
          <p className="angka mt-3 truncate text-2xl font-bold text-emerald-300 sm:text-3xl">
            {formatRupiah(pembayaranBulanIni._sum.jumlah ?? 0)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            {perubahanPersen === null ? (
              "Total masuk bulan berjalan"
            ) : (
              <>
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    perubahanPersen >= 0 ? "text-emerald-300" : "text-rose-400"
                  }`}
                >
                  <Ikon ukuran={12}>
                    {perubahanPersen >= 0 ? ikonNaik : ikonTurun}
                  </Ikon>
                  {perubahanPersen >= 0 ? "+" : ""}
                  {perubahanPersen}%
                </span>
                vs bulan lalu
              </>
            )}
          </p>
        </Link>

        {/* Layanan aktif */}
        <Link
          href="/layanan"
          className="kaca muncul group col-span-1 p-4 transition-colors hover:border-white/30 sm:p-5 md:col-span-1"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Layanan aktif
            </p>
            <ChipIkon gaya="slate">
              <Ikon>{ikonPaket}</Ikon>
            </ChipIkon>
          </div>
          <p className="angka mt-2 truncate text-2xl font-bold text-slate-100 sm:text-3xl">
            {layananAktif}
          </p>
          <p className="mt-2 hidden text-xs text-slate-500 sm:block">
            Langganan berjalan
          </p>
        </Link>

        {/* Perlu ditindaklanjuti */}
        <Link
          href="/invoice"
          className="kaca muncul group col-span-1 p-4 transition-colors hover:border-rose-400/30 sm:p-5 md:col-span-1"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Perlu ditindak
            </p>
            <ChipIkon gaya={ditindaklanjuti > 0 ? "rose" : "slate"}>
              <Ikon>{ikonPeringatan}</Ikon>
            </ChipIkon>
          </div>
          <p
            className={`angka mt-2 truncate text-2xl font-bold sm:text-3xl ${
              ditindaklanjuti > 0 ? "text-rose-400" : "text-slate-100"
            }`}
          >
            {ditindaklanjuti}
          </p>
          <p className="mt-2 hidden text-xs text-slate-500 sm:block">
            Tempo ≤ 7 hari
          </p>
        </Link>

        {/* Grafik 6 bulan */}
        <div
          className="kaca muncul col-span-2 p-5 sm:p-6 md:col-span-4"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Pembayaran 6 bulan terakhir
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Total{" "}
                <span className="angka font-medium text-slate-300">
                  {formatRupiah(totalGrafik)}
                </span>
              </p>
            </div>
          </div>
          <div className="relative mt-5 h-44">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-between"
            >
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="border-t border-dashed border-white/[0.07]" />
              ))}
            </div>
            <div className="relative z-10 flex h-full items-end gap-2 sm:gap-3">
              {grafik.map((g, i) => (
                <div key={g.label} className="group flex h-full flex-1 flex-col">
                  <p className="angka mb-1.5 hidden h-4 text-center text-[10px] leading-4 text-slate-500 sm:block">
                    {g.jumlah > 0 ? formatRpPendek(g.jumlah) : ""}
                  </p>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`batang-grafik w-full rounded-t-md transition-[filter] duration-150 group-hover:brightness-125 ${
                        g.jumlah > 0
                          ? "bg-gradient-to-t from-cyan-600/80 to-cyan-300 shadow-[0_0_14px_-2px_rgba(34,211,238,0.5)]"
                          : "bg-white/10"
                      }`}
                      style={{
                        height: `${Math.max((g.jumlah / maksGrafik) * 100, g.jumlah > 0 ? 6 : 2)}%`,
                        animationDelay: `${300 + i * 60}ms`,
                      }}
                      title={formatRupiah(g.jumlah)}
                      role="img"
                      aria-label={`${g.label}: ${formatRupiah(g.jumlah)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex gap-2 sm:gap-3">
            {grafik.map((g) => (
              <p key={g.label} className="flex-1 text-center text-xs text-slate-500">
                {g.label}
              </p>
            ))}
          </div>
        </div>

        {/* Perlu diperpanjang */}
        <div
          className="kaca muncul col-span-2 p-5 sm:p-6 md:col-span-2"
          style={{ animationDelay: "300ms" }}
        >
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
            <Kosong pesan="Tidak ada layanan yang segera berakhir." />
          ) : (
            <ul className="daftar-pisah mt-3">
              {perluPerpanjang.map((l) => {
                const sisa = sisaHari(l.tanggalAkhir!.toISOString());
                return (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {l.nama}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {l.pelanggan.nama}
                      </p>
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

        {/* Invoice jatuh tempo dekat */}
        <div
          className="kaca muncul col-span-2 p-5 sm:p-6 md:col-span-2"
          style={{ animationDelay: "360ms" }}
        >
          <h2 className="text-sm font-semibold text-slate-100">
            Jatuh tempo dekat
          </h2>
          {daftarJatuhTempo.length === 0 ? (
            <Kosong pesan="Tidak ada invoice yang perlu ditagih segera." />
          ) : (
            <ul className="daftar-pisah mt-3">
              {daftarJatuhTempo.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/invoice/${inv.id}`}
                      className="text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {inv.nomor}
                    </Link>
                    <p className="truncate text-xs text-slate-500">{inv.pelanggan}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="angka text-sm font-medium text-slate-100">
                      {formatRupiah(inv.sisa)}
                    </p>
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
        <div
          className="kaca muncul col-span-2 p-5 sm:p-6 md:col-span-4"
          style={{ animationDelay: "420ms" }}
        >
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
            <Kosong pesan="Belum ada pembayaran tercatat." />
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-x-6">
              {pembayaranTerbaru.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/invoice/${p.invoice.id}`}
                      className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {p.invoice.nomor}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
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
