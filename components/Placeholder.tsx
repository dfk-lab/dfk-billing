export default function Placeholder({
  judul,
  tahap,
}: {
  judul: string;
  tahap: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-10">
      <h1 className="text-xl font-semibold text-slate-100">{judul}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Bagian ini akan dibuat pada {tahap}.
      </p>
    </div>
  );
}
