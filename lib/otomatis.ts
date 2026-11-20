import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { nomorInvoiceBerikutnya } from "@/lib/invoice";
import { dumpCadangan } from "@/lib/cadangan";
import { formatRupiah, formatTanggal, hitungTotal } from "@/lib/format";
import { kirimWaAman } from "@/lib/wa";

const PERIODE_BERULANG = ["BULANAN", "TAHUNAN"];
const MAKS_TANGKAPAN_PER_LAYANAN = 12;
const MAKS_FILE_CADANGAN = 10;

export function folderCadangan() {
  return process.env.CADANGAN_DIR || path.join(process.cwd(), "cadangan-otomatis");
}

function hariIniUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function tanggalISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function tambahPeriode(d: Date, periode: string) {
  const hasil = new Date(d.getTime());
  if (periode === "TAHUNAN") hasil.setUTCFullYear(hasil.getUTCFullYear() + 1);
  else hasil.setUTCMonth(hasil.getUTCMonth() + 1);
  return hasil;
}

const fmtTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export async function jalankanInvoiceOtomatis() {
  const setting = (await prisma.setting.findFirst()) ?? (await prisma.setting.create({ data: {} }));
  const ppn = setting.ppnDefault;
  const jatuhTempoHari = setting.jatuhTempoHari;
  const hariIni = hariIniUTC();

  const daftar = await prisma.layanan.findMany({
    where: {
      status: "AKTIF",
      perpanjangOtomatis: true,
      periode: { in: PERIODE_BERULANG },
    },
    include: { pelanggan: { select: { nama: true } } },
    orderBy: { id: "asc" },
  });

  const dibuat: { nomor: string; layanan: string; pelanggan: string }[] = [];

  for (const l of daftar) {
    if (!l.tanggalAkhir) continue;
    let akhir = l.tanggalAkhir;
    let iter = 0;

    while (akhir.getTime() < hariIni.getTime() && iter < MAKS_TANGKAPAN_PER_LAYANAN) {
      iter += 1;
      const awalBaru = akhir;
      const akhirBaru = tambahPeriode(akhir, l.periode);
      const nomor = await nomorInvoiceBerikutnya();
      const jatuhTempo = new Date(hariIni.getTime() + jatuhTempoHari * 86400000);

      await prisma.$transaction(async (tx) => {
        await tx.invoice.create({
          data: {
            nomor,
            pelangganId: l.pelangganId,
            layananId: l.id,
            tanggal: hariIni,
            jatuhTempo,
            status: "TERKIRIM",
            ppnPersen: ppn,
            dibuatOtomatis: true,
            items: {
              create: {
                deskripsi: `${l.nama} (${fmtTanggal.format(awalBaru)} – ${fmtTanggal.format(akhirBaru)})`,
                qty: 1,
                hargaSatuan: l.harga,
              },
            },
          },
        });
        await tx.layanan.update({
          where: { id: l.id },
          data: { tanggalAkhir: akhirBaru },
        });
      });

      dibuat.push({ nomor, layanan: l.nama, pelanggan: l.pelanggan.nama });
      akhir = akhirBaru;
    }
  }

  await prisma.setting.update({
    where: { id: setting.id },
    data: { lastRunInvoiceOtomatis: new Date() },
  });

  return { dibuat, jumlah: dibuat.length };
}

export function validasiNamaCadangan(nama: string) {
  return /^[A-Za-z0-9._-]+\.json$/.test(nama) && !nama.includes("..");
}

export async function buatCadanganOtomatis() {
  const folder = folderCadangan();
  await fs.mkdir(folder, { recursive: true });
  const kini = new Date();
  const nama = `cadangan-${kini.toISOString().slice(0, 19).replace("T", "-").replaceAll(":", "-")}.json`;
  const isi = JSON.stringify(await dumpCadangan(), null, 2);
  await fs.writeFile(path.join(folder, nama), isi, "utf8");

  const semua = (await fs.readdir(folder))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f);
  if (semua.length > MAKS_FILE_CADANGAN) {
    const berstat = await Promise.all(
      semua.map(async (f) => ({
        f,
        mtime: (await fs.stat(path.join(folder, f))).mtimeMs,
      }))
    );
    berstat.sort((a, b) => b.mtime - a.mtime);
    for (const tua of berstat.slice(MAKS_FILE_CADANGAN)) {
      await fs.rm(path.join(folder, tua.f)).catch(() => {});
    }
  }

  const setting = await prisma.setting.findFirst();
  if (setting) {
    await prisma.setting.update({
      where: { id: setting.id },
      data: { lastRunBackupOtomatis: kini },
    });
  }
  return nama;
}

export type InfoCadangan = { nama: string; ukuran: number; tanggal: string };

export async function daftarCadanganOtomatis(): Promise<InfoCadangan[]> {
  const folder = folderCadangan();
  let namaFile: string[];
  try {
    namaFile = await fs.readdir(folder);
  } catch {
    return [];
  }
  const hasil = await Promise.all(
    namaFile
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const stat = await fs.stat(path.join(folder, f));
        return { nama: f, ukuran: stat.size, tanggal: stat.mtime.toISOString() };
      })
  );
  return hasil.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
}

export async function statusOtomatis() {
  const setting = (await prisma.setting.findFirst()) ?? (await prisma.setting.create({ data: {} }));
  const schedulerAktif =
    (globalThis as Record<string, unknown>).__dfkSchedulerAktif === true;
  return {
    backupOtomatisAktif: setting.backupOtomatisAktif,
    lastRunInvoiceOtomatis: setting.lastRunInvoiceOtomatis?.toISOString() ?? null,
    lastRunBackupOtomatis: setting.lastRunBackupOtomatis?.toISOString() ?? null,
    schedulerAktif,
    jumlahCadangan: (await daftarCadanganOtomatis()).length,
  };
}

export async function ubahBackupOtomatisAktif(aktif: boolean) {
  const setting = (await prisma.setting.findFirst()) ?? (await prisma.setting.create({ data: {} }));
  await prisma.setting.update({
    where: { id: setting.id },
    data: { backupOtomatisAktif: aktif },
  });
  return aktif;
}

export async function jalankanTugasHarian() {
  const setting = (await prisma.setting.findFirst()) ?? (await prisma.setting.create({ data: {} }));
  const hariIni = tanggalISO(hariIniUTC());
  const catatan: string[] = [];

  if (tanggalISO(setting.lastRunInvoiceOtomatis ?? new Date(0)) !== hariIni) {
    const hasil = await jalankanInvoiceOtomatis();
    if (hasil.jumlah > 0)
      catatan.push(`Invoice otomatis: ${hasil.jumlah} invoice dibuat.`);
  }

  if (
    setting.backupOtomatisAktif &&
    tanggalISO(setting.lastRunBackupOtomatis ?? new Date(0)) !== hariIni
  ) {
    const nama = await buatCadanganOtomatis();
    catatan.push(`Cadangan harian: ${nama}.`);
  }

  if (
    setting.waAktif &&
    tanggalISO(setting.lastRunPengingatWa ?? new Date(0)) !== hariIni
  ) {
    const jumlah = await kirimPengingatJatuhTempo(setting.namaUsaha);
    catatan.push(`Pengingat WA: ${jumlah} terkirim.`);
    await prisma.setting.update({
      where: { id: setting.id },
      data: { lastRunPengingatWa: new Date() },
    });
  }

  return catatan;
}

async function kirimPengingatJatuhTempo(namaUsaha: string): Promise<number> {
  const mulai = hariIniUTC();
  const selesai = new Date(mulai.getTime() + 86400000);

  const daftar = await prisma.invoice.findMany({
    where: {
      status: { not: "DRAFT" },
      waPengingatDikirim: false,
      jatuhTempo: { gte: mulai, lt: selesai },
    },
    include: {
      pelanggan: { select: { nama: true, telepon: true } },
      items: true,
      pembayaran: { select: { jumlah: true } },
    },
  });

  let terkirim = 0;
  for (const inv of daftar) {
    const total = hitungTotal(
      inv.items.map((it) => ({
        deskripsi: it.deskripsi,
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
      })),
      inv.diskonPersen,
      inv.ppnPersen
    ).total;
    const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);

    if (dibayar >= total) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { waPengingatDikirim: true },
      });
      continue;
    }
    if (!inv.pelanggan.telepon) continue;

    const hasil = await kirimWaAman(
      inv.pelanggan.telepon,
      `*${namaUsaha}*\n\n` +
        `Halo *${inv.pelanggan.nama}*, ini pengingat pembayaran.\n\n` +
        `No. Invoice: ${inv.nomor}\n` +
        `Jatuh tempo: HARI INI (${formatTanggal(inv.jatuhTempo!.toISOString())})\n` +
        `Total: ${formatRupiah(total)}\n` +
        `Sisa: ${formatRupiah(total - dibayar)}\n\n` +
        `Mohon segera lakukan pembayaran. Terima kasih.`
    );
    if (hasil?.ok) {
      terkirim += 1;
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { waPengingatDikirim: true },
      });
    }
  }
  return terkirim;
}
