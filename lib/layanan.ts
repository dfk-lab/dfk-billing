const PERIODE = ["BULANAN", "TAHUNAN", "SEKALI"];
const STATUS = ["AKTIF", "BERAKHIR"];

function parseTanggal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dataLayanan(body: Record<string, unknown>) {
  const error: string[] = [];
  const pelangganId = Number(body.pelangganId);
  if (!Number.isInteger(pelangganId)) error.push("Pelanggan wajib dipilih.");
  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  if (!nama) error.push("Nama layanan wajib diisi.");
  const harga = Number(body.harga);
  if (!Number.isInteger(harga) || harga < 0) error.push("Harga harus angka 0 atau lebih.");
  const periode =
    typeof body.periode === "string" && PERIODE.includes(body.periode)
      ? body.periode
      : null;
  if (!periode) error.push("Periode tidak valid.");
  const tanggalMulai =
    typeof body.tanggalMulai === "string" ? parseTanggal(body.tanggalMulai) : null;
  if (!tanggalMulai) error.push("Tanggal mulai tidak valid.");
  const tanggalAkhir =
    typeof body.tanggalAkhir === "string" && body.tanggalAkhir !== ""
      ? parseTanggal(body.tanggalAkhir)
      : null;
  if (body.tanggalAkhir && !tanggalAkhir) error.push("Tanggal akhir tidak valid.");
  const status =
    typeof body.status === "string" && STATUS.includes(body.status)
      ? body.status
      : "AKTIF";
  const perpanjangOtomatis = body.perpanjangOtomatis === true;
  const deskripsi =
    typeof body.deskripsi === "string" && body.deskripsi.trim() !== ""
      ? body.deskripsi.trim()
      : null;

  return {
    error,
    data: {
      pelangganId,
      nama,
      deskripsi,
      harga,
      periode: periode as string,
      tanggalMulai: tanggalMulai as Date,
      tanggalAkhir,
      status,
      perpanjangOtomatis,
    },
  };
}
