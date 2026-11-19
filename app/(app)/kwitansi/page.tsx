import { prisma } from "@/lib/prisma";
import KwitansiClient from "./KwitansiClient";

export const instant = false;

export default async function KwitansiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";

  const daftar = await prisma.kwitansi.findMany({
    where: q
      ? {
          OR: [
            { nomor: { contains: q } },
            { pembayaran: { invoice: { nomor: { contains: q } } } },
            { pembayaran: { invoice: { pelanggan: { nama: { contains: q } } } } },
            {
              pembayaran: {
                invoice: { pelanggan: { perusahaan: { contains: q } } },
              },
            },
          ],
        }
      : undefined,
    include: {
      pembayaran: {
        select: {
          id: true,
          jumlah: true,
          tanggal: true,
          metode: true,
          catatan: true,
          invoice: {
            select: {
              id: true,
              nomor: true,
              pelanggan: { select: { nama: true, perusahaan: true } },
            },
          },
        },
      },
    },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
  });

  const serial = daftar.map((k) => ({
    id: k.id,
    nomor: k.nomor,
    penerima: k.penerima,
    pembayaranId: k.pembayaran.id,
    jumlah: k.pembayaran.jumlah,
    tanggal: k.pembayaran.tanggal.toISOString(),
    metode: k.pembayaran.metode,
    invoiceNomor: k.pembayaran.invoice.nomor,
    invoiceId: k.pembayaran.invoice.id,
    pelangganNama: k.pembayaran.invoice.pelanggan.nama,
    pelangganPerusahaan: k.pembayaran.invoice.pelanggan.perusahaan,
  }));

  return <KwitansiClient daftar={serial} q={q} />;
}
