import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal } from "@/lib/format";

export const instant = false;

function Bagian({
  judul,
  jumlah,
  children,
}: {
  judul: string;
  jumlah: number;
  children: React.ReactNode;
}) {
  if (jumlah === 0) return null;
  return (
    <div className="kaca">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-sm font-semibold">
          {judul}{" "}
          <span className="font-normal text-slate-500">({jumlah} hasil)</span>
        </h2>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";

  if (!q) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pencarian</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ketik kata kunci di kolom pencarian — invoice, pelanggan, layanan,
            dan kwitansi dicari sekaligus.
          </p>
        </div>
      </div>
    );
  }

  const [invoice, pelanggan, layanan, kwitansi] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        OR: [
          { nomor: { contains: q } },
          { catatan: { contains: q } },
          { pelanggan: { nama: { contains: q } } },
          { pelanggan: { perusahaan: { contains: q } } },
        ],
      },
      include: {
        pelanggan: { select: { nama: true } },
        items: true,
        pembayaran: { select: { jumlah: true } },
      },
      orderBy: { tanggal: "desc" },
      take: 5,
    }),
    prisma.pelanggan.findMany({
      where: {
        OR: [
          { nama: { contains: q } },
          { perusahaan: { contains: q } },
          { telepon: { contains: q } },
          { email: { contains: q } },
        ],
      },
      orderBy: { nama: "asc" },
      take: 5,
    }),
    prisma.layanan.findMany({
      where: {
        OR: [
          { nama: { contains: q } },
          { deskripsi: { contains: q } },
          { pelanggan: { nama: { contains: q } } },
        ],
      },
      include: { pelanggan: { select: { nama: true } } },
      orderBy: { nama: "asc" },
      take: 5,
    }),
    prisma.kwitansi.findMany({
      where: {
        OR: [
          { nomor: { contains: q } },
          { pembayaran: { invoice: { nomor: { contains: q } } } },
          { pembayaran: { invoice: { pelanggan: { nama: { contains: q } } } } },
        ],
      },
      include: {
        pembayaran: {
          select: {
            jumlah: true,
            tanggal: true,
            invoice: { select: { id: true, nomor: true } },
          },
        },
      },
      orderBy: { tanggal: "desc" },
      take: 5,
    }),
  ]);

  const total = invoice.length + pelanggan.length + layanan.length + kwitansi.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pencarian</h1>
        <p className="mt-1 text-sm text-slate-500">
          {total > 0
            ? `${total} hasil untuk "${q}"`
            : `Tidak ada hasil untuk "${q}".`}
        </p>
      </div>

      <Bagian judul="Invoice" jumlah={invoice.length}>
        <ul className="space-y-3 text-sm">
          {invoice.map((inv) => {
            const subtotal = inv.items.reduce(
              (a, it) => a + it.qty * it.hargaSatuan,
              0
            );
            const total =
              Math.round(
                (subtotal - Math.round((subtotal * inv.diskonPersen) / 100)) *
                  (1 + inv.ppnPersen / 100)
              );
            const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
            const lunas = total > 0 && dibayar >= total;
            return (
              <li key={inv.id} className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/invoice/${inv.id}`}
                    className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    {inv.nomor}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {inv.pelanggan.nama} · {formatTanggal(inv.tanggal.toISOString())}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatRupiah(total)}</p>
                  <p
                    className={`text-xs ${lunas ? "text-emerald-300" : "text-amber-400"}`}
                  >
                    {lunas ? "Lunas" : "Belum lunas"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Bagian>

      <Bagian judul="Pelanggan" jumlah={pelanggan.length}>
        <ul className="space-y-3 text-sm">
          {pelanggan.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{p.nama}</p>
                {p.perusahaan && (
                  <p className="text-xs text-slate-500">{p.perusahaan}</p>
                )}
              </div>
              {p.telepon && <p className="text-xs text-slate-500">{p.telepon}</p>}
            </li>
          ))}
        </ul>
      </Bagian>

      <Bagian judul="Layanan" jumlah={layanan.length}>
        <ul className="space-y-3 text-sm">
          {layanan.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{l.nama}</p>
                <p className="text-xs text-slate-500">{l.pelanggan.nama}</p>
              </div>
              <p className="font-medium">{formatRupiah(l.harga)}</p>
            </li>
          ))}
        </ul>
      </Bagian>

      <Bagian judul="Kwitansi" jumlah={kwitansi.length}>
        <ul className="space-y-3 text-sm">
          {kwitansi.map((k) => (
            <li key={k.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{k.nomor}</p>
                <p className="text-xs text-slate-500">
                  Untuk {k.pembayaran.invoice.nomor} ·{" "}
                  {formatTanggal(k.pembayaran.tanggal.toISOString())}
                </p>
              </div>
              <Link
                href={`/cetak/kwitansi/${k.id}`}
                className="font-medium text-emerald-300 hover:underline"
              >
                {formatRupiah(k.pembayaran.jumlah)}
              </Link>
            </li>
          ))}
        </ul>
      </Bagian>
    </div>
  );
}
