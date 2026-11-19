import { prisma } from "@/lib/prisma";
import PelangganClient from "./PelangganClient";

export const instant = false;

export default async function PelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const daftar = await prisma.pelanggan.findMany({
    where: q
      ? {
          OR: [
            { nama: { contains: q } },
            { perusahaan: { contains: q } },
            { telepon: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { nama: "asc" },
  });

  return <PelangganClient daftar={daftar} q={q} />;
}
