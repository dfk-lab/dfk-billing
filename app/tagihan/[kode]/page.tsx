import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal, hitungTotal } from "@/lib/format";

export const instant = false;

function badgeStatus(status: string, lunas: boolean, tempoLewat: boolean) {
  if (lunas)
    return { label: "LUNAS", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" };
  if (tempoLewat)
    return { label: "TERLAMBAT", cls: "border-rose-300 bg-rose-50 text-rose-700" };
  if (status === "DRAFT")
    return { label: "DRAFT", cls: "border-zinc-300 bg-zinc-100 text-zinc-600" };
  return { label: "BELUM DIBAYAR", cls: "border-amber-300 bg-amber-50 text-amber-700" };
}

export default async function TagihanPublikPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  if (!/^[0-9a-f]{32}$/.test(kode)) notFound();

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
  if (!invoice || invoice.status === "DRAFT") notFound();

  const s = setting ?? {
    namaUsaha: "DFK Billing",
    alamat: null,
    telepon: null,
    email: null,
    namaBank: null,
    noRekening: null,
    atasNamaRekening: null,
    gambarQris: null,
    footerDokumen: null,
  };

  const { subtotal, diskon, ppn, total } = hitungTotal(
    invoice.items,
    invoice.diskonPersen,
    invoice.ppnPersen
  );
  const dibayar = invoice.pembayaran.reduce((a, p) => a + p.jumlah, 0);
  const sisa = Math.max(total - dibayar, 0);
  const lunas = total > 0 && dibayar >= total;
  const tempoLewat =
    !lunas && invoice.jatuhTempo
      ? new Date(invoice.jatuhTempo).getTime() < Date.now()
      : false;
  const badge = badgeStatus(invoice.status, lunas, tempoLewat);
  const bankAda = s.namaBank || s.noRekening || s.atasNamaRekening;
  const pembayaranAda = bankAda || s.gambarQris;

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-[210mm]">
        {/* Bar aksi */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${badge.cls}`}
          >
            {badge.label}
          </span>
          <a
            href={`/api/tagihan/${kode}/pdf`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
          >
            Unduh PDF
          </a>
        </div>

        <div className="rounded-lg bg-white p-6 text-[11pt] leading-relaxed text-zinc-900 shadow-lg sm:p-[15mm]">
          {/* Header */}
          <div className="flex flex-col gap-4 border-b-2 border-zinc-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/logo" alt="Logo" className="h-12 w-12 object-contain" />
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
            <div className="sm:text-right">
              <p className="text-2xl font-bold tracking-wide">INVOICE</p>
              <p className="mt-1 font-medium">{invoice.nomor}</p>
            </div>
          </div>

          {/* Info pelanggan & tanggal */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div>
              <p className="text-[9pt] font-semibold uppercase tracking-wide text-zinc-500">
                Kepada
              </p>
              <p className="mt-1 font-semibold">{invoice.pelanggan.nama}</p>
              {invoice.pelanggan.perusahaan && (
                <p className="text-zinc-600">{invoice.pelanggan.perusahaan}</p>
              )}
              {invoice.pelanggan.alamat && (
                <p className="text-[9.5pt] text-zinc-600">
                  {invoice.pelanggan.alamat}
                </p>
              )}
              {invoice.pelanggan.telepon && (
                <p className="text-[9.5pt] text-zinc-600">
                  {invoice.pelanggan.telepon}
                </p>
              )}
            </div>
            <div className="space-y-1 sm:text-right">
              <p>
                <span className="text-zinc-500">Tanggal: </span>
                {formatTanggal(invoice.tanggal.toISOString())}
              </p>
              <p>
                <span className="text-zinc-500">Jatuh tempo: </span>
                {invoice.jatuhTempo
                  ? formatTanggal(invoice.jatuhTempo.toISOString())
                  : "—"}
              </p>
              {invoice.layanan && (
                <p>
                  <span className="text-zinc-500">Layanan: </span>
                  {invoice.layanan.nama}
                </p>
              )}
            </div>
          </div>

          {/* Tabel item */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[10.5pt]">
              <thead>
                <tr className="bg-zinc-100 text-left">
                  <th className="border border-zinc-300 px-3 py-2 font-semibold">
                    Deskripsi
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">
                    Qty
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">
                    Harga satuan
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="border border-zinc-300 px-3 py-2 align-top">
                      {it.deskripsi}
                    </td>
                    <td className="border border-zinc-300 px-3 py-2 text-right align-top">
                      {Number.isInteger(it.qty)
                        ? it.qty
                        : it.qty.toLocaleString("id-ID", {
                            maximumFractionDigits: 2,
                          })}
                    </td>
                    <td className="border border-zinc-300 px-3 py-2 text-right align-top">
                      {formatRupiah(it.hargaSatuan)}
                    </td>
                    <td className="border border-zinc-300 px-3 py-2 text-right align-top">
                      {formatRupiah(it.qty * it.hargaSatuan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ringkasan */}
          <div className="mt-4 flex justify-end">
            <table className="w-full text-[10.5pt] sm:w-[70mm]">
              <tbody>
                <tr>
                  <td className="py-1 text-zinc-600">Subtotal</td>
                  <td className="py-1 text-right">{formatRupiah(subtotal)}</td>
                </tr>
                {diskon > 0 && (
                  <tr>
                    <td className="py-1 text-zinc-600">
                      Diskon ({invoice.diskonPersen}%)
                    </td>
                    <td className="py-1 text-right">−{formatRupiah(diskon)}</td>
                  </tr>
                )}
                {ppn > 0 && (
                  <tr>
                    <td className="py-1 text-zinc-600">PPN ({invoice.ppnPersen}%)</td>
                    <td className="py-1 text-right">{formatRupiah(ppn)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-zinc-800 text-base font-bold">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right">{formatRupiah(total)}</td>
                </tr>
                {dibayar > 0 && (
                  <>
                    <tr>
                      <td className="py-1 text-zinc-600">Dibayar</td>
                      <td className="py-1 text-right text-zinc-600">
                        {formatRupiah(dibayar)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold">Sisa</td>
                      <td className="py-1 text-right font-semibold">
                        {formatRupiah(sisa)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Catatan */}
          {invoice.catatan && (
            <div className="mt-4">
              <p className="text-[9pt] font-semibold uppercase tracking-wide text-zinc-500">
                Catatan
              </p>
              <p className="text-[9.5pt] text-zinc-700">{invoice.catatan}</p>
            </div>
          )}

          {/* Pembayaran */}
          {pembayaranAda && (
            <div className="mt-6 border border-zinc-300 bg-zinc-50 px-4 py-3 text-[10pt]">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {bankAda
                      ? "Pembayaran via transfer bank:"
                      : "Pembayaran via QRIS:"}
                  </p>
                  {bankAda && (
                    <p className="mt-0.5">
                      {[s.namaBank, s.noRekening].filter(Boolean).join(" — ")}
                      {s.atasNamaRekening ? ` a.n. ${s.atasNamaRekening}` : ""}
                    </p>
                  )}
                  {s.gambarQris && (
                    <p className="mt-1 text-zinc-600">
                      Atau scan kode QRIS di samping menggunakan aplikasi
                      pembayaran apa pun.
                    </p>
                  )}
                </div>
                {s.gambarQris && (
                  <div className="shrink-0 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.gambarQris}
                      alt="QRIS"
                      className="h-[28mm] w-[28mm] object-contain"
                    />
                    <p className="text-[8pt] font-medium text-zinc-500">
                      Scan QRIS
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          {s.footerDokumen && (
            <p className="mt-10 border-t border-zinc-200 pt-3 text-center text-[9pt] text-zinc-500">
              {s.footerDokumen}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Halaman ini menampilkan tagihan {s.namaUsaha} yang sah. Hubungi{" "}
          {s.telepon || s.email || "kami"} bila ada pertanyaan.
        </p>
      </div>
    </div>
  );
}
