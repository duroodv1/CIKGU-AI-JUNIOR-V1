# Terbit PWA melalui GitHub Release + Actions

Kaedah ini untuk pengguna yang **tidak mahu menggunakan GitHub Desktop**. Kod PWA dan audio dimuat naik secara berasingan melalui pelayar.

## Dua fail yang digunakan

1. `CIKGU-AI-PWA-GITHUB.zip` — kod ringan, workflow dan panduan; tiada 3,296 MP3 di dalamnya.
2. `cikgu-yasmin-offline.zip` — pek audio yang dimuat naik sebagai aset Release.

Jangan tukar nama fail audio atau tag `audio-v1` kecuali anda turut mengemas kini `.github/workflows/deploy.yml`.

## 1. Muat naik kod ringan ke repositori

1. Ekstrak `CIKGU-AI-PWA-GITHUB.zip`.
2. Dalam repositori GitHub, pilih **Add file → Upload files**.
3. Muat naik **kandungan folder hasil ekstrak**, bukan ZIP dan bukan folder luar tambahan.
4. Pastikan folder tersembunyi `.github` turut disertakan. Commit perubahan.

Semak bahawa struktur pangkal repositori kelihatan seperti ini:

```text
index.html
styles.css
manifest.webmanifest
sw.js
js/
assets/
.github/
  workflows/
    deploy.yml
  scripts/
    prepare_audio.py
```

`assets/audio/offline/` memang belum ada dalam kod ringan. Workflow akan menambahkannya semasa deployment. `index.html` mesti berada di pangkal repositori.

## 2. Tetapkan GitHub Pages

1. Buka **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Jangan pilih **Deploy from a branch** untuk kaedah ini.

Semak kelayakan Pages/Actions dan sebarang had atau caj mengikut pelan akaun anda.

## 3. Cipta Release untuk audio

1. Buka **Releases → Draft a new release**.
2. Pada **Choose a tag**, cipta tag:

   ```text
   audio-v1
   ```

3. Pilih sasaran cabang `main` dan masukkan tajuk seperti `Audio Yasmin PWA`.
4. Pada bahagian melampirkan binari, muat naik:

   ```text
   cikgu-yasmin-offline.zip
   ```

5. Tunggu muat naik aset selesai, kemudian pilih **Publish release**.

Tiada Personal Access Token atau API key diperlukan. Workflow menggunakan `GITHUB_TOKEN` terbina dalam dengan kebenaran baca kandungan sahaja.

## 4. Semak deployment

Penerbitan Release sepatutnya menjalankan **Terbit PWA dengan audio daripada Release**. Jika ia tidak berjalan:

1. Buka **Actions**.
2. Pilih workflow tersebut.
3. Tekan **Run workflow**.

Workflow akan:

- memuat turun aset daripada Release `audio-v1`;
- menolak ZIP jika ada klip hilang, tambahan, rosak atau format bukan MP3;
- mengesahkan **3,296 klip** dan jumlah bait terhadap manifest;
- menyusun semula fail ke `assets/audio/offline/`; dan
- menerbitkan PWA serta audio ke GitHub Pages.

Selepas semua langkah bertanda hijau, URL PWA boleh dilihat dalam deployment atau **Settings → Pages**. Deployment sebenar belum dilakukan dalam pakej ini; ia berlaku dalam akaun GitHub anda.

## 5. Sediakan audio luar talian dalam PWA

Selepas laman aktif:

1. Buka PWA dalam keadaan dalam talian.
2. Masuk **Mod Ibu Bapa → Audio, Visual & Luar Talian**.
3. Tekan **Sediakan Audio Luar Talian** dan tunggu sehingga **3,296/3,296** disahkan.
4. Pasang PWA jika dikehendaki dan uji semula tanpa internet.

Audio dimuat turun daripada GitHub Pages pada origin yang sama, bukan dijana oleh AI. Teks baharu atau jawapan AI masih memerlukan pelayan audio dalam talian yang berasingan.

## Kemas kini selepas ini

- **Perubahan kod sahaja:** muat naik perubahan ke repositori, kemudian tekan **Run workflow**. Audio tidak perlu dimuat naik semula.
- **Perubahan audio:** gantikan aset Release menggunakan nama ZIP yang sama, kemudian jalankan semula workflow.
- **Tukar nama tag/aset:** kemas kini `AUDIO_RELEASE_TAG` atau `AUDIO_ASSET` dalam `.github/workflows/deploy.yml` dengan nilai yang sepadan.

## Jika berlaku ralat

- **Release/asset not found:** semak ejaan tepat `audio-v1` dan `cikgu-yasmin-offline.zip`, termasuk huruf kecil.
- **Klip hilang/tambahan/rosak:** muat naik semula ZIP audio asal yang disertakan; jangan ekstrak dan zip semula dengan struktur berbeza.
- **Audio 404 di PWA:** pastikan langkah `Sahkan dan ekstrak 3,296 klip` serta deployment telah berjaya sebelum menekan Sediakan Audio Luar Talian.
- **Paparan lama:** jalankan workflow selepas perubahan kod, kemudian tutup dan buka semula PWA. Jangan kosongkan cache audio tanpa keperluan.
- **Backend AI disekat CORS:** masukkan origin Pages yang tepat dalam `ALLOWED_ORIGINS` pada backend Render, contohnya `https://NAMAANDA.github.io` tanpa `/` hujung.

Jangan masukkan API key dalam repositori, Release, workflow atau PWA.
