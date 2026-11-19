import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal, hitungTotal, LABEL_METODE } from "@/lib/format";
import PanelPembayaran, { HapusPembayaran } from "./PembayaranKontrol";

export const instant = false;

function badgeStatus(
  status: string,
  lunas: boolean,
  jatuhTempoLewat: boolean
): { label: string; cls: string } {
  if (status === "DRAFT") return { label: "Draft", cls: "badge-slate" };
  if (lunas) return { label: "Lunas", cls: "badge-cyan" };
  if (jatuhTempoLewat) return { label: "Jatuh tempo", cls: "badge-rose" };
  return { label: "Terkirim", cls: "badge-amber" };
}

export default async function DetailInvoicePage({
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
        layanan: { select: { id: true, nama: true } },
        items: { orderBy: { id: "asc" } },
        pembayaran: {
          orderBy: { tanggal: "desc" },
          include: { kwitansi: { select: { nomor: true } } },
        },
      },
    }),
    prisma.setting.findFirst(),
  ]);
  if (!invoice) notFound();

  const { subtotal, diskon, ppn, total } = hitungTotal(
    invoice.items,
    invoice.diskonPersen,
    invoice.ppnPersen
  );
  const dibayar = invoice.pembayaran.reduce((acc, p) => acc + p.jumlah, 0);
  const sisa = total - dibayar;
  const lunas = total > 0 && dibayar >= total;
  const tempoLewat = invoice.jatuhTempo
    ? new Date(invoice.jatuhTempo).getTime() < Date.now()
    : false;
  const badge = badgeStatus(invoice.status, lunas, tempoLewat);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/invoice"
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            ← Kembali ke daftar invoice
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {invoice.nomor}
            <span className={`badge ${badge.cls}`}>
              {badge.label}
            </span>
            {invoice.dibuatOtomatis && (
              <span className="badge badge-slate">
                otomatis
              </span>
            )}
          </h1>
        </div>
        <a
          href={`/cetak/invoice/${invoice.id}`}
          target="_blank"
          className="tombol-utama"
        >
          Cetak invoice
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="kaca p-6">
            <h2 className="text-sm font-semibold text-slate-100">Informasi</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Pelanggan
                </dt>
                <dd className="mt-1 text-sm">
                  <p className="font-medium">{invoice.pelanggan.nama}</p>
                  {invoice.pelanggan.perusahaan && (
                    <p className="text-slate-500">{invoice.pelanggan.perusahaan}</p>
                  )}
                  {invoice.pelanggan.alamat && (
                    <p className="mt-1 text-xs text-slate-500">
                      {invoice.pelanggan.alamat}
                    </p>
                  )}
                  {invoice.pelanggan.telepon && (
                    <p className="text-xs text-slate-500">
                      {invoice.pelanggan.telepon}
                    </p>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Tanggal
                </dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {formatTanggal(invoice.tanggal.toISOString())}
                </dd>
                <dt className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                  Jatuh tempo
                </dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {invoice.jatuhTempo
                    ? formatTanggal(invoice.jatuhTempo.toISOString())
                    : "—"}
                </dd>
                {invoice.layanan && (
                  <>
                    <dt className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                      Layanan
                    </dt>
                    <dd className="mt-1 text-sm text-slate-200">
                      {invoice.layanan.nama}
                    </dd>
                  </>
                )}
              </div>
            </dl>
            {invoice.catatan && (
              <div className="mt-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Catatan
                </dt>
                <dd className="mt-1 text-sm text-slate-200">{invoice.catatan}</dd>
              </div>
            )}
          </div>

          <div className="kaca">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-100">Item tagihan</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="tabel min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 font-medium">Deskripsi</th>
                    <th className="px-6 py-3 font-medium text-right">Qty</th>
                    <th className="px-6 py-3 font-medium text-right">Harga satuan</th>
                    <th className="px-6 py-3 font-medium text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it) => (
                    <tr key={it.id} className="border-b border-white/10 last:border-0">
                      <td className="px-6 py-3">{it.deskripsi}</td>
                      <td className="px-6 py-3 text-right text-slate-400">
                        {Number.isInteger(it.qty)
                          ? it.qty
                          : it.qty.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-slate-400">
                        {formatRupiah(it.hargaSatuan)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        {formatRupiah(it.qty * it.hargaSatuan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="kaca p-6">
            <h2 className="text-sm font-semibold text-slate-100">Ringkasan</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              {diskon > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Diskon ({invoice.diskonPersen}%)</span>
                  <span>−{formatRupiah(diskon)}</span>
                </div>
              )}
              {ppn > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>PPN ({invoice.ppnPersen}%)</span>
                  <span>{formatRupiah(ppn)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
              <div className="flex justify-between text-emerald-300">
                <span>Dibayar</span>
                <span>{formatRupiah(dibayar)}</span>
              </div>
              <div
                className={`flex justify-between font-semibold ${
                  sisa > 0 ? "text-rose-400" : "text-emerald-300"
                }`}
              >
                <span>Sisa</span>
                <span>{formatRupiah(Math.max(sisa, 0))}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <PanelPembayaran
              invoiceId={invoice.id}
              sisa={sisa}
              namaPemilik={setting?.namaPemilik ?? ""}
            />
            <div className="kaca p-6">
              {invoice.pembayaran.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada pembayaran tercatat.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {invoice.pembayaran.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-2 border-b border-white/10 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{formatRupiah(p.jumlah)}</p>
                        <p className="text-xs text-slate-500">
                          {formatTanggal(p.tanggal.toISOString())}
                          {p.metode ? ` · ${LABEL_METODE[p.metode] ?? p.metode}` : ""}
                        </p>
                        {p.catatan && (
                          <p className="mt-0.5 text-xs text-slate-600">{p.catatan}</p>
                        )}
                        {p.kwitansi && (
                          <p className="text-xs text-slate-600">
                            Kwitansi {p.kwitansi.nomor}
                          </p>
                        )}
                      </div>
                      <HapusPembayaran id={p.id} jumlah={p.jumlah} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
