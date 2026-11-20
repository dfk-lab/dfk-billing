import { prisma } from "@/lib/prisma";
import { buatInvoicePdf } from "@/lib/pdf";

type Konteks = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return new Response("ID tidak valid", { status: 400 });
  }
  const [invoice, setting] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        pelanggan: true,
        layanan: { select: { nama: true } },
        items: { orderBy: { id: "asc" } },
        pembayaran: { select: { jumlah: true } },
      },
    }),
    prisma.setting.findFirst(),
  ]);
  if (!invoice) {
    return new Response("Invoice tidak ditemukan", { status: 404 });
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
