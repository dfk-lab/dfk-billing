import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataPelanggan } from "@/lib/pelanggan";

export async function GET(request: Request) {
  await connection();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const daftar = await prisma.pelanggan.findMany({
    where: q
      ? {
          OR: [
            { nama: { contains: q } },
            { perusahaan: { contains: q } },
            { telepon: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(daftar);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const data = dataPelanggan(body);
  if (!data.nama) {
    return NextResponse.json(
      { error: "Nama pelanggan wajib diisi." },
      { status: 400 }
    );
  }
  const pelanggan = await prisma.pelanggan.create({ data });
  return NextResponse.json(pelanggan, { status: 201 });
}
