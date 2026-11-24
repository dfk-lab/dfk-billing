import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import WaRiwayat from "./WaRiwayat";

export const instant = false;

export default async function WaPage() {
  await connection();
  const batas30Hari = new Date(Date.now() - 30 * 86400000);

  const [riwayat, terkirim30, gagal30, dihubungi30] = await Promise.all([
    prisma.pesanWa.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.pesanWa.count({
      where: { status: "TERKIRIM", createdAt: { gte: batas30Hari } },
    }),
    prisma.pesanWa.count({
      where: { status: "GAGAL", createdAt: { gte: batas30Hari } },
    }),
    prisma.pesanWa.findMany({
      where: { status: "TERKIRIM", createdAt: { gte: batas30Hari } },
      distinct: ["nomorTujuan"],
      select: { nomorTujuan: true },
    }),
  ]);

  const daftar = riwayat.map((r) => ({
    id: r.id,
    jenis: r.jenis,
    status: r.status,
    nomorTujuan: r.nomorTujuan,
    pesan: r.pesan,
    namaPelanggan: r.namaPelanggan,
    nomorInvoice: r.nomorInvoice,
    nomorKwitansi: r.nomorKwitansi,
    keterangan: r.keterangan,
    waktu: r.createdAt.toISOString(),
  }));

  const ringkasan = [
    {
      label: "Terkirim 30 hari",
      nilai: terkirim30,
      catatan: "Pesan WhatsApp berhasil dikirim",
      kelas: "text-emerald-300",
    },
    {
      label: "Gagal 30 hari",
      nilai: gagal30,
      catatan: "Pengiriman tidak berhasil",
      kelas: "text-rose-300",
    },
    {
      label: "Nomor dihubungi",
      nilai: dihubungi30.length,
      catatan: "Nomor berbeda yang menerima pesan",
      kelas: "text-cyan-300",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Notifikasi WhatsApp
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Riwayat pesan yang dikirim ke pelanggan — periksa dulu di sini siapa
          yang sudah dihubungi sebelum mengirim ulang.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ringkasan.map((r) => (
          <div key={r.label} className="kaca p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {r.label}
            </p>
            <p className={`angka mt-2 text-3xl font-bold ${r.kelas}`}>
              {r.nilai}
            </p>
            <p className="mt-1 text-xs text-slate-500">{r.catatan}</p>
          </div>
        ))}
      </div>

      <WaRiwayat daftar={daftar} />
    </div>
  );
}
