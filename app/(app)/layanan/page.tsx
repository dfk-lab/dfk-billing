import { prisma } from "@/lib/prisma";
import LayananClient from "./LayananClient";

export const instant = false;

export default async function LayananPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const [daftar, pelanggan] = await Promise.all([
    prisma.layanan.findMany({
      where: q
        ? {
            OR: [
              { nama: { contains: q } },
              { deskripsi: { contains: q } },
              { pelanggan: { nama: { contains: q } } },
            ],
          }
        : undefined,
      include: { pelanggan: { select: { nama: true } } },
      orderBy: [{ status: "asc" }, { tanggalAkhir: "asc" }],
    }),
    prisma.pelanggan.findMany({ orderBy: { nama: "asc" } }),
  ]);

  const serial = daftar.map((l) => ({
    id: l.id,
    pelangganId: l.pelangganId,
    pelangganNama: l.pelanggan.nama,
    nama: l.nama,
    deskripsi: l.deskripsi,
    harga: l.harga,
    periode: l.periode,
    tanggalMulai: l.tanggalMulai.toISOString(),
    tanggalAkhir: l.tanggalAkhir ? l.tanggalAkhir.toISOString() : null,
    status: l.status,
    perpanjangOtomatis: l.perpanjangOtomatis,
  }));

  return (
    <LayananClient
      daftar={serial}
      pelanggan={pelanggan.map((p) => ({ id: p.id, nama: p.nama }))}
      q={q}
    />
  );
}
