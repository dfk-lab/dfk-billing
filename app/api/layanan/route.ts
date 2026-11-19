import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataLayanan } from "@/lib/layanan";

export async function GET(request: Request) {
  await connection();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const daftar = await prisma.layanan.findMany({
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
  });
  return NextResponse.json(daftar);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { error, data } = dataLayanan(body);
  if (error.length > 0) {
    return NextResponse.json({ error: error.join(" ") }, { status: 400 });
  }
  try {
    const layanan = await prisma.layanan.create({ data });
    return NextResponse.json(layanan, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 400 }
    );
  }
}
