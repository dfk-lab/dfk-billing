# DFK Billing

Aplikasi web **invoice & kwitansi tagihan** untuk jasa IT — domain, hosting, VPS, SSL, dan jasa lainnya. Dibuat untuk berjalan penuh secara online di server sendiri (misal CasaOS), dengan login satu akun admin.

## Fitur

- **Dashboard** — piutang berjalan, pembayaran bulan ini, grafik 6 bulan, layanan yang perlu diperpanjang, invoice jatuh tempo dekat, pembayaran terbaru
- **Pelanggan** — CRUD lengkap + impor massal CSV
- **Layanan & langganan** — harga per periode (Bulanan / Tahunan / Sekali bayar), status masa aktif
- **Invoice** — multi-item, diskon & PPN, nomor otomatis (`INV/202611/0001`), status Draft/Terkirim, badge efektif Lunas/Jatuh tempo
- **Invoice otomatis** — layanan Bulanan/Tahunan dengan opsi "Perpanjang otomatis" dibuatkan invoice periode berikutnya saat masa berakhir (scheduler internal, pemeriksaan tiap 15 menit)
- **Pembayaran & kwitansi** — catat pembayaran, kwitansi otomatis bernomor, terbilang otomatis
- **Cetak / PDF** — halaman cetak A4 untuk invoice & kwitansi (kop usaha, logo, tanda tangan, rekening)
- **Laporan** — ringkasan tahunan, grafik 12 bulan, umur piutang (aging 5 bucket)
- **Cadangan** — unduh/pulihkan seluruh data (JSON), plus **cadangan harian otomatis** (maksimal 10 file, bisa diunduh/dihapus dari Pengaturan)
- **Pengaturan** — identitas usaha, logo, tanda tangan, rekening bank, awalan nomor dokumen, PPN default, jatuh tempo
- **Responsif** — tabel berubah menjadi kartu di layar kecil, sidebar menjadi drawer

## Teknologi

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 6 + SQLite · JWT (jose) + bcrypt · Docker

## Menjalankan secara lokal (pengembangan)

```bash
npm install
cp .env.example .env        # lalu isi DATABASE_URL dan AUTH_SECRET
npx prisma db push          # buat skema database
npm run dev
```

Buka <http://localhost:4000> — saat pertama kali Anda diminta membuat password admin.

## Deploy di CasaOS (Docker)

### Cara 1 — Docker Compose (disarankan)

1. Kloning repositori ini di server CasaOS Anda:

   ```bash
   git clone https://github.com/<akun-anda>/dfk-billing.git
   cd dfk-billing
   ```

2. Buka file `docker-compose.yml` dan **ganti nilai `AUTH_SECRET`** dengan string acak panjang (misal hasil `openssl rand -hex 32`).

3. Buat aplikasi Compose di CasaOS: **App Store → Install (ikon +) → Custom Install**, atau dari terminal:

   ```bash
   docker compose up -d --build
   ```

4. Aplikasi tersedia di `http://<ip-server>:4000`. Data tersimpan di folder `./data` (database SQLite + cadangan otomatis) — aman di-update karena berada di volume.

### Cara 2 — docker run manual

```bash
docker build -t dfk-billing .
mkdir -p data
docker run -d --name dfk-billing --restart unless-stopped \
  -p 4000:4000 \
  -e DATABASE_URL=file:/app/data/dfk.db \
  -e AUTH_SECRET="ganti-dengan-string-acak-panjang" \
  -e CADANGAN_DIR=/app/data/cadangan-otomatis \
  -v "$(pwd)/data:/app/data" \
  dfk-billing
```

### Saat pertama kali dijalankan

1. Buka `http://<ip-server>:4000` → halaman login menampilkan **pembuatan password admin** (sekali saja).
2. Masuk ke menu **Pengaturan** → isi identitas usaha, logo, tanda tangan, rekening, awalan nomor dokumen.
3. Tambah **Pelanggan** → **Layanan** → buat **Invoice** → catat **Pembayaran** (kwitansi terbentuk otomatis).
4. Untuk langganan berulang, centang **Perpanjang otomatis** pada layanan — invoice periode berikutnya dibuat sendiri saat masa berakhir.

### Backup & restore

- **Otomatis**: aktif secara default — tiap hari satu file JSON di `data/cadangan-otomatis/` (maksimal 10 file). Matikan/nyalakan dari **Pengaturan → Otomatisasi**.
- **Manual**: menu **Laporan → Cadangan** — *Unduh cadangan* untuk menyimpan di luar server, *Pulihkan dari JSON* untuk mengganti seluruh data (butuh konfirmasi dua kali).
- Restore juga bisa dilakukan dengan menaruh file JSON lama ke server lalu memulihkannya lewat menu yang sama.

### Memperbarui aplikasi

```bash
cd dfk-billing
git pull
docker compose up -d --build
```

Skema database diterapkan otomatis saat kontainer menyala (`prisma db push` — aman untuk penambahan kolom). Data di volume tidak tersentuh.

## Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Lokasi file SQLite, contoh Docker: `file:/app/data/dfk.db` |
| `AUTH_SECRET` | ya | Kunci tanda-tangan JWT sesi login — gunakan string acak panjang |
| `CADANGAN_DIR` | tidak | Folder cadangan otomatis (default `./cadangan-otomatis`) |

## Struktur penting

```
app/(app)/            Halaman utama (dashboard, pelanggan, layanan, invoice, kwitansi, laporan, pengaturan)
app/(auth)/login      Login + setup pertama
app/cetak/            Halaman cetak A4 invoice & kwitansi
app/api/              API routes (CRUD + cadangan + otomatisasi)
lib/                  Prisma, auth, validator, terbilang, otomatisasi, scheduler
instrumentation.ts    Menjalankan scheduler saat server menyala
prisma/schema.prisma  Skema database
Dockerfile            Build image produksi (Node 22 alpine, standalone)
docker-compose.yml    Konfigurasi deploy CasaOS
```
