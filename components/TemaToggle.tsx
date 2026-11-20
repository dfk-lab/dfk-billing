"use client";

import { useEffect, useState } from "react";

function Ikon({ ukuran, children }: { ukuran: number; children: React.ReactNode }) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function TemaToggle({
  ukuran = 15,
  className = "tombol-mini",
  denganLabel = false,
}: {
  ukuran?: number;
  className?: string;
  denganLabel?: boolean;
}) {
  const [terang, setTerang] = useState(false);

  useEffect(() => {
    setTerang(document.documentElement.dataset.tema === "terang");
  }, []);

  function ganti() {
    const t = terang ? "gelap" : "terang";
    document.documentElement.dataset.tema = t;
    try {
      localStorage.setItem("dfk-tema", t);
    } catch {}
    setTerang(t === "terang");
  }

  return (
    <button
      type="button"
      onClick={ganti}
      className={className}
      title={terang ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
      aria-label={terang ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
    >
      {terang ? (
        <Ikon ukuran={ukuran}>
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </Ikon>
      ) : (
        <Ikon ukuran={ukuran}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </Ikon>
      )}
      {denganLabel && <span>{terang ? "Mode gelap" : "Mode terang"}</span>}
    </button>
  );
}
