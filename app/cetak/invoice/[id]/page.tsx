import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal, hitungTotal } from "@/lib/format";
import TombolCetak from "../../TombolCetak";

export const instant = false;

export default async function CetakInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

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
  if (!invoice) notFound();

  const s = setting ?? {
    namaUsaha: "DFK Billing",
    namaPemilik: null,
    alamat: null,
    telepon: null,
    email: null,
    logo: null,
    namaBank: null,
    noRekening: null,
    atasNamaRekening: null,
    gambarTandaTangan: null,
    footerDokumen: null,
  };

  const { subtotal, diskon, ppn, total } = hitungTotal(
    invoice.items,
    invoice.diskonPersen,
    invoice.ppnPersen
  );
  const dibayar = invoice.pembayaran.reduce((acc, p) => acc + p.jumlah, 0);
  const sisa = Math.max(total - dibayar, 0);
  const bankAda = s.namaBank || s.noRekening || s.atasNamaRekening;

  return (
    <div data-tema="gelap" className="kertas-wrap min-h-screen overflow-x-auto bg-zinc-100 p-6">
      <TombolCetak kembaliKe={`/invoice/${invoice.id}`} />
      <div className="kertas mx-auto w-[210mm] rounded-lg bg-white p-[15mm] text-[11pt] leading-relaxed text-zinc-900 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-zinc-800 pb-4">
          <div className="flex items-start gap-3">
            {s.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt="Logo" className="h-14 w-14 object-contain" />
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
            <p className="text-2xl font-bold tracking-wide">INVOICE</p>
            <p className="mt-1 font-medium">{invoice.nomor}</p>
          </div>
        </div>

        {/* Info pelanggan & tanggal */}
        <div className="mt-6 flex justify-between gap-6">
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
          <div className="space-y-1 text-right">
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
        <table className="mt-6 w-full border-collapse text-[10.5pt]">
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
                    : it.qty.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
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

        {/* Ringkasan */}
        <div className="mt-4 flex justify-end">
          <table className="w-[70mm] text-[10.5pt]">
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

        {/* Bank */}
        {bankAda && (
          <div className="mt-6 border border-zinc-300 bg-zinc-50 px-4 py-3 text-[10pt]">
            <p className="font-semibold">Pembayaran via transfer bank:</p>
            <p className="mt-0.5">
              {[s.namaBank, s.noRekening].filter(Boolean).join(" — ")}
              {s.atasNamaRekening ? ` a.n. ${s.atasNamaRekening}` : ""}
            </p>
          </div>
        )}

        {/* Tanda tangan */}
        <div className="mt-10 flex justify-end">
          <div className="w-[70mm] text-center">
            <p className="text-zinc-600">Hormat kami,</p>
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
              {s.namaPemilik || s.namaUsaha}
            </p>
          </div>
        </div>

        {/* Footer */}
        {s.footerDokumen && (
          <p className="mt-10 border-t border-zinc-200 pt-3 text-center text-[9pt] text-zinc-500">
            {s.footerDokumen}
          </p>
        )}
      </div>
    </div>
  );
}
