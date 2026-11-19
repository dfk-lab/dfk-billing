export function dataPelanggan(body: Record<string, unknown>) {
  const str = (k: string) =>
    typeof body[k] === "string" && (body[k] as string).trim() !== ""
      ? (body[k] as string).trim()
      : null;
  return {
    nama: typeof body.nama === "string" ? body.nama.trim() : "",
    perusahaan: str("perusahaan"),
    email: str("email"),
    telepon: str("telepon"),
    alamat: str("alamat"),
    catatan: str("catatan"),
  };
}
