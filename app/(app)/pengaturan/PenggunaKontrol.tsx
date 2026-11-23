"use client";

import { useEffect, useState } from "react";

type Pengguna = {
  id: number;
  nama: string;
  role: string;
  aktif: boolean;
  createdAt: string;
};

const inputCls = "masukan w-full text-sm";
const labelCls = "label";

export default function PenggunaKontrol() {
  const [daftar, setDaftar] = useState<Pengguna[]>([]);
  const [notifikasi, setNotifikasi] = useState<{
    jenis: "ok" | "gagal";
    teks: string;
  } | null>(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [pwBaru, setPwBaru] = useState("");
  const [roleBaru, setRoleBaru] = useState("PETUGAS");
  const [pwEdit, setPwEdit] = useState<Record<number, string>>({});

  async function muat() {
    const res = await fetch("/api/pengguna");
    if (res.ok) setDaftar(await res.json());
  }
  useEffect(() => {
    muat();
  }, []);

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pengguna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nama: namaBaru,
        password: pwBaru,
        role: roleBaru,
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setNotifikasi({ jenis: "ok", teks: `Pengguna ${data.nama} dibuat.` });
      setNamaBaru("");
      setPwBaru("");
      muat();
    } else {
      setNotifikasi({ jenis: "gagal", teks: data?.error ?? "Gagal membuat pengguna." });
    }
  }

  async function ubah(id: number, data: Record<string, unknown>, pesan: string) {
    const res = await fetch(`/api/pengguna/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const hasil = await res.json().catch(() => null);
    if (res.ok) {
      setNotifikasi({ jenis: "ok", teks: pesan });
      muat();
    } else {
      setNotifikasi({ jenis: "gagal", teks: hasil?.error ?? "Gagal menyimpan." });
    }
  }

  async function hapus(p: Pengguna) {
    if (!window.confirm(`Hapus pengguna ${p.nama}?`)) return;
    const res = await fetch(`/api/pengguna/${p.id}`, { method: "DELETE" });
    const hasil = await res.json().catch(() => null);
    if (res.ok) {
      setNotifikasi({ jenis: "ok", teks: `Pengguna ${p.nama} dihapus.` });
      muat();
    } else {
      setNotifikasi({ jenis: "gagal", teks: hasil?.error ?? "Gagal menghapus." });
    }
  }

  return (
    <div className="kaca p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Pengguna</h2>
        <p className="mt-1 text-xs text-slate-500">
          ADMIN punya akses penuh. PETUGAS tidak bisa membuka Pengaturan dan
          Laporan.
        </p>
      </div>

      {notifikasi && (
        <div className={notifikasi.jenis === "ok" ? "notif-ok" : "notif-gagal"}>
          {notifikasi.teks}
        </div>
      )}

      <ul className="space-y-3">
        {daftar.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-white/10 bg-white/5 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{p.nama}</span>
              <span className={p.role === "ADMIN" ? "badge badge-cyan" : "badge badge-slate"}>
                {p.role}
              </span>
              {!p.aktif && <span className="badge badge-rose">nonaktif</span>}
              <span className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                Aktif
                <input
                  type="checkbox"
                  checked={p.aktif}
                  onChange={(e) =>
                    ubah(p.id, { aktif: e.target.checked }, `Status ${p.nama} diperbarui.`)
                  }
                  className="h-4 w-4 accent-cyan-500"
                />
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={p.role}
                onChange={(e) =>
                  ubah(p.id, { role: e.target.value }, `Role ${p.nama} diperbarui.`)
                }
                className="masukan w-auto text-xs"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="PETUGAS">PETUGAS</option>
              </select>
              <input
                type="password"
                placeholder="Password baru (opsional)"
                value={pwEdit[p.id] ?? ""}
                onChange={(e) =>
                  setPwEdit((s) => ({ ...s, [p.id]: e.target.value }))
                }
                className={`${inputCls} w-56`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() =>
                  ubah(p.id, { password: pwEdit[p.id] }, `Password ${p.nama} diganti.`)
                }
                disabled={!pwEdit[p.id]}
                className="tombol-mini"
              >
                Set password
              </button>
              <button
                type="button"
                onClick={() => hapus(p)}
                className="tombol-bahaya"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={tambah} className="space-y-3 border-t border-white/10 pt-4">
        <p className="text-sm font-semibold text-slate-100">Tambah pengguna</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Nama</label>
            <input
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              required
              className="masukan mt-1 w-full text-sm"
            />
          </div>
          <div>
            <label className={labelCls}>Password (min. 8)</label>
            <input
              type="password"
              value={pwBaru}
              onChange={(e) => setPwBaru(e.target.value)}
              required
              minLength={6}
              className="masukan mt-1 w-full text-sm"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select
              value={roleBaru}
              onChange={(e) => setRoleBaru(e.target.value)}
              className="masukan mt-1 w-full text-sm"
            >
              <option value="PETUGAS">PETUGAS</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>
        <button type="submit" className="tombol-halus">
          Tambah pengguna
        </button>
      </form>
    </div>
  );
}
