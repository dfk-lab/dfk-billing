import { prisma } from "@/lib/prisma";

export async function dumpCadangan() {
  return {
    versi: 1,
    aplikasi: "DFK Billing",
    dieksporPada: new Date().toISOString(),
    setting: await prisma.setting.findFirst(),
    pengguna: await prisma.pengguna.findMany(),
    pelanggan: await prisma.pelanggan.findMany(),
    layanan: await prisma.layanan.findMany(),
    invoice: await prisma.invoice.findMany({ include: { items: true } }),
    pembayaran: await prisma.pembayaran.findMany(),
    kwitansi: await prisma.kwitansi.findMany(),
  };
}
