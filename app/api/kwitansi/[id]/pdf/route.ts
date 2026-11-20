import { prisma } from "@/lib/prisma";
import { buatKwitansiPdf } from "@/lib/pdf";

type Konteks = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return new Response("ID tidak valid", { status: 400 });
  }
  const [kwitansi, setting] = await Promise.all([
    prisma.kwitansi.findUnique({
      where: { id },
      include: {
        pembayaran: {
          include: {
            invoice: { include: { pelanggan: true, items: true } },
          },
        },
      },
    }),
    prisma.setting.findFirst(),
  ]);
  if (!kwitansi) {
    return new Response("Kwitansi tidak ditemukan", { status: 404 });
  }

  const pdf = await buatKwitansiPdf(kwitansi, setting ?? {});
  const namaFile = `${kwitansi.nomor.replace(/[\/\\]/g, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
