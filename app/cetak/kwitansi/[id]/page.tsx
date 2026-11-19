import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal, LABEL_METODE } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";
import TombolCetak from "../../TombolCetak";

export const instant = false;

export default async function CetakKwitansiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

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
  if (!kwitansi) notFound();

  const s = setting ?? {
    namaUsaha: "DFK Billing",
    alamat: null,
    telepon: null,
    email: null,
    logo: null,
    gambarTandaTangan: null,
    catatanKwitansi: null,
    footerDokumen: null,
  };
  const p = kwitansi.pembayaran;

  return (
    <div className="kertas-wrap min-h-screen overflow-x-auto bg-zinc-100 p-6">
      <TombolCetak kembaliKe="/kwitansi" />
      <div className="kertas mx-auto w-[210mm] rounded-lg bg-white p-[15mm] text-[11pt] leading-relaxed text-zinc-900 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-zinc-800 pb-4">
          <div className="flex items-start gap-3">
            {s.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt="Logo" className="h-12 w-12 object-contain" />
            )}
            <div>
              <p className="text-base font-bold">{s.namaUsaha}</p>
              {s.alamat && (
                <p className="text-[9.5pt] text-zinc-600">{s.alamat}</p>
              )}
              <p className="text-[9.5pt] text-zinc-600">
                {[s.telepon, s.email].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-wide">KWITANSI</p>
            <p className="mt-1 font-medium">No. {kwitansi.nomor}</p>
          </div>
        </div>

        {/* Isi kwitansi */}
        <div className="mt-8 space-y-5">
          <div className="flex gap-4">
            <span className="w-[42mm] shrink-0 text-zinc-500">
              Telah terima pembayaran dari
            </span>
            <span className="flex-1 border-b border-dotted border-zinc-400 font-semibold">
              {p.invoice.pelanggan.nama}
              {p.invoice.pelanggan.perusahaan
                ? ` (${p.invoice.pelanggan.perusahaan})`
                : ""}
            </span>
          </div>
          <div className="flex gap-4">
            <span className="w-[42mm] shrink-0 text-zinc-500">
              Sejumlah uang
            </span>
            <span className="flex-1 border-b border-dotted border-zinc-400 font-bold">
              {formatRupiah(p.jumlah)}
            </span>
          </div>
          <p className="italic text-zinc-700">
            Terbilang: {terbilangRupiah(p.jumlah)}
          </p>
          <div className="flex gap-4">
            <span className="w-[42mm] shrink-0 text-zinc-500">
              Untuk pembayaran
            </span>
            <span className="flex-1 border-b border-dotted border-zinc-400">
              Invoice {p.invoice.nomor}
              {p.invoice.items.length > 0
                ? ` — ${p.invoice.items.map((it) => it.deskripsi).join(", ")}`
                : ""}
              {p.metode ? ` (${LABEL_METODE[p.metode] ?? p.metode})` : ""}
            </span>
          </div>
          <div className="flex gap-4">
            <span className="w-[42mm] shrink-0 text-zinc-500">Tanggal</span>
            <span className="flex-1 border-b border-dotted border-zinc-400">
              {formatTanggal(kwitansi.tanggal.toISOString())}
            </span>
          </div>
        </div>

        {/* Penerima */}
        <div className="mt-12 flex justify-end">
          <div className="w-[70mm] text-center">
            <p className="text-zinc-600">Penerima,</p>
            {s.gambarTandaTangan && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.gambarTandaTangan}
                alt="Tanda tangan"
                className="mx-auto h-[18mm] object-contain"
              />
            )}
            <div className="mx-auto mt-1 w-[55mm] border-t border-zinc-400" />
            <p className="mt-1 font-semibold">
              {kwitansi.penerima || s.namaUsaha}
            </p>
          </div>
        </div>

        {/* Catatan kwitansi */}
        {s.catatanKwitansi && (
          <p className="mt-8 text-[9.5pt] italic text-zinc-500">
            {s.catatanKwitansi}
          </p>
        )}

        {/* Footer */}
        {s.footerDokumen && (
          <p className="mt-8 border-t border-zinc-200 pt-3 text-center text-[9pt] text-zinc-500">
            {s.footerDokumen}
          </p>
        )}
      </div>
    </div>
  );
}
