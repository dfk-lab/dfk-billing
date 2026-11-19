import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataInvoice, nomorInvoiceBerikutnya } from "@/lib/invoice";

export async function GET(request: Request) {
  await connection();
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status")?.trim() ?? "";
  const pelangganParam = sp.get("pelangganId");

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
  if (
    pelangganParam !== null &&
    pelangganParam !== "" &&
    Number.isInteger(Number(pelangganParam))
  ) {
    where.pelangganId = Number(pelangganParam);
  }

  const daftar = await prisma.invoice.findMany({
    where,
    include: {
      pelanggan: { select: { nama: true, perusahaan: true } },
      items: true,
      pembayaran: { select: { jumlah: true } },
    },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
  });
  return NextResponse.json(daftar);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { error, data } = dataInvoice(body);
  if (error.length > 0) {
    return NextResponse.json({ error: error.join(" ") }, { status: 400 });
  }
  const { items, ...dataUtama } = data;
  try {
    const nomor = await nomorInvoiceBerikutnya();
    const invoice = await prisma.invoice.create({
      data: {
        ...dataUtama,
        nomor,
        items: { create: items },
      },
      include: { items: true, pembayaran: true },
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Pelanggan atau layanan tidak ditemukan." },
      { status: 400 }
    );
  }
}
