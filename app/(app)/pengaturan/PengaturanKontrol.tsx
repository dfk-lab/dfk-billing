"use client";

import { useEffect, useRef, useState } from "react";
import OtomatisasiKontrol from "./OtomatisasiKontrol";
import PenggunaKontrol from "./PenggunaKontrol";
import {
  CONTOH_VAR_KWITANSI,
  CONTOH_VAR_TAGIHAN,
  isiTemplate,
  VAR_KWITANSI,
  VAR_TAGIHAN,
} from "@/lib/wa-template";

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
  gambarQris: string | null;
  gambarTandaTangan: string | null;
  footerDokumen: string | null;
  catatanKwitansi: string | null;
  prefixInvoice: string;
  prefixKwitansi: string;
  ppnDefault: number;
  jatuhTempoHari: number;
  waAktif: boolean;
  waApiUrl: string;
  waApiUser: string | null;
  waApiPassword: string | null;
  waNomorAdmin: string | null;
  waPengingatPelangganAktif: boolean;
  waPengingatHari: string;
  waPengingatJam: number;
  waTemplateTagihan: string;
  waTemplateKwitansi: string;
  midtransAktif: boolean;
  midtransServerKey: string;
  midtransMode: string;
  midtransApiUrl: string;
  urlPublik: string;
};

const UKURAN_GAMBAR_MAKS = 2 * 1024 * 1024;

const labelCls = "label";
const inputCls = "masukan mt-1 w-full text-sm";
const kartuCls = "kaca p-6 space-y-5";
const ketTempoKeterangan =
  '{ketTempo} terisi otomatis saat pengingat otomatis — mis. " (3 hari lagi)", " (besok)", " (TERLAMBAT 2 hari)" — dan kosong saat kirim manual.';

export default function PengaturanPage() {
  const [form, setForm] = useState<Pengaturan | null>(null);
  const [status, setStatus] = useState<
    "idle" | "menyimpan" | "tersimpan" | "gagal"
  >("idle");
  const [pesan, setPesan] = useState("");
  const [logoPratinjau, setLogoPratinjau] = useState<string | null>(null);
  const [ttdPratinjau, setTtdPratinjau] = useState<string | null>(null);
  const [qrisPratinjau, setQrisPratinjau] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const ttdRef = useRef<HTMLInputElement>(null);
  const qrisRef = useRef<HTMLInputElement>(null);

  const [pwLama, setPwLama] = useState("");
  const [pwBaru, setPwBaru] = useState("");
  const [pwKonfirmasi, setPwKonfirmasi] = useState("");
  const [pwStatus, setPwStatus] = useState<
    "idle" | "menyimpan" | "berhasil" | "gagal"
  >("idle");
  const [pwPesan, setPwPesan] = useState("");
  const [ujiStatus, setUjiStatus] = useState<
    "idle" | "mengirim" | "ok" | "gagal"
  >("idle");
  const [ujiPesan, setUjiPesan] = useState("");
  const [lihatPratinjau, setLihatPratinjau] = useState<"tagihan" | "kwitansi" | null>(
    null
  );

  useEffect(() => {
    fetch("/api/pengaturan")
      .then((res) => res.json())
      .then((data: Pengaturan) => {
        setForm(data);
        setLogoPratinjau(data.logo);
        setTtdPratinjau(data.gambarTandaTangan);
        setQrisPratinjau(data.gambarQris);
      });
  }, []);

  function ubah<K extends keyof Pengaturan>(kunci: K, nilai: Pengaturan[K]) {
    setForm((f) => (f ? { ...f, [kunci]: nilai } : f));
  }

  async function unggahGambar(
    file: File,
    jenis: "logo" | "ttd" | "qris",
    muat: (url: string) => void
  ) {
    if (file.size > UKURAN_GAMBAR_MAKS) {
      setStatus("gagal");
      setPesan("Ukuran gambar maksimal 2 MB.");
      return;
    }
    const fd = new FormData();
    fd.append("berkas", file);
    fd.append("jenis", jenis);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      setStatus("gagal");
      setPesan(
        (await res.json().catch(() => null))?.error ||
          "Gagal mengunggah berkas."
      );
      return;
    }
    const data = await res.json();
    muat(`/api/berkas/${data.nama}`);
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

  async function ujiKirim() {
    if (!form) return;
    if (!form.waNomorAdmin?.trim()) {
      setUjiStatus("gagal");
      setUjiPesan("Isi nomor WhatsApp admin terlebih dahulu.");
      return;
    }
    setUjiStatus("mengirim");
    setUjiPesan("");
    const res = await fetch("/api/pengaturan/wa-uji", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomor: form.waNomorAdmin,
        url: form.waApiUrl,
        user: form.waApiUser ?? "",
        pass: form.waApiPassword ?? "",
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      pesan?: string;
    } | null;
    if (res.ok && data?.ok) {
      setUjiStatus("ok");
      setUjiPesan(data.pesan || "Terkirim ke nomor admin.");
    } else {
      setUjiStatus("gagal");
      setUjiPesan(data?.pesan || "Gagal mengirim uji coba.");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Identitas usaha ini dipakai di semua invoice dan kwitansi.
        </p>
      </div>

      <div className="grid grid-flow-dense gap-4 lg:grid-cols-3">
        <form onSubmit={simpan} className="contents">
          {/* Identitas usaha */}
          <section className={`${kartuCls} lg:col-span-2`}>
            <h2 className="text-base font-semibold">Identitas usaha</h2>

            <div>
              <span className={labelCls}>Logo usaha</span>
              {logoPratinjau ? (
                <div className="mt-2 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPratinjau}
                    alt="Logo usaha"
                    className="h-16 w-16 rounded-lg border border-white/20 pratinjau-latar object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPratinjau(null);
                      ubah("logo", "");
                      if (logoRef.current) logoRef.current.value = "";
                    }}
                    className="text-sm text-rose-400 hover:underline"
                  >
                    Hapus logo
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/api/logo"
                      alt="Logo default"
                      className="h-16 w-16 rounded-lg border border-white/20 pratinjau-latar object-contain p-1"
                    />
                    <span className="text-xs text-slate-500">
                      Belum ada logo — memakai logo default.
                    </span>
                  </div>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        unggahGambar(file, "logo", (url) => {
                          setLogoPratinjau(url);
                          ubah("logo", url);
                          if (logoRef.current) logoRef.current.value = "";
                        });
                    }}
                    className="mt-1 block text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    PNG/JPG/WEBP, maksimal 2 MB. Nama berkas otomatis diganti
                    dengan kode unik. Tampil di sidebar, halaman login, tab
                    browser, dan kepala invoice/kwitansi.
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
              <div>
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
            </div>

            <div>
              <span className={labelCls}>Foto QRIS (opsional)</span>
              {qrisPratinjau ? (
                <div className="mt-2 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisPratinjau}
                    alt="QRIS"
                    className="h-24 w-24 rounded-lg border border-white/20 pratinjau-latar object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setQrisPratinjau(null);
                      ubah("gambarQris", "");
                      if (qrisRef.current) qrisRef.current.value = "";
                    }}
                    className="text-sm text-rose-400 hover:underline"
                  >
                    Hapus QRIS
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={qrisRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        unggahGambar(file, "qris", (url) => {
                          setQrisPratinjau(url);
                          ubah("gambarQris", url);
                          if (qrisRef.current) qrisRef.current.value = "";
                        });
                    }}
                    className="mt-1 block text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Unggah foto QRIS dari aplikasi pembayaran Anda. Tampil di
                    invoice (cetak &amp; PDF) di samping info transfer agar
                    pelanggan bisa langsung scan.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Tanda tangan & catatan dokumen */}
          <section className={kartuCls}>
            <h2 className="text-base font-semibold">Tanda tangan &amp; catatan</h2>

            <div>
              <span className={labelCls}>Gambar tanda tangan (opsional)</span>
              {ttdPratinjau ? (
                <div className="mt-2 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ttdPratinjau}
                    alt="Tanda tangan"
                    className="h-14 rounded-lg border border-white/20 pratinjau-latar object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTtdPratinjau(null);
                      ubah("gambarTandaTangan", "");
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
                        unggahGambar(file, "ttd", (url) => {
                          setTtdPratinjau(url);
                          ubah("gambarTandaTangan", url);
                          if (ttdRef.current) ttdRef.current.value = "";
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
            <div>
              <label className={labelCls} htmlFor="catatanKwitansi">
                Catatan default kwitansi
              </label>
              <textarea
                id="catatanKwitansi"
                rows={3}
                placeholder="Contoh: Pembayaran sudah diterima dan tidak dapat ditarik kembali."
                value={form.catatanKwitansi ?? ""}
                onChange={(e) =>
                  ubah("catatanKwitansi", e.target.value || null)
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="footerDokumen">
                Catatan kaki invoice / kwitansi
              </label>
              <textarea
                id="footerDokumen"
                rows={3}
                placeholder="Contoh: Terima kasih telah menggunakan layanan kami."
                value={form.footerDokumen ?? ""}
                onChange={(e) =>
                  ubah("footerDokumen", e.target.value || null)
                }
                className={inputCls}
              />
            </div>
          </section>

          {/* Dokumen & penomoran */}
          <section className={kartuCls}>
            <h2 className="text-base font-semibold">Dokumen &amp; penomoran</h2>

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
          </section>

          {/* Notifikasi WhatsApp */}
          <section className={`${kartuCls} lg:col-span-3`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Notifikasi WhatsApp</h2>
              <label className="flex shrink-0 items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.waAktif}
                  onChange={(e) => ubah("waAktif", e.target.checked)}
                  className="h-4 w-4 accent-cyan-500"
                />
                Aktif
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Mengirim WA via gateway GoWA ke pelanggan saat invoice terbit,
              pembayaran diterima, dan pengingat jatuh tempo (otomatis harian).
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelCls} htmlFor="waApiUrl">
                  URL gateway
                </label>
                <input
                  id="waApiUrl"
                  type="text"
                  value={form.waApiUrl}
                  onChange={(e) => ubah("waApiUrl", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="waApiUser">
                  Username basic auth
                </label>
                <input
                  id="waApiUser"
                  type="text"
                  autoComplete="off"
                  value={form.waApiUser ?? ""}
                  onChange={(e) => ubah("waApiUser", e.target.value || null)}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Kosongkan jika gateway tanpa basic auth.
                </p>
              </div>
              <div>
                <label className={labelCls} htmlFor="waApiPassword">
                  Password basic auth
                </label>
                <input
                  id="waApiPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.waApiPassword ?? ""}
                  onChange={(e) => ubah("waApiPassword", e.target.value || null)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="waNomorAdmin">
                  Nomor WhatsApp admin
                </label>
                <input
                  id="waNomorAdmin"
                  type="tel"
                  value={form.waNomorAdmin ?? ""}
                  onChange={(e) => ubah("waNomorAdmin", e.target.value || null)}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Untuk uji kirim. Format bebas: 08xx atau 62xx.
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.waPengingatPelangganAktif}
                  onChange={(e) =>
                    ubah("waPengingatPelangganAktif", e.target.checked)
                  }
                  className="h-4 w-4 accent-cyan-500"
                />
                Kirim pengingat jatuh tempo langsung ke pelanggan
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Otomatis sekali per hari sesuai daftar hari di bawah, ditambah
                sekali saat lewat tempo (maks 30 hari). Hanya pelanggan yang
                punya nomor WA, bukan draft, dan belum lunas.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelCls} htmlFor="waPengingatHari">
                    Hari pengingat (H-)
                  </label>
                  <input
                    id="waPengingatHari"
                    type="text"
                    inputMode="numeric"
                    value={form.waPengingatHari}
                    onChange={(e) => ubah("waPengingatHari", e.target.value)}
                    className={inputCls}
                    placeholder="3,1,0"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Pisahkan dengan koma. 0 = dikirim di hari jatuh tempo.
                  </p>
                </div>
                <div>
                  <label className={labelCls} htmlFor="waPengingatJam">
                    Jam kirim pengingat
                  </label>
                  <input
                    id="waPengingatJam"
                    type="number"
                    min={0}
                    max={23}
                    value={form.waPengingatJam}
                    onChange={(e) =>
                      ubah("waPengingatJam", Number(e.target.value))
                    }
                    className={inputCls}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Waktu Indonesia Barat (0–23).
                  </p>
                </div>
                <div>
                  <label className={labelCls} htmlFor="urlPublik">
                    URL publik aplikasi (opsional)
                  </label>
                  <input
                    id="urlPublik"
                    type="text"
                    placeholder="http://192.168.1.10:4000"
                    value={form.urlPublik}
                    onChange={(e) => ubah("urlPublik", e.target.value)}
                    className={inputCls}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Alamat aplikasi yang bisa dibuka pelanggan — dipakai
                    variabel {"{linkTagihan}"} di template tagihan.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 border-t border-white/10 pt-4 lg:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className={labelCls} htmlFor="waTemplateTagihan">
                    Template pesan tagihan
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setLihatPratinjau(
                        lihatPratinjau === "tagihan" ? null : "tagihan"
                      )
                    }
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {lihatPratinjau === "tagihan"
                      ? "Tutup pratinjau"
                      : "Lihat pratinjau"}
                  </button>
                </div>
                <p className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">
                  Variabel:{" "}
                  {VAR_TAGIHAN.map((v) => (
                    <code
                      key={v}
                      className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-slate-300"
                    >
                      {`{${v}}`}
                    </code>
                  ))}
                </p>
                <textarea
                  id="waTemplateTagihan"
                  rows={9}
                  value={form.waTemplateTagihan}
                  onChange={(e) => ubah("waTemplateTagihan", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
                {lihatPratinjau === "tagihan" && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                    {isiTemplate(form.waTemplateTagihan, CONTOH_VAR_TAGIHAN)}
                  </pre>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {ketTempoKeterangan}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className={labelCls} htmlFor="waTemplateKwitansi">
                    Template pesan kwitansi
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setLihatPratinjau(
                        lihatPratinjau === "kwitansi" ? null : "kwitansi"
                      )
                    }
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {lihatPratinjau === "kwitansi"
                      ? "Tutup pratinjau"
                      : "Lihat pratinjau"}
                  </button>
                </div>
                <p className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">
                  Variabel:{" "}
                  {VAR_KWITANSI.map((v) => (
                    <code
                      key={v}
                      className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-slate-300"
                    >
                      {`{${v}}`}
                    </code>
                  ))}
                </p>
                <textarea
                  id="waTemplateKwitansi"
                  rows={9}
                  value={form.waTemplateKwitansi}
                  onChange={(e) => ubah("waTemplateKwitansi", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
                {lihatPratinjau === "kwitansi" && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                    {isiTemplate(form.waTemplateKwitansi, CONTOH_VAR_KWITANSI)}
                  </pre>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={ujiKirim}
                disabled={ujiStatus === "mengirim"}
                className="tombol-halus"
              >
                {ujiStatus === "mengirim" ? "Mengirim…" : "Uji kirim ke admin"}
              </button>
              {ujiStatus === "ok" && (
                <span className="text-sm text-emerald-300">{ujiPesan}</span>
              )}
              {ujiStatus === "gagal" && (
                <span className="text-sm text-rose-400">{ujiPesan}</span>
              )}
            </div>
          </section>

          {/* Link pembayaran Midtrans */}
          <section className={kartuCls}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                Link pembayaran Midtrans
              </h2>
              <label className="flex shrink-0 items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.midtransAktif}
                  onChange={(e) => ubah("midtransAktif", e.target.checked)}
                  className="h-4 w-4 accent-cyan-500"
                />
                Aktif
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Membuat link bayar dari sisa tagihan invoice — pelanggan membayar
              via QRIS, e-wallet, atau transfer tanpa konfirmasi manual. Status
              dicek dari halaman invoice dan otomatis tercatat saat lunas.
            </p>

            <div>
              <label className={labelCls} htmlFor="midtransServerKey">
                Server key
              </label>
              <input
                id="midtransServerKey"
                type="password"
                autoComplete="new-password"
                value={form.midtransServerKey}
                onChange={(e) => ubah("midtransServerKey", e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-500">
                Dari dashboard Midtrans — Settings → Access Keys.
              </p>
            </div>
            <div>
              <label className={labelCls} htmlFor="midtransMode">
                Mode
              </label>
              <select
                id="midtransMode"
                value={form.midtransMode}
                onChange={(e) => ubah("midtransMode", e.target.value)}
                className={inputCls}
              >
                <option value="sandbox">Sandbox (uji coba)</option>
                <option value="produksi">Produksi</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Gunakan sandbox bersama server key sandbox saat mencoba.
              </p>
            </div>
            <div>
              <label className={labelCls} htmlFor="midtransApiUrl">
                URL API (opsional)
              </label>
              <input
                id="midtransApiUrl"
                type="text"
                placeholder="Kosongkan untuk memakai URL resmi Midtrans"
                value={form.midtransApiUrl}
                onChange={(e) => ubah("midtransApiUrl", e.target.value)}
                className={inputCls}
              />
            </div>
          </section>

          {/* Simpan */}
          <div className="flex items-center gap-3 lg:col-span-3">
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

        {/* Keamanan */}
        <section className={`${kartuCls} lg:col-start-3`}>
          <h2 className="text-base font-semibold">Keamanan</h2>
          <form onSubmit={simpanPassword} className="space-y-4">
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
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pwStatus === "menyimpan"}
                className="tombol-halus disabled:opacity-50"
              >
                {pwStatus === "menyimpan" ? "Menyimpan…" : "Ganti password"}
              </button>
              {pwStatus === "berhasil" && (
                <span className="text-sm text-emerald-300">
                  Password diganti.
                </span>
              )}
              {pwStatus === "gagal" && (
                <span className="text-sm text-rose-400">{pwPesan}</span>
              )}
            </div>
          </form>
        </section>

        {/* Otomatisasi */}
        <div className="lg:col-span-3">
          <OtomatisasiKontrol />
        </div>

        {/* Pengguna */}
        <div className="lg:col-span-3">
          <PenggunaKontrol />
        </div>
      </div>
    </div>
  );
}
