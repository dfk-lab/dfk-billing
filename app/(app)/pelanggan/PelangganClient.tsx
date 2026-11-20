"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StripAngka from "@/components/StripAngka";

export type Pelanggan = {
  id: number;
  nama: string;
  perusahaan: string | null;
  email: string | null;
  telepon: string | null;
  alamat: string | null;
  catatan: string | null;
};

type FormPelanggan = {
  nama: string;
  perusahaan: string;
  email: string;
  telepon: string;
  alamat: string;
  catatan: string;
};

const kosong: FormPelanggan = {
  nama: "",
  perusahaan: "",
  email: "",
  telepon: "",
  alamat: "",
  catatan: "",
};

const inputCls = "masukan mt-1 w-full text-sm";
const labelCls = "label";
const btnPrimary = "tombol-utama";
const btnSekunder = "tombol-halus";
const btnBahaya = "tombol-bahaya";

function parseCsv(teks: string): string[][] {
  const teksBersih = teks.replace(/^\uFEFF/, "");
  const baris: string[][] = [];
  let kolom: string[] = [];
  let field = "";
  let dalamKutip = false;
  for (let i = 0; i < teksBersih.length; i++) {
    const c = teksBersih[i];
    if (dalamKutip) {
      if (c === '"') {
        if (teksBersih[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      dalamKutip = true;
    } else if (c === ",") {
      kolom.push(field);
      field = "";
    } else if (c === "\n") {
      kolom.push(field);
      field = "";
      if (kolom.some((f) => f.trim() !== "")) baris.push(kolom);
      kolom = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  kolom.push(field);
  if (kolom.some((f) => f.trim() !== "")) baris.push(kolom);
  return baris;
}

function petaHeader(header: string[]) {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const k = h.trim().toLowerCase();
    if (k === "nama") idx.nama = i;
    else if (k === "perusahaan" || k === "instansi") idx.perusahaan = i;
    else if (k === "email") idx.email = i;
    else if (
      k === "telepon" ||
      k === "wa" ||
      k === "whatsapp" ||
      k === "telepon/wa"
    )
      idx.telepon = i;
    else if (k === "alamat") idx.alamat = i;
    else if (k === "catatan") idx.catatan = i;
  });
  return idx;
}

export default function PelangganClient({
  daftar,
  q,
}: {
  daftar: Pelanggan[];
  q: string;
}) {
  const router = useRouter();
  const [kataCari, setKataCari] = useState(q);
  const [modal, setModal] = useState<"baru" | "edit" | null>(null);
  const [pilihan, setPilihan] = useState<Pelanggan | null>(null);
  const [form, setForm] = useState<FormPelanggan>(kosong);
  const [menyimpan, setMenyimpan] = useState(false);
  const [notifikasi, setNotifikasi] = useState<{
    jenis: "ok" | "gagal";
    teks: string;
  } | null>(null);
  const [imporTerbuka, setImporTerbuka] = useState(false);
  const [imporMemproses, setImporMemproses] = useState(false);
  const [imporHasil, setImporHasil] = useState<{
    berhasil: number;
    gagal: number;
    detail: string[];
  } | null>(null);
  const [imporError, setImporError] = useState("");

  function bukaBaru() {
    setPilihan(null);
    setForm(kosong);
    setModal("baru");
  }

  function bukaEdit(p: Pelanggan) {
    setPilihan(p);
    setForm({
      nama: p.nama,
      perusahaan: p.perusahaan ?? "",
      email: p.email ?? "",
      telepon: p.telepon ?? "",
      alamat: p.alamat ?? "",
      catatan: p.catatan ?? "",
    });
    setModal("edit");
  }

  function tutupModal() {
    setModal(null);
    setImporTerbuka(false);
    setImporHasil(null);
    setImporError("");
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    const url =
      modal === "baru" ? "/api/pelanggan" : `/api/pelanggan/${pilihan?.id}`;
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
            ? `Pelanggan "${form.nama}" ditambahkan.`
            : "Perubahan pelanggan tersimpan.",
      });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal menyimpan pelanggan.",
      });
    }
  }

  async function hapus(p: Pelanggan) {
    if (!window.confirm(`Hapus pelanggan "${p.nama}"?`)) return;
    const res = await fetch(`/api/pelanggan/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setNotifikasi({ jenis: "ok", teks: `Pelanggan "${p.nama}" dihapus.` });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setNotifikasi({
        jenis: "gagal",
        teks: data?.error ?? "Gagal menghapus pelanggan.",
      });
    }
  }

  async function prosesImpor(file: File) {
    setImporMemproses(true);
    setImporError("");
    setImporHasil(null);
    try {
      const teks = await file.text();
      const rows = parseCsv(teks);
      if (rows.length === 0) {
        setImporError("File CSV kosong.");
        setImporMemproses(false);
        return;
      }
      const idx = petaHeader(rows[0]);
      if (idx.nama === undefined) {
        setImporError(
          "CSV harus punya kolom header 'nama'. Format: nama,perusahaan,email,telepon,alamat,catatan"
        );
        setImporMemproses(false);
        return;
      }
      const ambil = (row: string[], key: string) =>
        idx[key] !== undefined && row[idx[key]] !== undefined
          ? row[idx[key]]
          : "";
      const baris = rows.slice(1).map((row) => ({
        nama: ambil(row, "nama"),
        perusahaan: ambil(row, "perusahaan"),
        email: ambil(row, "email"),
        telepon: ambil(row, "telepon"),
        alamat: ambil(row, "alamat"),
        catatan: ambil(row, "catatan"),
      }));
      const res = await fetch("/api/pelanggan/impor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baris }),
      });
      const data = await res.json();
      if (res.ok) {
        setImporHasil(data);
        router.refresh();
      } else {
        setImporError(data?.error ?? "Gagal mengimpor CSV.");
      }
    } catch {
      setImporError("File tidak dapat dibaca.");
    }
    setImporMemproses(false);
  }

  function cari(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      kataCari.trim()
        ? `/pelanggan?q=${encodeURIComponent(kataCari.trim())}`
        : "/pelanggan"
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pelanggan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola data pelanggan dan informasi kontak.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setImporTerbuka(true)} className={btnSekunder}>
            Impor CSV
          </button>
          <button onClick={bukaBaru} className={btnPrimary}>
            + Tambah pelanggan
          </button>
        </div>
      </div>

      <StripAngka
        kartu={[
          { label: "Total pelanggan", nilai: String(daftar.length) },
          {
            label: "Ada nomor WA",
            nilai: String(daftar.filter((p) => p.telepon).length),
            aksen: "text-cyan-300",
          },
          {
            label: "Ada email",
            nilai: String(daftar.filter((p) => p.email).length),
          },
          {
            label: "Ada perusahaan",
            nilai: String(daftar.filter((p) => p.perusahaan).length),
          },
        ]}
      />

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
          placeholder="Cari nama, perusahaan, telepon, atau email…"
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
              router.push("/pelanggan");
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
            Daftar pelanggan{" "}
            <span className="font-normal text-slate-500">
              ({daftar.length} pelanggan)
            </span>
          </h2>
        </div>

        {daftar.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl">❖</p>
            <p className="mt-3 text-sm text-slate-500">
              {q
                ? "Tidak ada pelanggan yang cocok dengan pencarian."
                : "Belum ada pelanggan. Tambahkan pelanggan pertama Anda."}
            </p>
          </div>
        ) : (
          <>
            {/* Tabel — layar sedang ke atas */}
            <table className="tabel hidden md:table">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Nama</th>
                  <th className="px-6 py-3 font-medium">Kontak</th>
                  <th className="px-6 py-3 font-medium">Alamat</th>
                  <th className="px-6 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id} className="border-b border-white/10 last:border-0">
                    <td className="px-6 py-3">
                      <p className="font-medium">{p.nama}</p>
                      {p.perusahaan && (
                        <p className="text-xs text-slate-500">{p.perusahaan}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {p.telepon && <p>{p.telepon}</p>}
                      {p.email && <p className="text-xs">{p.email}</p>}
                      {!p.telepon && !p.email && <span className="text-slate-600">—</span>}
                    </td>
                    <td className="max-w-[220px] px-6 py-3 text-slate-400">
                      {p.alamat ?? <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => bukaEdit(p)}
                          className="tombol-mini"
                        >
                          Edit
                        </button>
                        <button onClick={() => hapus(p)} className={btnBahaya}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Kartu — layar kecil */}
            <ul className="divide-y divide-white/10 md:hidden">
              {daftar.map((p) => (
                <li key={p.id} className="space-y-2 px-4 py-4">
                  <div>
                    <p className="font-medium">{p.nama}</p>
                    {p.perusahaan && (
                      <p className="text-xs text-slate-500">{p.perusahaan}</p>
                    )}
                  </div>
                  {(p.telepon || p.email) && (
                    <p className="text-sm text-slate-400">
                      {[p.telepon, p.email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {p.alamat && (
                    <p className="text-sm text-slate-400">{p.alamat}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => bukaEdit(p)}
                      className="tombol-mini"
                    >
                      Edit
                    </button>
                    <button onClick={() => hapus(p)} className={btnBahaya}>
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
              {modal === "baru" ? "Tambah pelanggan" : "Edit pelanggan"}
            </h3>
            <form onSubmit={simpan} className="mt-4 space-y-4">
              <div>
                <label className={labelCls} htmlFor="f-nama">
                  Nama pelanggan *
                </label>
                <input
                  id="f-nama"
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-perusahaan">
                  Nama perusahaan / instansi
                </label>
                <input
                  id="f-perusahaan"
                  type="text"
                  value={form.perusahaan}
                  onChange={(e) =>
                    setForm({ ...form, perusahaan: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="f-email">
                    Email
                  </label>
                  <input
                    id="f-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="f-telepon">
                    Telepon / WhatsApp
                  </label>
                  <input
                    id="f-telepon"
                    type="tel"
                    value={form.telepon}
                    onChange={(e) =>
                      setForm({ ...form, telepon: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="f-alamat">
                  Alamat
                </label>
                <textarea
                  id="f-alamat"
                  rows={2}
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
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
                <button type="button" onClick={tutupModal} className={btnSekunder}>
                  Batal
                </button>
                <button type="submit" disabled={menyimpan} className={btnPrimary}>
                  {menyimpan ? "Menyimpan…" : "Simpan pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {imporTerbuka && (
        <div className="modal-overlay">
          <div className="modal-kaca max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
            <h3 className="text-base font-semibold">Impor pelanggan dari CSV</h3>
            <p className="mt-2 text-xs text-slate-500">
              Header kolom yang dikenali:{" "}
              <code className="rounded bg-white/10 px-1 text-slate-300">
                nama,perusahaan,email,telepon,alamat,catatan
              </code>{" "}
              — hanya <b>nama</b> yang wajib. Maksimal 500 baris per impor.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={imporMemproses}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) prosesImpor(file);
              }}
              className="mt-4 block w-full text-sm"
            />
            {imporMemproses && (
              <p className="mt-3 text-sm text-slate-500">Memproses…</p>
            )}
            {imporError && (
              <p className="mt-3 text-sm text-rose-400">{imporError}</p>
            )}
            {imporHasil && (
              <div className="mt-3 rounded-lg bg-white/5 p-3 text-sm">
                <p className="text-emerald-300">
                  Berhasil: {imporHasil.berhasil} · Gagal: {imporHasil.gagal}
                </p>
                {imporHasil.detail.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
                    {imporHasil.detail.slice(0, 10).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={tutupModal} className={btnSekunder}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
