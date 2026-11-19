export default function Placeholder({
  judul,
  tahap,
}: {
  judul: string;
  tahap: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10">
      <h1 className="text-xl font-semibold">{judul}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Bagian ini akan dibuat pada {tahap}.
      </p>
    </div>
  );
}
