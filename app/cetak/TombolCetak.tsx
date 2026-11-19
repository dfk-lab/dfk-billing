"use client";

import Link from "next/link";

export default function TombolCetak({ kembaliKe }: { kembaliKe: string }) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3">
      <Link
        href={kembaliKe}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        ← Kembali
      </Link>
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
      >
        Cetak / Simpan PDF
      </button>
    </div>
  );
}
