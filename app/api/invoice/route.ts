import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dataInvoice, nomorInvoiceBerikutnya } from "@/lib/invoice";
import { kodeTagihanBaru } from "@/lib/tagihan";
import { waInvoiceBaru } from "@/lib/wa";

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
  let terakhir: unknown = null;
  for (let i = 0; i < 5; i++) {
    try {
      const nomor = await nomorInvoiceBerikutnya();
      const invoice = await prisma.invoice.create({
        data: {
          ...dataUtama,
          nomor,
          kodeTagihan: kodeTagihanBaru(),
          items: { create: items },
        },
        include: { items: true, pembayaran: true },
      });
      if (invoice.status !== "DRAFT") {
        void waInvoiceBaru(invoice.id).catch(() => {});
      }
      return NextResponse.json(invoice, { status: 201 });
    } catch (e) {
      terakhir = e;
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === "P2002" || e.code === "P2003") &&
        i < 4
      )
        continue;
      break;
    }
  }
  if (
    terakhir instanceof Prisma.PrismaClientKnownRequestError &&
    terakhir.code === "P2002"
  ) {
    return NextResponse.json(
      { error: "Terjadi tabrakan nomor dokumen — coba lagi." },
      { status: 400 }
    );
  }
  return NextResponse.json(
    { error: "Pelanggan atau layanan tidak ditemukan." },
    { status: 400 }
  );
}
