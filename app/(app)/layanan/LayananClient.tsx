"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import StripAngka from "@/components/StripAngka";
import {
  formatRupiah,
  formatTanggal,
  sisaHari,
  LABEL_PERIODE,
  LABEL_STATUS_LAYANAN,
} from "@/lib/format";

export type Layanan = {
  id: number;
  pelangganId: number;
  pelangganNama: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  periode: string;
  tanggalMulai: string;
  tanggalAkhir: string | null;
  status: string;
  perpanjangOtomatis: boolean;
};

type FormLayanan = {
  pelangganId: string;
  nama: string;
  deskripsi: string;
  harga: string;
  periode: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  status: string;
  perpanjangOtomatis: boolean;
};

const inputCls = "masukan mt-1 w-full text-sm";
const labelCls = "label";
const btnPrimary = "tombol-utama";
const btnSekunder = "tombol-halus";
const btnBahaya = "tombol-bahaya";

function kosongForm(pelangganId: string): FormLayanan {
  return {
    pelangganId,
    nama: "",
    deskripsi: "",
    harga: "",
    periode: "BULANAN",
    tanggalMulai: new Date().toISOString().slice(0, 10),
    tanggalAkhir: "",
    status: "AKTIF",
    perpanjangOtomatis: true,
  };
}

function badgeMasaAktif(tanggalAkhir: string | null, status: string) {
  if (status !== "AKTIF" || !tanggalAkhir) return null;
  const sisa = sisaHari(tanggalAkhir);
  if (sisa < 0)
    return (
      <span className="badge badge-rose">Berakhir</span>
    );
  if (sisa === 0)
    return (
      <span className="badge badge-amber">Berakhir hari ini</span>
    );
  if (sisa <= 30)
    return (
      <span className="badge badge-amber">{sisa} hari lagi</span>
    );
  return (
    <span className="badge badge-slate">{sisa} hari lagi</span>
  );
}

function badgeAuto(l: Layanan) {
  if (!l.perpanjangOtomatis || l.periode === "SEKALI" || l.status !== "AKTIF")
    return null;
  return (
    <span className="badge badge-cyan">Auto</span>
  );
}

export default function LayananClient({
  daftar,
  pelanggan,
  q,
}: {
  daftar: Layanan[];
  pelanggan: { id: number; nama: string }[];
  q: string;
}) {
  const router = useRouter();
  const [kataCari, setKataCari] = useState(q);
  const [modal, setModal] = useState<"baru" | "edit" | null>(null);
  const [pilihan, setPilihan] = useState<Layanan | null>(null);
  const [form, setForm] = useState<FormLayanan>(kosongForm(""));
  const [menyimpan, setMenyimpan] = useState(false);
  const [notifikasi, setNotifikasi] = useState<{
    jenis: "ok" | "gagal";
    teks: string;
  } | null>(null);

  const ringkasLayanan = useMemo(() => {
    let aktif = 0;
    let berakhir = 0;
    let auto = 0;
    let perBulan = 0;
    for (const l of daftar) {
      if (l.status === "AKTIF") {
        aktif += 1;
        if (l.perpanjangOtomatis && l.periode !== "SEKALI") auto += 1;
        if (l.periode === "BULANAN") perBulan += l.harga;
        else if (l.periode === "TAHUNAN") perBulan += Math.round(l.harga / 12);
      } else {
        berakhir += 1;
      }
    }
    return { aktif, berakhir, auto, perBulan };
  }, [daftar]);

  function bukaBaru() {
    setPilihan(null);
    setForm(kosongForm(pelanggan[0] ? String(pelanggan[0].id) : ""));
    setModal("baru");
  }

  function bukaEdit(l: Layanan) {
    setPilihan(l);
    setForm({
      pelangganId: String(l.pelangganId),
      nama: l.nama,
      deskripsi: l.deskripsi ?? "",
      harga: String(l.harga),
      periode: l.periode,
      tanggalMulai: l.tanggalMulai.slice(0, 10),
      tanggalAkhir: l.tanggalAkhir ? l.tanggalAkhir.slice(0, 10) : "",
      status: l.status,
      perpanjangOtomatis: l.perpanjangOtomatis,
    });
    setModal("edit");
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    const url = modal === "baru" ? "/api/layanan" : `/api/layanan/${pilihan?.id}`;
    const res = await fetch(url, {
      method: modal === "baru" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMenyimpan(false);
    if (res.ok) {
      setModal(null);
      setNotifikasi({
        jenis: "ok",
        teks:
          modal === "baru"
            ? `Layanan "${form.nama}" ditambahkan.`
            : "Perubahan layanan tersimpan.",
      });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal menyimpan layanan.",
      });
    }
  }

  async function hapus(l: Layanan) {
    if (
      !window.confirm(
        `Hapus layanan "${l.nama}" milik ${l.pelangganNama}?`
      )
    )
      return;
    const res = await fetch(`/api/layanan/${l.id}`, { method: "DELETE" });
    if (res.ok) {
      setNotifikasi({ jenis: "ok", teks: `Layanan "${l.nama}" dihapus.` });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal menghapus layanan.",
      });
    }
  }

  function cari(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      kataCari.trim()
        ? `/layanan?q=${encodeURIComponent(kataCari.trim())}`
        : "/layanan"
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Layanan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola layanan dan langganan pelanggan — dasar pembuatan invoice.
          </p>
        </div>
        <button onClick={bukaBaru} className={btnPrimary} disabled={pelanggan.length === 0}>
          + Tambah layanan
        </button>
      </div>

      <StripAngka
        kartu={[
          {
            label: "Layanan aktif",
            nilai: String(ringkasLayanan.aktif),
            aksen: "text-cyan-300",
          },
          {
            label: "Berakhir",
            nilai: String(ringkasLayanan.berakhir),
          },
          {
            label: "Auto perpanjang",
            nilai: String(ringkasLayanan.auto),
          },
          {
            label: "Nilai / bulan",
            nilai: formatRupiah(ringkasLayanan.perBulan),
            aksen: "text-emerald-300",
          },
        ]}
      />

      {pelanggan.length === 0 && (
        <div className="peringatan">
          Belum ada pelanggan. Tambahkan pelanggan dulu di menu{" "}
          <a href="/pelanggan" className="font-semibold underline">
            Pelanggan
          </a>{" "}
          sebelum membuat layanan.
        </div>
      )}

      {notifikasi && (
        <div
          className={notifikasi.jenis === "ok" ? "notif-ok" : "notif-gagal"}
        >
          {notifikasi.teks}
        </div>
      )}

      <form onSubmit={cari} className="flex gap-2">
        <input
          type="search"
          placeholder="Cari nama layanan, deskripsi, atau pelanggan…"
          value={kataCari}
          onChange={(e) => setKataCari(e.target.value)}
          className="masukan w-full max-w-sm text-sm"
        />
        <button type="submit" className={btnSekunder}>
          Cari
        </button>
        {q && (
          <button
            type="button"
            onClick={() => {
              setKataCari("");
              router.push("/layanan");
            }}
            className={btnSekunder}
          >
            Reset
          </button>
        )}
      </form>

      <div className="kaca">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-sm font-semibold">
            Daftar layanan{" "}
            <span className="font-normal text-slate-500">
              ({daftar.length} layanan)
            </span>
          </h2>
        </div>

        {daftar.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl">◫</p>
            <p className="mt-3 text-sm text-slate-500">
              {q
                ? "Tidak ada layanan yang cocok dengan pencarian."
                : "Belum ada layanan. Tambahkan layanan pertama Anda."}
            </p>
          </div>
        ) : (
          <>
            {/* Tabel — layar sedang ke atas */}
            <div className="hidden overflow-x-auto md:block">
              <table className="tabel">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 font-medium">Layanan</th>
                    <th className="px-6 py-3 font-medium">Pelanggan</th>
                    <th className="px-6 py-3 font-medium">Harga</th>
                    <th className="px-6 py-3 font-medium">Masa aktif</th>
                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((l) => (
                    <tr key={l.id} className="border-b border-white/10 last:border-0">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{l.nama}</p>
                          <span
                            className={`badge ${
                              l.status === "AKTIF"
                                ? "badge-cyan"
                                : "badge-slate"
                            }`}
                          >
                            {LABEL_STATUS_LAYANAN[l.status] ?? l.status}
                          </span>
                        </div>
                        {l.deskripsi && (
                          <p className="mt-0.5 max-w-[280px] truncate text-xs text-slate-500">
                            {l.deskripsi}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-400">{l.pelangganNama}</td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <p>{formatRupiah(l.harga)}</p>
                        <p className="text-xs text-slate-500">
                          {LABEL_PERIODE[l.periode] ?? l.periode}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <p className="text-slate-400">
                          {formatTanggal(l.tanggalMulai)}
                          {l.tanggalAkhir ? ` – ${formatTanggal(l.tanggalAkhir)}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {badgeMasaAktif(l.tanggalAkhir, l.status)}
                          {badgeAuto(l)}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => bukaEdit(l)}
                            className="tombol-mini"
                          >
                            Edit
                          </button>
                          <button onClick={() => hapus(l)} className={btnBahaya}>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kartu — layar kecil */}
            <ul className="divide-y divide-white/10 md:hidden">
              {daftar.map((l) => (
                <li key={l.id} className="space-y-2 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{l.nama}</p>
                      <p className="text-xs text-slate-500">{l.pelangganNama}</p>
                    </div>
                    <span
                      className={`badge ${
                        l.status === "AKTIF"
                          ? "badge-cyan"
                          : "badge-slate"
                      }`}
                    >
                      {LABEL_STATUS_LAYANAN[l.status] ?? l.status}
                    </span>
                  </div>
                  <p className="text-sm">
                    {formatRupiah(l.harga)}{" "}
                    <span className="text-xs text-slate-500">
                      · {LABEL_PERIODE[l.periode] ?? l.periode}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatTanggal(l.tanggalMulai)}
                    {l.tanggalAkhir ? ` – ${formatTanggal(l.tanggalAkhir)}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {badgeMasaAktif(l.tanggalAkhir, l.status)}
                    {badgeAuto(l)}
                  </div>
                  {l.deskripsi && (
                    <p className="text-xs text-slate-500">{l.deskripsi}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => bukaEdit(l)}
                      className="tombol-mini"
                    >
                      Edit
                    </button>
                    <button onClick={() => hapus(l)} className={btnBahaya}>
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal-kaca max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
            <h3 className="text-base font-semibold">
              {modal === "baru" ? "Tambah layanan" : "Edit layanan"}
            </h3>
            <form onSubmit={simpan} className="mt-4 space-y-4">
              <div>
                <label className={labelCls} htmlFor="f-pelanggan">
                  Pelanggan *
                </label>
                <select
                  id="f-pelanggan"
                  required
                  value={form.pelangganId}
                  onChange={(e) =>
                    setForm({ ...form, pelangganId: e.target.value })
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
                <label className={labelCls} htmlFor="f-nama">
                  Nama layanan *
                </label>
                <input
                  id="f-nama"
                  type="text"
                  required
                  placeholder="cth. Domain .com, Hosting, VPS, Jasa setup"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-deskripsi">
                  Deskripsi
                </label>
                <textarea
                  id="f-deskripsi"
                  rows={2}
                  value={form.deskripsi}
                  onChange={(e) =>
                    setForm({ ...form, deskripsi: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="f-harga">
                    Harga (Rp) *
                  </label>
                  <input
                    id="f-harga"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.harga}
                    onChange={(e) => setForm({ ...form, harga: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-periode">
                    Periode tagihan
                  </label>
                  <select
                    id="f-periode"
                    value={form.periode}
                    onChange={(e) =>
                      setForm({ ...form, periode: e.target.value })
                    }
                    className={inputCls}
                  >
                    <option value="BULANAN">Bulanan</option>
                    <option value="TAHUNAN">Tahunan</option>
                    <option value="SEKALI">Sekali bayar</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="f-mulai">
                    Tanggal mulai *
                  </label>
                  <input
                    id="f-mulai"
                    type="date"
                    required
                    value={form.tanggalMulai}
                    onChange={(e) =>
                      setForm({ ...form, tanggalMulai: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-akhir">
                    Tanggal akhir
                  </label>
                  <input
                    id="f-akhir"
                    type="date"
                    value={form.tanggalAkhir}
                    onChange={(e) =>
                      setForm({ ...form, tanggalAkhir: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
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
                  <option value="AKTIF">Aktif</option>
                  <option value="BERAKHIR">Berakhir</option>
                </select>
              </div>
              {form.periode !== "SEKALI" && (
                <label
                  htmlFor="f-auto"
                  className="flex cursor-pointer items-start gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm"
                >
                  <input
                    id="f-auto"
                    type="checkbox"
                    checked={form.perpanjangOtomatis}
                    onChange={(e) =>
                      setForm({ ...form, perpanjangOtomatis: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 accent-cyan-500"
                  />
                  <span>
                    <span className="font-medium text-slate-200">
                      Perpanjang otomatis
                    </span>
                    <span className="block text-xs text-slate-500">
                      Saat masa aktif berakhir, invoice periode berikutnya
                      dibuat otomatis dan masa layanan diperpanjang.
                    </span>
                  </span>
                </label>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className={btnSekunder}
                >
                  Batal
                </button>
                <button type="submit" disabled={menyimpan} className={btnPrimary}>
                  {menyimpan ? "Menyimpan…" : "Simpan layanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
