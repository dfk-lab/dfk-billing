"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PaymentLinkKontrol({
  invoiceId,
  sisa,
  draft,
  midtransAktif,
  urlAwal,
}: {
  invoiceId: number;
  sisa: number;
  draft: boolean;
  midtransAktif: boolean;
  urlAwal: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(urlAwal);
  const [membuat, setMembuat] = useState(false);
  const [pesan, setPesan] = useState("");
  const [gagal, setGagal] = useState(false);
  const [mengecek, setMengecek] = useState(false);
  const [pesanCek, setPesanCek] = useState("");
  const [gagalCek, setGagalCek] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  let alasan = "";
  if (!midtransAktif && !urlAwal) alasan = "Midtrans belum diaktifkan (Pengaturan).";
  else if (draft) alasan = "Invoice masih draft.";
  else if (sisa <= 0) alasan = "Invoice sudah lunas.";

  async function buat() {
    setMembuat(true);
    setPesan("");
    setPesanCek("");
    const res = await fetch(`/api/invoice/${invoiceId}/payment-link`, {
      method: "POST",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      pesan?: string;
      url?: string;
    } | null;
    setMembuat(false);
    if (res.ok && data?.ok && data.url) {
      setUrl(data.url);
      setPesan(data.pesan || "Link pembayaran dibuat.");
      setGagal(false);
      router.refresh();
    } else {
      setPesan(data?.pesan || "Gagal membuat link pembayaran.");
      setGagal(true);
    }
  }

  async function cek() {
    setMengecek(true);
    setPesanCek("");
    const res = await fetch(`/api/invoice/${invoiceId}/payment-link/cek`, {
      method: "POST",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      pesan?: string;
      lunas?: boolean;
    } | null;
    setMengecek(false);
    if (res.ok && data?.ok) {
      setPesanCek(data.pesan || "Status diperiksa.");
      setGagalCek(false);
      if (data.lunas) router.refresh();
    } else {
      setPesanCek(data?.pesan || "Gagal memeriksa status.");
      setGagalCek(true);
    }
  }

  async function salin() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setPesan("Tidak bisa menyalin — salin manual dari tautan.");
      setGagal(true);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Link pembayaran
          </h2>
          <p className="text-xs text-slate-500">
            Midtrans — tagihan sebesar sisa tagihan dibayar sekali via link.
          </p>
        </div>
        <button
          type="button"
          onClick={buat}
          disabled={membuat || Boolean(alasan)}
          title={alasan || undefined}
          className="tombol-halus shrink-0"
        >
          {membuat ? "Membuat…" : url ? "Perbarui link" : "Buat link"}
        </button>
      </div>

      {url && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block break-all font-mono text-xs text-cyan-300 hover:text-cyan-200"
          >
            {url}
          </a>
          <div className="flex gap-2">
            <button type="button" onClick={salin} className="tombol-mini">
              {tersalin ? "Tersalin!" : "Salin"}
            </button>
            <button
              type="button"
              onClick={cek}
              disabled={mengecek || Boolean(alasan)}
              title={alasan || undefined}
              className="tombol-mini"
            >
              {mengecek ? "Memeriksa…" : "Cek status"}
            </button>
          </div>
        </div>
      )}

      {pesan && (
        <p className={`text-xs ${gagal ? "text-rose-400" : "text-slate-400"}`}>
          {pesan}
        </p>
      )}
      {pesanCek && (
        <p className={`text-xs ${gagalCek ? "text-rose-400" : "text-emerald-300"}`}>
          {pesanCek}
        </p>
      )}
    </div>
  );
}
