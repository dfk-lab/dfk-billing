"use client";

import { useState } from "react";

export default function TagihanLink({ kode }: { kode: string }) {
  const [tercopy, setTercopy] = useState(false);

  async function salin() {
    const url = `${window.location.origin}/tagihan/${kode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setTercopy(true);
    setTimeout(() => setTercopy(false), 2000);
  }

  return (
    <button type="button" onClick={salin} className="tombol-halus">
      {tercopy ? "Tautan tersalin ✓" : "Salin tautan tagihan"}
    </button>
  );
}
