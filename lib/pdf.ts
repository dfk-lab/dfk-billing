import PDFDocument from "pdfkit";
import {
  formatRupiah,
  formatTanggal,
  hitungTotal,
  LABEL_METODE,
} from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";
import { bacaBerkas } from "@/lib/upload";

const M = 42.5; // 15mm
const LEBAR = 595.28;
const TINGGI = 841.89;
const DALAM = LEBAR - M * 2;

const GELAP = "#18181b";
const ABU = "#52525b";
const ABU_MUDA = "#a1a1aa";
const GARIS = "#d4d4d8";
const LATAR = "#f4f4f5";

type SettingPdf = {
  namaUsaha?: string | null;
  namaPemilik?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  logo?: string | null;
  namaBank?: string | null;
  noRekening?: string | null;
  atasNamaRekening?: string | null;
  gambarQris?: string | null;
  gambarTandaTangan?: string | null;
  footerDokumen?: string | null;
  catatanKwitansi?: string | null;
};

type InvoicePdf = {
  nomor: string;
  tanggal: Date;
  jatuhTempo: Date | null;
  status: string;
  catatan?: string | null;
  diskonPersen: number;
  ppnPersen: number;
  pelanggan: { nama: string; perusahaan?: string | null; alamat?: string | null; telepon?: string | null };
  layanan?: { nama: string } | null;
  items: { id: number; deskripsi: string; qty: number; hargaSatuan: number }[];
  pembayaran: { jumlah: number }[];
};

type KwitansiPdf = {
  nomor: string;
  tanggal: Date;
  penerima?: string | null;
  pembayaran: {
    jumlah: number;
    metode?: string | null;
    tanggal: Date;
    invoice: {
      nomor: string;
      items: { deskripsi: string }[];
      pelanggan: { nama: string; perusahaan?: string | null };
    };
  };
};

function dataUrlKeBuffer(nilai: string): Buffer | null {
  const m = /^data:image\/[a-zA-Z+]+;base64,(.+)$/.exec(nilai.trim());
  if (m) return Buffer.from(m[1], "base64");
  if (nilai.startsWith("/api/berkas/")) {
    return bacaBerkas(nilai.slice("/api/berkas/".length));
  }
  return null;
}

type Doc = PDFKit.PDFDocument;

function gambarkanHeader(
  doc: Doc,
  s: SettingPdf,
  judul: string,
  barisNomor: string
) {
  let y = M;
  const adaLogo = Boolean(s.logo);
  if (adaLogo) {
    const buf = dataUrlKeBuffer(s.logo!);
    if (buf) {
      try {
        doc.image(buf, M, M, { fit: [44, 44] });
      } catch {
        // gambar tidak didukung pdfkit — lewati
      }
    }
  }
  const xTeks = M + (adaLogo ? 54 : 0);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(GELAP);
  doc.text(s.namaUsaha || "DFK Billing", xTeks, y, { lineGap: 1 });
  doc.font("Helvetica").fontSize(8.5).fillColor(ABU);
  if (s.alamat) doc.text(s.alamat, xTeks, doc.y + 3, { lineGap: 1 });
  const kontak = [s.telepon, s.email].filter(Boolean).join(" · ");
  if (kontak) doc.text(kontak, xTeks, doc.y + 2, { lineGap: 1 });
  const bawahKiri = doc.y;

  doc.font("Helvetica-Bold").fontSize(21).fillColor(GELAP);
  doc.text(judul, M, M, { width: DALAM, align: "right", characterSpacing: 2 });
  doc.fontSize(10);
  doc.text(barisNomor, M, doc.y + 5, { width: DALAM, align: "right" });
  const bawahKanan = doc.y;

  const yGaris = Math.max(bawahKiri, bawahKanan) + 12;
  doc.save().lineWidth(2).strokeColor(GELAP);
  doc.moveTo(M, yGaris).lineTo(LEBAR - M, yGaris).stroke();
  doc.restore();
  return yGaris + 20;
}

function tandaTangan(
  doc: Doc,
  s: SettingPdf,
  yAwal: number,
  label: string,
  namaBawah: string
) {
  const lebar = 200;
  const x = LEBAR - M - lebar;
  let y = yAwal;
  doc.font("Helvetica").fontSize(9.5).fillColor(ABU);
  doc.text(label, x, y, { width: lebar, align: "center" });
  y += 16;
  const buf = s.gambarTandaTangan ? dataUrlKeBuffer(s.gambarTandaTangan) : null;
  if (buf) {
    try {
      // openImage ada di runtime pdfkit tapi belum terdaftar di @types/pdfkit
      const img = (
        doc as unknown as {
          openImage: (src: Buffer) => { width: number; height: number };
        }
      ).openImage(buf);
      const skala = Math.min(150 / img.width, 51 / img.height);
      const w = img.width * skala;
      doc.image(buf, x + (lebar - w) / 2, y, { height: img.height * skala });
      y += 51 * Math.min(1, skala + 0.2);
    } catch {
      // lewati gambar rusak
    }
  }
  y += 6;
  doc.save().lineWidth(0.8).strokeColor(ABU_MUDA);
  doc.moveTo(x + 20, y).lineTo(x + lebar - 20, y).stroke();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(GELAP);
  doc.text(namaBawah, x, y + 6, { width: lebar, align: "center" });
}

function gambarkanFooter(doc: Doc, s: SettingPdf) {
  if (!s.footerDokumen) return;
  const y = TINGGI - M - 24;
  doc.save().lineWidth(0.7).strokeColor(GARIS);
  doc.moveTo(M, y - 12).lineTo(LEBAR - M, y - 12).stroke();
  doc.restore();
  doc.font("Helvetica").fontSize(8).fillColor(ABU_MUDA);
  doc.text(s.footerDokumen, M, y, { width: DALAM, align: "center" });
}

export function buatInvoicePdf(inv: InvoicePdf, s: SettingPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: inv.nomor } });
    const bagian: Buffer[] = [];
    doc.on("data", (c: Buffer) => bagian.push(c));
    doc.on("end", () => resolve(Buffer.concat(bagian)));
    doc.on("error", reject);

    const yAwal = gambarkanHeader(doc, s, "INVOICE", inv.nomor);
    let y = yAwal;

    // Info pelanggan (kiri) & tanggal (kanan)
    doc.font("Helvetica").fontSize(7.5).fillColor(ABU_MUDA);
    doc.text("KEPADA", M, y, { characterSpacing: 1.5 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(GELAP);
    doc.text(inv.pelanggan.nama, M, doc.y + 5, { lineGap: 1 });
    doc.font("Helvetica").fontSize(9).fillColor(ABU);
    if (inv.pelanggan.perusahaan)
      doc.text(inv.pelanggan.perusahaan, M, doc.y + 2, { lineGap: 1 });
    if (inv.pelanggan.alamat)
      doc.text(inv.pelanggan.alamat, M, doc.y + 2, {
        width: 280,
        lineGap: 1,
      });
    if (inv.pelanggan.telepon)
      doc.text(inv.pelanggan.telepon, M, doc.y + 2, { lineGap: 1 });
    const bawahKiri = doc.y;

    const infoKanan: [string, string][] = [
      ["Tanggal", formatTanggal(inv.tanggal.toISOString())],
      [
        "Jatuh tempo",
        inv.jatuhTempo ? formatTanggal(inv.jatuhTempo.toISOString()) : "—",
      ],
    ];
    if (inv.layanan) infoKanan.push(["Layanan", inv.layanan.nama]);
    let yKanan = y;
    for (const [label, nilai] of infoKanan) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(ABU);
      doc.text(`${label}:`, M, yKanan, { width: DALAM, align: "right" });
      const lebarLabel = doc.widthOfString(`${label}:  `);
      doc.font("Helvetica").fontSize(9).fillColor(GELAP);
      doc.text(nilai, M, yKanan, {
        width: DALAM - lebarLabel,
        align: "right",
        lineGap: 1,
      });
      yKanan = doc.y + 4;
    }
    y = Math.max(bawahKiri, yKanan) + 18;

    // Tabel item
    const kolom = { deskripsi: 280, qty: 55, harga: 85, jumlah: 90 };
    const xQty = M + kolom.deskripsi;
    const xHarga = xQty + kolom.qty;
    const xJumlah = xHarga + kolom.harga;
    const tinggiBaris = 20;

    doc.save();
    doc.rect(M, y, DALAM, tinggiBaris).fill(LATAR);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GELAP);
    doc.text("Deskripsi", M + 6, y + 6);
    doc.text("Qty", xQty, y + 6, { width: kolom.qty - 12, align: "right" });
    doc.text("Harga satuan", xHarga, y + 6, {
      width: kolom.harga - 12,
      align: "right",
    });
    doc.text("Jumlah", xJumlah, y + 6, {
      width: kolom.jumlah - 12,
      align: "right",
    });
    y += tinggiBaris;

    doc.font("Helvetica").fontSize(9).fillColor(GELAP);
    for (const it of inv.items) {
      doc.font("Helvetica").fontSize(9).fillColor(GELAP);
      const teksDesk = it.deskripsi;
      const lebarTeks = doc.widthOfString(teksDesk);
      const barisDesk = lebarTeks > kolom.deskripsi - 12 ? doc.heightOfString(teksDesk, { width: kolom.deskripsi - 12 }) : 12;
      const tinggi = Math.max(tinggiBaris, barisDesk + 10);
      if (y + tinggi > TINGGI - 260) {
        doc.addPage();
        y = M;
      }
      doc.text(teksDesk, M + 6, y + 6, {
        width: kolom.deskripsi - 12,
        lineGap: 1,
      });
      const teksQty = Number.isInteger(it.qty)
        ? String(it.qty)
        : it.qty.toLocaleString("id-ID", { maximumFractionDigits: 2 });
      doc.text(teksQty, xQty, y + 6, {
        width: kolom.qty - 12,
        align: "right",
      });
      doc.text(formatRupiah(it.hargaSatuan), xHarga, y + 6, {
        width: kolom.harga - 12,
        align: "right",
      });
      doc.text(formatRupiah(it.qty * it.hargaSatuan), xJumlah, y + 6, {
        width: kolom.jumlah - 12,
        align: "right",
      });
      y += tinggi;
      doc.save().lineWidth(0.6).strokeColor(GARIS);
      doc.moveTo(M, y).lineTo(LEBAR - M, y).stroke();
      doc.restore();
    }
    y += 14;

    // Ringkasan
    const { subtotal, diskon, ppn, total } = hitungTotal(
      inv.items,
      inv.diskonPersen,
      inv.ppnPersen
    );
    const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
    const sisa = Math.max(total - dibayar, 0);
    const xRingkas = LEBAR - M - 210;

    doc.font("Helvetica").fontSize(9.5).fillColor(ABU);
    doc.text("Subtotal", xRingkas, y, { width: 130 });
    doc.fillColor(GELAP);
    doc.text(formatRupiah(subtotal), xRingkas, y, {
      width: 210,
      align: "right",
    });
    y += 15;
    if (diskon > 0) {
      doc.font("Helvetica").fontSize(9.5).fillColor(ABU);
      doc.text(`Diskon (${inv.diskonPersen}%)`, xRingkas, y, { width: 130 });
      doc.fillColor(GELAP);
      doc.text(`-${formatRupiah(diskon)}`, xRingkas, y, {
        width: 210,
        align: "right",
      });
      y += 15;
    }
    if (ppn > 0) {
      doc.font("Helvetica").fontSize(9.5).fillColor(ABU);
      doc.text(`PPN (${inv.ppnPersen}%)`, xRingkas, y, { width: 130 });
      doc.fillColor(GELAP);
      doc.text(formatRupiah(ppn), xRingkas, y, { width: 210, align: "right" });
      y += 15;
    }
    y += 4;
    doc.save().lineWidth(1.5).strokeColor(GELAP);
    doc.moveTo(xRingkas, y).lineTo(LEBAR - M, y).stroke();
    doc.restore();
    y += 10;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(GELAP);
    doc.text("Total", xRingkas, y, { width: 130 });
    doc.text(formatRupiah(total), xRingkas, y, { width: 210, align: "right" });
    y += 19;
    if (dibayar > 0) {
      doc.font("Helvetica").fontSize(9.5).fillColor(ABU);
      doc.text("Dibayar", xRingkas, y, { width: 130 });
      doc.text(formatRupiah(dibayar), xRingkas, y, {
        width: 210,
        align: "right",
      });
      y += 14;
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(GELAP);
      doc.text("Sisa", xRingkas, y, { width: 130 });
      doc.text(formatRupiah(sisa), xRingkas, y, { width: 210, align: "right" });
      y += 15;
    }

    // Catatan
    if (inv.catatan) {
      y = Math.max(y + 14, y);
      doc.font("Helvetica").fontSize(7.5).fillColor(ABU_MUDA);
      doc.text("CATATAN", M, y + 6, { characterSpacing: 1.5 });
      doc.font("Helvetica").fontSize(9).fillColor("#3f3f46");
      doc.text(inv.catatan, M, doc.y + 5, { width: DALAM, lineGap: 1 });
    }

    // Kotak pembayaran (transfer bank / QRIS)
    const bankAda = s.namaBank || s.noRekening || s.atasNamaRekening;
    const qrisBuf = s.gambarQris ? dataUrlKeBuffer(s.gambarQris) : null;
    if (bankAda || qrisBuf) {
      const teksBank = bankAda
        ? `${[s.namaBank, s.noRekening]
            .filter(Boolean)
            .join(" — ")}${s.atasNamaRekening ? ` a.n. ${s.atasNamaRekening}` : ""}`
        : null;
      const lebarTeks = DALAM - 20 - (qrisBuf ? 88 : 0);
      doc.font("Helvetica").fontSize(9);
      const tinggiTeks = teksBank
        ? Math.max(doc.heightOfString(teksBank, { width: lebarTeks }), 12)
        : 0;
      const atas = TINGGI - M - 84 - (qrisBuf ? 20 : 0);
      const tinggiKotak = Math.max(qrisBuf ? 100 : 0, 38 + tinggiTeks);
      // Kotak digambar sebelum teks & gambar agar tidak menutupinya
      doc.save();
      doc.rect(M, atas, DALAM, tinggiKotak).fillAndStroke("#fafafa", GARIS);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(9).fillColor(GELAP);
      doc.text(
        bankAda ? "Pembayaran via transfer bank:" : "Pembayaran via QRIS:",
        M + 10,
        atas + 10
      );
      doc.font("Helvetica").fontSize(9).fillColor("#3f3f46");
      if (teksBank) {
        doc.text(teksBank, M + 10, doc.y + 4, { width: lebarTeks, lineGap: 1 });
      }
      if (qrisBuf) {
        doc.text("Scan QRIS di samping", M + 10, doc.y + 4, {
          width: lebarTeks,
          lineGap: 1,
        });
        try {
          doc.image(qrisBuf, LEBAR - M - 88, atas + 10, { fit: [76, 76] });
        } catch {
          // gambar tidak didukung pdfkit — lewati
        }
      }
    }

    // Tanda tangan — dinaikkan saat ada QRIS agar tidak menimpa kotak pembayaran
    tandaTangan(
      doc,
      s,
      TINGGI - M - 130 - (qrisBuf ? 20 : 0),
      "Hormat kami,",
      s.namaPemilik || s.namaUsaha || "DFK Billing"
    );

    gambarkanFooter(doc, s);
    doc.end();
  });
}

export function buatKwitansiPdf(
  kw: KwitansiPdf,
  s: SettingPdf
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: kw.nomor } });
    const bagian: Buffer[] = [];
    doc.on("data", (c: Buffer) => bagian.push(c));
    doc.on("end", () => resolve(Buffer.concat(bagian)));
    doc.on("error", reject);

    const y = gambarkanHeader(doc, s, "KWITANSI", `No. ${kw.nomor}`);
    let kursor = y + 24;
    const xLabel = M;
    const lebarLabel = 119; // 42mm
    const xNilai = xLabel + lebarLabel;
    const lebarNilai = LEBAR - M - xNilai;

    function baris(
      label: string,
      nilai: string,
      opsi: { tebal?: boolean; bungkus?: boolean } = {}
    ) {
      doc.font("Helvetica").fontSize(9.5).fillColor(ABU);
      doc.text(label, xLabel, kursor + 2, { width: lebarLabel, lineGap: 1 });
      doc
        .font(opsi.tebal ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .fillColor(GELAP);
      const tinggiTeks = opsi.bungkus
        ? Math.max(doc.heightOfString(nilai, { width: lebarNilai, lineGap: 2 }), 13)
        : 13;
      doc.text(nilai, xNilai, kursor, {
        width: lebarNilai,
        lineGap: 2,
      });
      const yGaris = kursor + tinggiTeks + 4;
      doc.save()
        .lineWidth(0.7)
        .dash(1.2, { space: 2.4 })
        .strokeColor(ABU_MUDA);
      doc.moveTo(xNilai, yGaris).lineTo(LEBAR - M, yGaris).stroke();
      doc.restore();
      kursor = yGaris + 14;
    }

    baris(
      "Telah terima pembayaran dari",
      `${kw.pembayaran.invoice.pelanggan.nama}${
        kw.pembayaran.invoice.pelanggan.perusahaan
          ? ` (${kw.pembayaran.invoice.pelanggan.perusahaan})`
          : ""
      }`,
      { tebal: true }
    );
    baris("Sejumlah uang", formatRupiah(kw.pembayaran.jumlah), { tebal: true });
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#3f3f46");
    doc.text(`Terbilang: ${terbilangRupiah(kw.pembayaran.jumlah)}`, M, kursor, {
      width: DALAM,
      lineGap: 1,
    });
    kursor = doc.y + 14;
    baris(
      "Untuk pembayaran",
      `Invoice ${kw.pembayaran.invoice.nomor}${
        kw.pembayaran.invoice.items.length > 0
          ? ` — ${kw.pembayaran.invoice.items
              .map((it) => it.deskripsi)
              .join(", ")}`
          : ""
      }${kw.pembayaran.metode ? ` (${LABEL_METODE[kw.pembayaran.metode] ?? kw.pembayaran.metode})` : ""}`,
      { bungkus: true }
    );
    baris("Tanggal", formatTanggal(kw.tanggal.toISOString()));

    tandaTangan(
      doc,
      s,
      kursor + 34,
      "Penerima,",
      kw.penerima || s.namaUsaha || "DFK Billing"
    );

    if (s.catatanKwitansi) {
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(ABU_MUDA);
      doc.text(s.catatanKwitansi, M, TINGGI - M - 60, {
        width: DALAM,
        lineGap: 1,
      });
    }

    gambarkanFooter(doc, s);
    doc.end();
  });
}
