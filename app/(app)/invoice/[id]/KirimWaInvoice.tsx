"use client";

import { useState } from "react";

export default function KirimWaInvoice({
  invoiceId,
  telepon,
  draft,
  waAktif,
}: {
  invoiceId: number;
  telepon: string | null;
  draft: boolean;
  waAktif: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "mengirim" | "ok" | "gagal">(
    "idle"
  );
  const [pesan, setPesan] = useState("");

  let nonaktifAlasan = "";
  if (!waAktif) nonaktifAlasan = "Notifikasi WhatsApp tidak aktif (Pengaturan).";
  else if (draft) nonaktifAlasan = "Invoice masih draft.";
  else if (!telepon) nonaktifAlasan = "Pelanggan tidak punya nomor WA.";

  async function kirim() {
    setStatus("mengirim");
    setPesan("");
    const res = await fetch(`/api/invoice/${invoiceId}/wa`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      pesan?: string;
    } | null;
    if (res.ok && data?.ok) {
      setStatus("ok");
      setPesan(data.pesan || "Terkirim ke pelanggan.");
    } else {
      setStatus("gagal");
      setPesan(data?.pesan || "Gagal mengirim.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={kirim}
        disabled={status === "mengirim" || Boolean(nonaktifAlasan)}
        title={nonaktifAlasan || "Kirim ringkasan tagihan ke WhatsApp pelanggan"}
        className="tombol-halus"
      >
        {status === "mengirim" ? "Mengirim…" : "Kirim WA"}
      </button>
      {status === "ok" && (
        <span className="text-xs text-emerald-300">{pesan}</span>
      )}
      {status === "gagal" && (
        <span className="max-w-[220px] text-right text-xs text-rose-400">
          {pesan}
        </span>
      )}
    </div>
  );
}
