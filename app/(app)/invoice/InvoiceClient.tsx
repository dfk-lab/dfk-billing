"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  formatRupiah,
  formatTanggal,
  sisaHari,
  hitungTotal,
  LABEL_PERIODE,
  type ItemInput,
} from "@/lib/format";

export type InvoiceRingkas = {
  id: number;
  nomor: string;
  pelangganId: number;
  layananId: number | null;
  pelangganNama: string;
  pelangganPerusahaan: string | null;
  tanggal: string;
  jatuhTempo: string | null;
  status: string;
  diskonPersen: number;
  ppnPersen: number;
  dibuatOtomatis: boolean;
  items: ItemInput[];
  totalDibayar: number;
};

type FormItem = ItemInput & { kunci: number };

const inputCls = "masukan mt-1 w-full text-sm";
const labelCls = "label";
const btnPrimary = "tombol-utama";
const btnSekunder = "tombol-halus";
const btnBahaya = "tombol-bahaya";

function hariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function tambahHari(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatQty(q: number) {
  return Number.isInteger(q)
    ? String(q)
    : q.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function badgeStatusEfektif(inv: InvoiceRingkas) {
  if (inv.status === "DRAFT")
    return { label: "Draft", cls: "badge-slate" };
  const { total } = hitungTotal(inv.items, inv.diskonPersen, inv.ppnPersen);
  if (total > 0 && inv.totalDibayar >= total)
    return { label: "Lunas", cls: "badge-cyan" };
  if (inv.jatuhTempo && sisaHari(inv.jatuhTempo) < 0)
    return { label: "Jatuh tempo", cls: "badge-rose" };
  return { label: "Terkirim", cls: "badge-amber" };
}

let kunciItem = 0;
const itemBaru = (): FormItem => ({ kunci: ++kunciItem, deskripsi: "", qty: 1, hargaSatuan: 0 });

export default function InvoiceClient({
  daftar,
  pelanggan,
  layanan,
  ppnDefault,
  jatuhTempoHari,
  q,
  statusFilter,
}: {
  daftar: InvoiceRingkas[];
  pelanggan: { id: number; nama: string }[];
  layanan: {
    id: number;
    pelangganId: number;
    pelangganNama: string;
    nama: string;
    harga: number;
    periode: string;
  }[];
  ppnDefault: number;
  jatuhTempoHari: number;
  q: string;
  statusFilter: string;
}) {
  const router = useRouter();
  const [kataCari, setKataCari] = useState(q);
  const [modal, setModal] = useState<"baru" | "edit" | null>(null);
  const [pilihan, setPilihan] = useState<InvoiceRingkas | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [notifikasi, setNotifikasi] = useState<{
    jenis: "ok" | "gagal";
    teks: string;
  } | null>(null);

  const [form, setForm] = useState({
    pelangganId: "",
    layananId: "",
    tanggal: hariIni(),
    jatuhTempo: "",
    status: "DRAFT",
    diskonPersen: "0",
    ppnPersen: String(ppnDefault),
    catatan: "",
  });
  const [items, setItems] = useState<FormItem[]>([itemBaru()]);

  const layananTersaring = useMemo(
    () =>
      form.pelangganId
        ? layanan.filter((l) => l.pelangganId === Number(form.pelangganId))
        : [],
    [form.pelangganId, layanan]
  );

  const ringkasan = useMemo(
    () =>
      hitungTotal(
        items.map((it) => ({
          deskripsi: it.deskripsi,
          qty: Number(it.qty) || 0,
          hargaSatuan: Number(it.hargaSatuan) || 0,
        })),
        Number(form.diskonPersen) || 0,
        Number(form.ppnPersen) || 0
      ),
    [items, form.diskonPersen, form.ppnPersen]
  );

  function bukaBaru() {
    setPilihan(null);
    setForm({
      pelangganId: "",
      layananId: "",
      tanggal: hariIni(),
      jatuhTempo: tambahHari(hariIni(), jatuhTempoHari),
      status: "DRAFT",
      diskonPersen: "0",
      ppnPersen: String(ppnDefault),
      catatan: "",
    });
    setItems([itemBaru()]);
    setModal("baru");
  }

  function bukaEdit(inv: InvoiceRingkas) {
    setPilihan(inv);
    setForm({
      pelangganId: String(inv.pelangganId),
      layananId: inv.layananId ? String(inv.layananId) : "",
      tanggal: inv.tanggal.slice(0, 10),
      jatuhTempo: inv.jatuhTempo ? inv.jatuhTempo.slice(0, 10) : "",
      status: inv.status,
      diskonPersen: String(inv.diskonPersen),
      ppnPersen: String(inv.ppnPersen),
      catatan: inv.dibuatOtomatis ? "Invoice langganan otomatis" : "",
    });
    setItems(
      inv.items.length > 0
        ? inv.items.map((it) => ({ ...it, kunci: ++kunciItem }))
        : [itemBaru()]
    );
    setModal("edit");
  }

  function ubahItem(kunci: number, bagian: Partial<FormItem>) {
    setItems((daftar) =>
      daftar.map((it) => (it.kunci === kunci ? { ...it, ...bagian } : it))
    );
  }

  function pilihLayanan(id: string) {
    setForm((f) => ({ ...f, layananId: id }));
    const l = layanan.find((x) => String(x.id) === id);
    if (!l) return;
    setItems((daftar) => {
      const kosongSemua = daftar.every(
        (it) => it.deskripsi === "" && it.hargaSatuan === 0
      );
      const item = {
        kunci: ++kunciItem,
        deskripsi: `${l.nama} (${LABEL_PERIODE[l.periode] ?? l.periode})`,
        qty: 1,
        hargaSatuan: l.harga,
      };
      return kosongSemua ? [item] : [...daftar, item];
    });
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    const body = {
      pelangganId: form.pelangganId,
      layananId: form.layananId || null,
      tanggal: form.tanggal,
      jatuhTempo: form.jatuhTempo || null,
      status: form.status,
      diskonPersen: Number(form.diskonPersen) || 0,
      ppnPersen: Number(form.ppnPersen) || 0,
      catatan: form.catatan,
      items: items.map((it) => ({
        deskripsi: it.deskripsi,
        qty: Number(it.qty) || 0,
        hargaSatuan: Number(it.hargaSatuan) || 0,
      })),
    };
    const url = modal === "baru" ? "/api/invoice" : `/api/invoice/${pilihan?.id}`;
    const res = await fetch(url, {
      method: modal === "baru" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMenyimpan(false);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      setModal(null);
      setNotifikasi({
        jenis: "ok",
        teks:
          modal === "baru"
            ? `Invoice ${data?.nomor ?? ""} dibuat.`
            : "Perubahan invoice tersimpan.",
      });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal menyimpan invoice.",
      });
    }
  }

  async function hapus(inv: InvoiceRingkas) {
    if (!window.confirm(`Hapus invoice ${inv.nomor}?`)) return;
    const res = await fetch(`/api/invoice/${inv.id}`, { method: "DELETE" });
    if (res.ok) {
      setNotifikasi({ jenis: "ok", teks: `Invoice ${inv.nomor} dihapus.` });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal menghapus invoice.",
      });
    }
  }

  function cari(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (kataCari.trim()) p.set("q", kataCari.trim());
    if (statusFilter) p.set("status", statusFilter);
    router.push(p.toString() ? `/invoice?${p.toString()}` : "/invoice");
  }

  function ubahFilterStatus(v: string) {
    const p = new URLSearchParams();
    if (kataCari.trim()) p.set("q", kataCari.trim());
    if (v) p.set("status", v);
    router.push(p.toString() ? `/invoice?${p.toString()}` : "/invoice");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
          <p className="mt-1 text-sm text-slate-500">
            Buat dan kelola tagihan. Status lunas dihitung dari total pembayaran.
          </p>
        </div>
        <button onClick={bukaBaru} className={btnPrimary} disabled={pelanggan.length === 0}>
          + Tambah invoice
        </button>
      </div>

      {pelanggan.length === 0 && (
        <div className="peringatan">
          Belum ada pelanggan. Tambahkan pelanggan dulu di menu{" "}
          <a href="/pelanggan" className="font-semibold underline">
            Pelanggan
          </a>
          .
        </div>
      )}

      {notifikasi && (
        <div
          className={notifikasi.jenis === "ok" ? "notif-ok" : "notif-gagal"}
        >
          {notifikasi.teks}
        </div>
      )}

      <form onSubmit={cari} className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Cari nomor invoice atau pelanggan…"
          value={kataCari}
          onChange={(e) => setKataCari(e.target.value)}
          className="masukan w-full max-w-sm text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => ubahFilterStatus(e.target.value)}
          className="masukan text-sm"
        >
          <option value="">Semua status</option>
          <option value="DRAFT">Draft</option>
          <option value="TERKIRIM">Terkirim</option>
        </select>
        <button type="submit" className={btnSekunder}>
          Cari
        </button>
        {(q || statusFilter) && (
          <button
            type="button"
            onClick={() => {
              setKataCari("");
              router.push("/invoice");
            }}
            className={btnSekunder}
          >
            Reset
          </button>
        )}
      </form>

      <div className="kaca">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Daftar invoice{" "}
            <span className="font-normal text-slate-500">
              ({daftar.length} invoice)
            </span>
          </h2>
        </div>

        {daftar.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl">⎘</p>
            <p className="mt-3 text-sm text-slate-500">
              {q || statusFilter
                ? "Tidak ada invoice yang cocok dengan filter."
                : "Belum ada invoice. Buat invoice pertama Anda."}
            </p>
          </div>
        ) : (
          <>
            {/* Tabel — layar sedang ke atas */}
            <div className="hidden overflow-x-auto md:block">
              <table className="tabel">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 font-medium">Nomor</th>
                    <th className="px-6 py-3 font-medium">Pelanggan</th>
                    <th className="px-6 py-3 font-medium">Tanggal</th>
                    <th className="px-6 py-3 font-medium text-right">Total</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((inv) => {
                    const { total } = hitungTotal(
                      inv.items,
                      inv.diskonPersen,
                      inv.ppnPersen
                    );
                    const badge = badgeStatusEfektif(inv);
                    return (
                      <tr key={inv.id} className="border-b border-white/10 last:border-0">
                        <td className="px-6 py-3">
                          <Link
                            href={`/invoice/${inv.id}`}
                            className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            {inv.nomor}
                          </Link>
                          {inv.dibuatOtomatis && (
                            <span className="badge badge-slate ml-2">
                              otomatis
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-slate-200">{inv.pelangganNama}</p>
                          {inv.pelangganPerusahaan && (
                            <p className="text-xs text-slate-500">
                              {inv.pelangganPerusahaan}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-slate-400">
                          <p>{formatTanggal(inv.tanggal)}</p>
                          {inv.jatuhTempo && (
                            <p className="text-xs text-slate-500">
                              Jatuh tempo {formatTanggal(inv.jatuhTempo)}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-medium">
                          {formatRupiah(total)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`badge ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/invoice/${inv.id}`}
                              className="tombol-mini"
                            >
                              Detail
                            </Link>
                            <Link
                              href={`/cetak/invoice/${inv.id}`}
                              target="_blank"
                              className="tombol-mini"
                            >
                              Cetak
                            </Link>
                            <button
                              onClick={() => bukaEdit(inv)}
                              className="tombol-mini"
                            >
                              Edit
                            </button>
                            <button onClick={() => hapus(inv)} className={btnBahaya}>
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Kartu — layar kecil */}
            <ul className="divide-y divide-white/10 md:hidden">
              {daftar.map((inv) => {
                const { total } = hitungTotal(
                  inv.items,
                  inv.diskonPersen,
                  inv.ppnPersen
                );
                const badge = badgeStatusEfektif(inv);
                return (
                  <li key={inv.id} className="space-y-2 px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/invoice/${inv.id}`}
                          className="font-medium text-cyan-400"
                        >
                          {inv.nomor}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {inv.pelangganNama}
                          {inv.pelangganPerusahaan ? ` · ${inv.pelangganPerusahaan}` : ""}
                        </p>
                      </div>
                      <span
                        className={`badge ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{formatRupiah(total)}</span>
                      <span className="text-xs text-slate-500">
                        {" "}
                        · {formatTanggal(inv.tanggal)}
                        {inv.jatuhTempo ? ` · tempo ${formatTanggal(inv.jatuhTempo)}` : ""}
                      </span>
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/invoice/${inv.id}`}
                        className="tombol-mini"
                      >
                        Detail
                      </Link>
                      <Link
                        href={`/cetak/invoice/${inv.id}`}
                        target="_blank"
                        className="tombol-mini"
                      >
                        Cetak
                      </Link>
                      <button
                        onClick={() => bukaEdit(inv)}
                        className="tombol-mini"
                      >
                        Edit
                      </button>
                      <button onClick={() => hapus(inv)} className={btnBahaya}>
                        Hapus
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal-kaca max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6">
            <h3 className="text-base font-semibold">
              {modal === "baru" ? "Tambah invoice" : `Edit invoice ${pilihan?.nomor}`}
            </h3>
            <form onSubmit={simpan} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="f-pelanggan">
                    Pelanggan *
                  </label>
                  <select
                    id="f-pelanggan"
                    required
                    value={form.pelangganId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pelangganId: e.target.value,
                        layananId: "",
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Pilih pelanggan
                    </option>
                    {pelanggan.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-layanan">
                    Dari layanan (opsional)
                  </label>
                  <select
                    id="f-layanan"
                    value={form.layananId}
                    onChange={(e) => pilihLayanan(e.target.value)}
                    disabled={!form.pelangganId}
                    className={inputCls}
                  >
                    <option value="">— Tanpa layanan —</option>
                    {layananTersaring.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nama} · {formatRupiah(l.harga)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor="f-tanggal">
                    Tanggal invoice *
                  </label>
                  <input
                    id="f-tanggal"
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-tempo">
                    Jatuh tempo
                  </label>
                  <input
                    id="f-tempo"
                    type="date"
                    value={form.jatuhTempo}
                    onChange={(e) => setForm({ ...form, jatuhTempo: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-status">
                    Status
                  </label>
                  <select
                    id="f-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="TERKIRIM">Terkirim</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Item tagihan *</label>
                  <button
                    type="button"
                    onClick={() => setItems((d) => [...d, itemBaru()])}
                    className="tombol-mini"
                  >
                    + Tambah baris
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.kunci}
                      className="grid grid-cols-2 gap-2 sm:flex sm:items-start sm:gap-2"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Deskripsi item"
                        value={it.deskripsi}
                        onChange={(e) =>
                          ubahItem(it.kunci, { deskripsi: e.target.value })
                        }
                        className="masukan col-span-2 w-full text-sm"
                      />
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        title="Qty"
                        value={it.qty}
                        onChange={(e) =>
                          ubahItem(it.kunci, { qty: Number(e.target.value) })
                        }
                        className="masukan w-full text-sm sm:w-20"
                      />
                      <input
                        type="number"
                        required
                        min="0"
                        step="1"
                        title="Harga satuan"
                        value={it.hargaSatuan}
                        onChange={(e) =>
                          ubahItem(it.kunci, { hargaSatuan: Number(e.target.value) })
                        }
                        className="masukan w-full text-sm sm:w-32"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setItems((d) =>
                            d.length > 1 ? d.filter((x) => x.kunci !== it.kunci) : d
                          )
                        }
                        disabled={items.length === 1}
                        className="tombol-mini justify-self-end sm:mt-1"
                        title="Hapus baris"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Kolom: deskripsi · jumlah (qty) · harga satuan (Rp)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="f-diskon">
                    Diskon (%)
                  </label>
                  <input
                    id="f-diskon"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={form.diskonPersen}
                    onChange={(e) =>
                      setForm({ ...form, diskonPersen: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-ppn">
                    PPN (%)
                  </label>
                  <input
                    id="f-ppn"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={form.ppnPersen}
                    onChange={(e) => setForm({ ...form, ppnPersen: e.target.value })}
                    className={inputCls}
                  />
                </div>
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

              <div className="rounded-lg bg-white/5 p-4 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatRupiah(ringkasan.subtotal)}</span>
                </div>
                {ringkasan.diskon > 0 && (
                  <div className="mt-1 flex justify-between text-slate-400">
                    <span>Diskon ({Number(form.diskonPersen) || 0}%)</span>
                    <span>−{formatRupiah(ringkasan.diskon)}</span>
                  </div>
                )}
                {ringkasan.ppn > 0 && (
                  <div className="mt-1 flex justify-between text-slate-400">
                    <span>PPN ({Number(form.ppnPersen) || 0}%)</span>
                    <span>{formatRupiah(ringkasan.ppn)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatRupiah(ringkasan.total)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className={btnSekunder}
                >
                  Batal
                </button>
                <button type="submit" disabled={menyimpan} className={btnPrimary}>
                  {menyimpan ? "Menyimpan…" : "Simpan invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
