import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  await connection();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

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
          jumlah: true,
          tanggal: true,
          metode: true,
          catatan: true,
          invoice: {
            select: { nomor: true, pelanggan: { select: { nama: true, perusahaan: true } } },
          },
        },
      },
    },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
  });
  return NextResponse.json(daftar);
}
