export type KartuAngka = {
  label: string;
  nilai: string;
  aksen?: string;
};

export default function StripAngka({
  kartu,
  jumlahKolom = 4,
}: {
  kartu: KartuAngka[];
  jumlahKolom?: number;
}) {
  const kelasKolom =
    jumlahKolom === 4
      ? "sm:grid-cols-4"
      : jumlahKolom === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-2 gap-3 ${kelasKolom}`}>
      {kartu.map((k) => (
        <div key={k.label} className="kaca p-4">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {k.label}
          </p>
          <p
            className={`angka mt-1.5 truncate text-xl font-bold sm:text-2xl ${
              k.aksen ?? "text-slate-100"
            }`}
          >
            {k.nilai}
          </p>
        </div>
      ))}
    </div>
  );
}
