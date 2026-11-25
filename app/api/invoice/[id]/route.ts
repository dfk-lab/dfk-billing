import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataInvoice } from "@/lib/invoice";

type Konteks = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      pelanggan: true,
      layanan: { select: { id: true, nama: true } },
      items: true,
      pembayaran: { include: { kwitansi: { select: { nomor: true } } } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json(invoice);
}

export async function PUT(request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const { error, data } = dataInvoice(body);
  if (error.length > 0) {
    return NextResponse.json({ error: error.join(" ") }, { status: 400 });
  }
  const { items, ...dataUtama } = data;
  const existing = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
  }
  if (existing.status === "TERKIRIM" && dataUtama.status === "DRAFT") {
    return NextResponse.json(
      { error: "Invoice sudah terbit — tidak bisa kembali menjadi draft." },
      { status: 400 }
    );
  }
  try {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...dataUtama,
        items: { deleteMany: {}, create: items },
      },
      include: { items: true, pembayaran: true },
    });
    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json(
      { error: "Invoice, pelanggan, atau layanan tidak ditemukan." },
      { status: 404 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  try {
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invoice tidak ditemukan." },
      { status: 404 }
    );
  }
}
