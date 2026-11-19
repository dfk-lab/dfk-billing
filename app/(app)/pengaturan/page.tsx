"use client";

import { useEffect, useRef, useState } from "react";
import OtomatisasiKontrol from "./OtomatisasiKontrol";

type Pengaturan = {
  namaUsaha: string;
  namaPemilik: string | null;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  logo: string | null;
  namaBank: string | null;
  noRekening: string | null;
  atasNamaRekening: string | null;
  gambarTandaTangan: string | null;
  footerDokumen: string | null;
  catatanKwitansi: string | null;
  prefixInvoice: string;
  prefixKwitansi: string;
  ppnDefault: number;
  jatuhTempoHari: number;
};

const UKURAN_GAMBAR_MAKS = 2 * 1024 * 1024;

const labelCls = "label";
const inputCls = "masukan mt-1 w-full text-sm";
const kartuCls = "kaca p-6 space-y-5";

export default function PengaturanPage() {
  const [form, setForm] = useState<Pengaturan | null>(null);
  const [status, setStatus] = useState<
    "idle" | "menyimpan" | "tersimpan" | "gagal"
  >("idle");
  const [pesan, setPesan] = useState("");
  const [logoPratinjau, setLogoPratinjau] = useState<string | null>(null);
  const [ttdPratinjau, setTtdPratinjau] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const ttdRef = useRef<HTMLInputElement>(null);

  const [pwLama, setPwLama] = useState("");
  const [pwBaru, setPwBaru] = useState("");
  const [pwKonfirmasi, setPwKonfirmasi] = useState("");
  const [pwStatus, setPwStatus] = useState<
    "idle" | "menyimpan" | "berhasil" | "gagal"
  >("idle");
  const [pwPesan, setPwPesan] = useState("");

  useEffect(() => {
    fetch("/api/pengaturan")
      .then((res) => res.json())
      .then((data: Pengaturan) => {
        setForm(data);
        setLogoPratinjau(data.logo);
        setTtdPratinjau(data.gambarTandaTangan);
      });
  }, []);

  function ubah<K extends keyof Pengaturan>(kunci: K, nilai: Pengaturan[K]) {
    setForm((f) => (f ? { ...f, [kunci]: nilai } : f));
  }

  function pilihGambar(file: File, muat: (dataUrl: string) => void) {
    if (file.size > UKURAN_GAMBAR_MAKS) {
      setStatus("gagal");
      setPesan("Ukuran gambar maksimal 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => muat(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setStatus("menyimpan");
    const res = await fetch("/api/pengaturan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setStatus("tersimpan");
      setPesan("");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("gagal");
      setPesan("Gagal menyimpan pengaturan.");
    }
  }

  async function simpanPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwBaru !== pwKonfirmasi) {
      setPwStatus("gagal");
      setPwPesan("Konfirmasi password tidak sama.");
      return;
    }
    setPwStatus("menyimpan");
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordLama: pwLama, passwordBaru: pwBaru }),
    });
    if (res.ok) {
      setPwStatus("berhasil");
      setPwPesan("");
      setPwLama("");
      setPwBaru("");
      setPwKonfirmasi("");
      setTimeout(() => setPwStatus("idle"), 2500);
    } else {
      const data = await res.json().catch(() => null);
      setPwStatus("gagal");
      setPwPesan(data?.error ?? "Gagal mengganti password.");
    }
  }

  if (!form) {
    return <p className="text-sm text-slate-500">Memuat pengaturan…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Identitas usaha ini dipakai di semua invoice dan kwitansi.
        </p>
      </div>

      <form onSubmit={simpan} className="space-y-6">
        <section className={kartuCls}>
          <h2 className="text-base font-semibold">Identitas usaha</h2>

          <div>
            <span className={labelCls}>Logo usaha</span>
            {logoPratinjau ? (
              <div className="mt-2 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPratinjau}
                  alt="Logo usaha"
                  className="h-16 w-16 rounded-lg border border-white/20 bg-white object-contain p-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoPratinjau(null);
                    ubah("logo", null);
                    if (logoRef.current) logoRef.current.value = "";
                  }}
                  className="text-sm text-rose-400 hover:underline"
                >
                  Hapus logo
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      pilihGambar(file, (dataUrl) => {
                        setLogoPratinjau(dataUrl);
                        ubah("logo", dataUrl);
                      });
                  }}
                  className="mt-1 block text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  PNG/JPG, maksimal 2 MB. Tampil di kepala invoice dan kwitansi.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="namaUsaha">
                Nama usaha
              </label>
              <input
                id="namaUsaha"
                type="text"
                required
                value={form.namaUsaha}
                onChange={(e) => ubah("namaUsaha", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="namaPemilik">
                Nama pemilik / penandatangan
              </label>
              <input
                id="namaPemilik"
                type="text"
                value={form.namaPemilik ?? ""}
                onChange={(e) => ubah("namaPemilik", e.target.value || null)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="telepon">
                Telepon / WhatsApp
              </label>
              <input
                id="telepon"
                type="tel"
                value={form.telepon ?? ""}
                onChange={(e) => ubah("telepon", e.target.value || null)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="alamat">
                Alamat usaha
              </label>
              <textarea
                id="alamat"
                rows={2}
                value={form.alamat ?? ""}
                onChange={(e) => ubah("alamat", e.target.value || null)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="email">
                Email usaha
              </label>
              <input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => ubah("email", e.target.value || null)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="namaBank">
                Nama bank
              </label>
              <input
                id="namaBank"
                type="text"
                value={form.namaBank ?? ""}
                onChange={(e) => ubah("namaBank", e.target.value || null)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="noRekening">
                Nomor rekening
              </label>
              <input
                id="noRekening"
                type="text"
                value={form.noRekening ?? ""}
                onChange={(e) => ubah("noRekening", e.target.value || null)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="atasNamaRekening">
                Atas nama rekening
              </label>
              <input
                id="atasNamaRekening"
                type="text"
                value={form.atasNamaRekening ?? ""}
                onChange={(e) =>
                  ubah("atasNamaRekening", e.target.value || null)
                }
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className={kartuCls}>
          <h2 className="text-base font-semibold">Dokumen &amp; penomoran</h2>

          <div>
            <span className={labelCls}>Gambar tanda tangan (opsional)</span>
            {ttdPratinjau ? (
              <div className="mt-2 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ttdPratinjau}
                  alt="Tanda tangan"
                  className="h-14 rounded-lg border border-white/20 bg-white object-contain p-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTtdPratinjau(null);
                    ubah("gambarTandaTangan", null);
                    if (ttdRef.current) ttdRef.current.value = "";
                  }}
                  className="text-sm text-rose-400 hover:underline"
                >
                  Hapus tanda tangan
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={ttdRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      pilihGambar(file, (dataUrl) => {
                        setTtdPratinjau(dataUrl);
                        ubah("gambarTandaTangan", dataUrl);
                      });
                  }}
                  className="mt-1 block text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Bisa dibiarkan kosong dan gunakan nama penandatangan.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="prefixInvoice">
                Awalan nomor invoice
              </label>
              <input
                id="prefixInvoice"
                type="text"
                value={form.prefixInvoice}
                onChange={(e) => ubah("prefixInvoice", e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-500">
                Contoh: INV → INV-20261119-001
              </p>
            </div>
            <div>
              <label className={labelCls} htmlFor="prefixKwitansi">
                Awalan nomor kwitansi
              </label>
              <input
                id="prefixKwitansi"
                type="text"
                value={form.prefixKwitansi}
                onChange={(e) => ubah("prefixKwitansi", e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-500">
                Contoh: KWT → KWT-20261119-001
              </p>
            </div>
            <div>
              <label className={labelCls} htmlFor="jatuhTempoHari">
                Jatuh tempo default (hari)
              </label>
              <input
                id="jatuhTempoHari"
                type="number"
                min={0}
                max={365}
                value={form.jatuhTempoHari}
                onChange={(e) => ubah("jatuhTempoHari", Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ppnDefault">
                PPN default (%)
              </label>
              <input
                id="ppnDefault"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.ppnDefault}
                onChange={(e) => ubah("ppnDefault", Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="catatanKwitansi">
                Catatan default kwitansi
              </label>
              <textarea
                id="catatanKwitansi"
                rows={2}
                placeholder="Contoh: Pembayaran sudah diterima dan tidak dapat ditarik kembali."
                value={form.catatanKwitansi ?? ""}
                onChange={(e) =>
                  ubah("catatanKwitansi", e.target.value || null)
                }
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="footerDokumen">
                Catatan kaki invoice / kwitansi
              </label>
              <textarea
                id="footerDokumen"
                rows={2}
                placeholder="Contoh: Terima kasih telah menggunakan layanan kami."
                value={form.footerDokumen ?? ""}
                onChange={(e) =>
                  ubah("footerDokumen", e.target.value || null)
                }
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "menyimpan"}
            className="tombol-utama"
          >
            {status === "menyimpan" ? "Menyimpan…" : "Simpan pengaturan"}
          </button>
          {status === "tersimpan" && (
            <span className="text-sm text-emerald-300">Tersimpan.</span>
          )}
          {status === "gagal" && (
            <span className="text-sm text-rose-400">
              {pesan || "Gagal menyimpan."}
            </span>
          )}
        </div>
      </form>

      <section className={kartuCls}>
        <h2 className="text-base font-semibold">Keamanan</h2>
        <form onSubmit={simpanPassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="pwLama">
                Password lama
              </label>
              <input
                id="pwLama"
                type="password"
                required
                value={pwLama}
                onChange={(e) => setPwLama(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pwBaru">
                Password baru
              </label>
              <input
                id="pwBaru"
                type="password"
                required
                minLength={6}
                value={pwBaru}
                onChange={(e) => setPwBaru(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pwKonfirmasi">
                Ulangi password baru
              </label>
              <input
                id="pwKonfirmasi"
                type="password"
                required
                value={pwKonfirmasi}
                onChange={(e) => setPwKonfirmasi(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pwStatus === "menyimpan"}
              className="tombol-halus disabled:opacity-50"
            >
              {pwStatus === "menyimpan" ? "Menyimpan…" : "Ganti password"}
            </button>
            {pwStatus === "berhasil" && (
              <span className="text-sm text-emerald-300">Password diganti.</span>
            )}
            {pwStatus === "gagal" && (
              <span className="text-sm text-rose-400">{pwPesan}</span>
            )}
          </div>
        </form>
      </section>
      <OtomatisasiKontrol />
    </div>
  );
}
