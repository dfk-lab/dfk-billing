import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataPembayaran, nomorKwitansiBerikutnya } from "@/lib/pembayaran";
import { waPembayaranDiterima } from "@/lib/wa";

type Konteks = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Konteks) {
  const invoiceId = Number((await params).id);
  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const { error, data } = dataPembayaran(body);
  if (error.length > 0) {
    return NextResponse.json({ error: error.join(" ") }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { pembayaran: { select: { jumlah: true } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
  }

  const nomor = await nomorKwitansiBerikutnya();
  let penerima = data.penerima;
  if (!penerima) {
    const setting = await prisma.setting.findFirst();
    penerima = setting?.namaPemilik?.trim() || null;
  }

  const pembayaran = await prisma.pembayaran.create({
    data: {
      invoiceId,
      jumlah: data.jumlah,
      tanggal: data.tanggal,
      metode: data.metode,
      catatan: data.catatan,
      kwitansi: { create: { nomor, penerima } },
    },
    include: { kwitansi: true },
  });
  void waPembayaranDiterima(pembayaran.id).catch(() => {});
  return NextResponse.json(pembayaran, { status: 201 });
}
