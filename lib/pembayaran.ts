import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const METODE = ["TUNAI", "TRANSFER", "QRIS", "LAINNYA"];

function parseTanggal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dataPembayaran(body: Record<string, unknown>) {
  const error: string[] = [];
  const jumlah = Number(body.jumlah);
  if (!Number.isInteger(jumlah) || jumlah <= 0)
    error.push("Jumlah pembayaran harus angka lebih dari 0.");
  const tanggal =
    typeof body.tanggal === "string" && body.tanggal !== ""
      ? parseTanggal(body.tanggal)
      : new Date();
  if (typeof body.tanggal === "string" && body.tanggal !== "" && !tanggal)
    error.push("Tanggal pembayaran tidak valid.");
  const metode =
    typeof body.metode === "string" && METODE.includes(body.metode)
      ? body.metode
      : "TRANSFER";
  const catatan =
    typeof body.catatan === "string" && body.catatan.trim() !== ""
      ? body.catatan.trim()
      : null;
  const penerima =
    typeof body.penerima === "string" && body.penerima.trim() !== ""
      ? body.penerima.trim()
      : null;

  return {
    error,
    data: { jumlah, tanggal: tanggal as Date, metode, catatan, penerima },
  };
}

export async function nomorKwitansiBerikutnya() {
  const setting =
    (await prisma.setting.findFirst()) ?? (await prisma.setting.create({ data: {} }));
  const prefix = setting.prefixKwitansi.trim() || "KWT";
  const kini = new Date();
  const ym = `${kini.getUTCFullYear()}${String(kini.getUTCMonth() + 1).padStart(2, "0")}`;
  const awalan = `${prefix}/${ym}/`;
  const terakhir = await prisma.kwitansi.findFirst({
    where: { nomor: { startsWith: awalan } },
    orderBy: { nomor: "desc" },
  });
  let urut = 1;
  if (terakhir) {
    const n = Number(terakhir.nomor.slice(awalan.length));
    if (Number.isFinite(n)) urut = n + 1;
  }
  return `${awalan}${String(urut).padStart(4, "0")}`;
}

export async function buatPembayaranDenganKwitansi(
  invoiceId: number,
  data: { jumlah: number; tanggal: Date; metode: string; catatan: string | null; penerima: string | null }
) {
  const { penerima, ...pembayaranData } = data;
  for (let i = 0; i < 5; i++) {
    try {
      const nomor = await nomorKwitansiBerikutnya();
      return await prisma.pembayaran.create({
        data: {
          ...pembayaranData,
          invoiceId,
          kwitansi: { create: { nomor, penerima } },
        },
        include: { kwitansi: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && i < 4)
        continue;
      throw e;
    }
  }
  throw new Error("Nomor kwitansi tidak dapat dibuat — coba lagi.");
}
