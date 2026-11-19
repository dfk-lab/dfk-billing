"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatRupiah } from "@/lib/format";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none";
const labelCls = "block text-sm font-medium text-zinc-700";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50";
const btnSekunder =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50";

function hariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function PanelPembayaran({
  invoiceId,
  sisa,
  namaPemilik,
}: {
  invoiceId: number;
  sisa: number;
  namaPemilik: string;
}) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [notifikasi, setNotifikasi] = useState<{
    jenis: "ok" | "gagal";
    teks: string;
  } | null>(null);
  const [form, setForm] = useState({
    jumlah: String(sisa > 0 ? sisa : 0),
    tanggal: hariIni(),
    metode: "TRANSFER",
    catatan: "",
    penerima: namaPemilik,
  });

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    const res = await fetch(`/api/invoice/${invoiceId}/pembayaran`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jumlah: Number(form.jumlah),
        tanggal: form.tanggal,
        metode: form.metode,
        catatan: form.catatan,
        penerima: form.penerima,
      }),
    });
    setMenyimpan(false);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      setTerbuka(false);
      setNotifikasi({
        jenis: "ok",
        teks: `Pembayaran tercatat. Kwitansi ${data?.kwitansi?.nomor ?? ""} dibuat.`,
      });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal mencatat pembayaran.",
      });
    }
  }

  return (
    <>
      {notifikasi && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ${
            notifikasi.jenis === "ok"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {notifikasi.teks}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Pembayaran</h2>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, jumlah: String(sisa > 0 ? sisa : 0) }));
            setTerbuka(true);
          }}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          + Catat pembayaran
        </button>
      </div>

      {terbuka && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">Catat pembayaran</h3>
            <form onSubmit={simpan} className="mt-4 space-y-4">
              <div>
                <label className={labelCls} htmlFor="f-jumlah">
                  Jumlah (Rp) *
                </label>
                <input
                  id="f-jumlah"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  className={inputCls}
                />
                {sisa > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Sisa tagihan: {formatRupiah(sisa)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="f-tanggal">
                    Tanggal
                  </label>
                  <input
                    id="f-tanggal"
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-metode">
                    Metode
                  </label>
                  <select
                    id="f-metode"
                    value={form.metode}
                    onChange={(e) => setForm({ ...form, metode: e.target.value })}
                    className={inputCls}
                  >
                    <option value="TUNAI">Tunai</option>
                    <option value="TRANSFER">Transfer bank</option>
                    <option value="QRIS">QRIS</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="f-penerima">
                  Penerima (untuk kwitansi)
                </label>
                <input
                  id="f-penerima"
                  type="text"
                  placeholder="Nama penerima pembayaran"
                  value={form.penerima}
                  onChange={(e) => setForm({ ...form, penerima: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-catatan">
                  Catatan
                </label>
                <textarea
                  id="f-catatan"
                  rows={2}
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTerbuka(false)}
                  className={btnSekunder}
                >
                  Batal
                </button>
                <button type="submit" disabled={menyimpan} className={btnPrimary}>
                  {menyimpan ? "Menyimpan…" : "Simpan pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function HapusPembayaran({
  id,
  jumlah,
}: {
  id: number;
  jumlah: number;
}) {
  const router = useRouter();

  async function hapus() {
    if (!window.confirm(`Hapus pembayaran ${formatRupiah(jumlah)}? Kwitansinya juga terhapus.`))
      return;
    const res = await fetch(`/api/pembayaran/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? "Gagal menghapus pembayaran.");
    }
  }

  return (
    <button
      onClick={hapus}
      title="Hapus pembayaran"
      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-600"
    >
      Hapus
    </button>
  );
}
