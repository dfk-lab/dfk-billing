import { prisma } from "@/lib/prisma";
import { buatInvoicePdf } from "@/lib/pdf";

type Konteks = { params: Promise<{ kode: string }> };

// PDF invoice via tautan publik — hanya non-draft, dicari lewat kodeTagihan
export async function GET(_request: Request, { params }: Konteks) {
  const { kode } = await params;
  if (!/^[0-9a-f]{32}$/.test(kode)) {
    return new Response("Kode tidak valid", { status: 400 });
  }
  const [invoice, setting] = await Promise.all([
    prisma.invoice.findUnique({
      where: { kodeTagihan: kode },
      include: {
        pelanggan: true,
        layanan: { select: { nama: true } },
        items: { orderBy: { id: "asc" } },
        pembayaran: { select: { jumlah: true } },
      },
    }),
    prisma.setting.findFirst(),
  ]);
  if (!invoice || invoice.status === "DRAFT") {
    return new Response("Tagihan tidak ditemukan", { status: 404 });
  }

  const pdf = await buatInvoicePdf(invoice, setting ?? {});
  const namaFile = `${invoice.nomor.replace(/[\/\\]/g, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
