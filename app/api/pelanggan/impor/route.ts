import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataPelanggan } from "@/lib/pelanggan";

const MAKS_BARIS = 500;

export async function POST(request: Request) {
  const body = (await request.json()) as { baris?: unknown };
  if (!Array.isArray(body.baris)) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const baris = body.baris.slice(0, MAKS_BARIS);
  const hasil = { berhasil: 0, gagal: 0, detail: [] as string[] };
  for (const b of baris) {
    const data = dataPelanggan((b ?? {}) as Record<string, unknown>);
    if (!data.nama) {
      hasil.gagal++;
      hasil.detail.push("Baris tanpa nama dilewati.");
      continue;
    }
    try {
      await prisma.pelanggan.create({ data });
      hasil.berhasil++;
    } catch {
      hasil.gagal++;
      hasil.detail.push(`Gagal menyimpan: ${data.nama}`);
    }
  }
  if (Array.isArray(body.baris) && body.baris.length > MAKS_BARIS) {
    hasil.detail.push(
      `Hanya ${MAKS_BARIS} baris pertama yang diproses.`
    );
  }
  return NextResponse.json(hasil);
}
