import { prisma } from "@/lib/prisma";
import InvoiceClient from "./InvoiceClient";

export const instant = false;

export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { nomor: { contains: q } },
      { catatan: { contains: q } },
      { pelanggan: { nama: { contains: q } } },
      { pelanggan: { perusahaan: { contains: q } } },
    ];
  }
  if (status) where.status = status;

  const [daftar, pelanggan, layanan, setting] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        pelanggan: { select: { nama: true, perusahaan: true } },
        items: true,
        pembayaran: { select: { jumlah: true } },
      },
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    }),
    prisma.pelanggan.findMany({ orderBy: { nama: "asc" } }),
    prisma.layanan.findMany({
      include: { pelanggan: { select: { nama: true } } },
      orderBy: { nama: "asc" },
    }),
    prisma.setting.findFirst(),
  ]);

  const serial = daftar.map((inv) => ({
    id: inv.id,
    nomor: inv.nomor,
    pelangganId: inv.pelangganId,
    layananId: inv.layananId,
    pelangganNama: inv.pelanggan.nama,
    pelangganPerusahaan: inv.pelanggan.perusahaan,
    tanggal: inv.tanggal.toISOString(),
    jatuhTempo: inv.jatuhTempo ? inv.jatuhTempo.toISOString() : null,
    status: inv.status,
    diskonPersen: inv.diskonPersen,
    ppnPersen: inv.ppnPersen,
    dibuatOtomatis: inv.dibuatOtomatis,
    items: inv.items.map((it) => ({
      deskripsi: it.deskripsi,
      qty: it.qty,
      hargaSatuan: it.hargaSatuan,
    })),
    totalDibayar: inv.pembayaran.reduce((acc, p) => acc + p.jumlah, 0),
  }));

  return (
    <InvoiceClient
      daftar={serial}
      pelanggan={pelanggan.map((p) => ({ id: p.id, nama: p.nama }))}
      layanan={layanan.map((l) => ({
        id: l.id,
        pelangganId: l.pelangganId,
        pelangganNama: l.pelanggan.nama,
        nama: l.nama,
        harga: l.harga,
        periode: l.periode,
      }))}
      ppnDefault={setting?.ppnDefault ?? 0}
      jatuhTempoHari={setting?.jatuhTempoHari ?? 7}
      q={q}
      statusFilter={status}
    />
  );
}
