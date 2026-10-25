# Terbit PWA melalui GitHub Release + Actions

Kaedah ini untuk pengguna yang **tidak mahu menggunakan GitHub Desktop** dan menghadapi had **25 MB** semasa memuat naik audio.

## Fail yang digunakan

- `CIKGU-AI-PWA-GITHUB.zip` — kod ringan dan workflow, tanpa MP3 offline.
- `cikgu-yasmin-offline-part-01.zip`
- `cikgu-yasmin-offline-part-02.zip`
- `cikgu-yasmin-offline-part-03.zip`
- `cikgu-yasmin-offline-part-04.zip`

Setiap bahagian audio kurang daripada 25 MB. Untuk muat naik baharu, lampirkan **kesemua empat** dalam Release yang sama; workflow akan menggabungkannya semula.

**Jika Release anda sudah mempunyai `cikgu-yasmin-offline.zip` yang penuh**, anda tidak perlu memadamnya atau memuat naik empat bahagian. Workflow terkini secara automatik memilih ZIP penuh tersebut. Empat bahagian hanya pilihan sandaran apabila muat naik ZIP penuh gagal.

Jangan tukar nama fail atau tag `audio-v1` kecuali anda turut mengemas kini workflow.

## 1. Muat naik kod ringan ke repositori

1. Ekstrak `CIKGU-AI-PWA-GITHUB.zip`.
2. Dalam repositori GitHub, pilih **Add file → Upload files**.
3. Muat naik **kandungan folder hasil ekstrak**, bukan ZIP dan bukan folder luar tambahan.
4. Pastikan folder `.github` turut disertakan, kemudian commit perubahan. Gantikan workflow lama jika ditanya.

Struktur pangkal repositori mesti termasuk:

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

`assets/audio/offline/` memang belum ada dalam kod ringan. Workflow akan menambahkannya semasa deployment.

## 2. Tetapkan GitHub Pages

1. Buka **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Jangan pilih **Deploy from a branch** untuk kaedah ini.

Semak kelayakan Pages/Actions serta sebarang had atau caj mengikut pelan akaun anda.

## 3. Cipta Release untuk audio

1. Buka **Releases → Draft a new release** atau alamat `https://github.com/NAMA-PENGGUNA/NAMA-REPO/releases/new`.
2. Pada **Choose a tag**, cipta tag:

   ```text
   audio-v1
   ```

3. Pilih sasaran `main` dan tajuk seperti `Audio BM dan English PWA`.
4. Jika aset audio belum ada, skrol melepasi **Release notes** kepada kotak besar:

   > **Attach binaries by dropping them here or selecting them.**

5. Klik kotak tersebut dan pilih **satu ZIP penuh** jika ia diterima, atau **keempat-empat ZIP bahagian** sebagai alternatif. Jika pemilih fail hanya membenarkan satu fail, ulangi untuk setiap bahagian.
6. Tunggu sehingga semua aset yang dipilih muncul dan muat naik selesai, kemudian tekan **Publish release**. Jika Release dengan ZIP penuh sudah pun diterbitkan, kekalkan Release itu dan teruskan ke langkah Actions.

**Penting:** Jangan lampirkan audio melalui kotak teks Release notes atau pautan Markdown. Gunakan kotak **Attach binaries** supaya fail menjadi aset Release yang boleh dimuat turun oleh workflow.

Tiada Personal Access Token atau API key diperlukan. Workflow menggunakan `GITHUB_TOKEN` terbina dalam dengan kebenaran baca kandungan.

## 4. Semak deployment

Penerbitan Release sepatutnya menjalankan **Terbit PWA dengan audio daripada Release**. Jika tidak:

1. Buka **Actions**.
2. Pilih workflow tersebut.
3. Tekan **Run workflow**.

Workflow akan:

- memuat turun aset yang sepadan dengan `cikgu-yasmin-offline*.zip` daripada Release `audio-v1`;
- memilih ZIP penuh jika sudah ada, atau memastikan keempat-empat bahagian tersedia;
- menolak klip yang hilang, pendua, tambahan, rosak atau bukan MP3;
- mengesahkan gabungan **3,357 klip** dan jumlah bait terhadap manifest; dan
- menerbitkan PWA serta audio ke GitHub Pages.

Selepas semua langkah bertanda hijau, URL PWA tersedia dalam deployment atau **Settings → Pages**. Deployment sebenar belum dilakukan dalam pakej ini; ia berlaku dalam akaun GitHub anda.

## 5. Sediakan audio luar talian dalam PWA

1. Buka PWA dalam keadaan dalam talian.
2. Masuk **Mod Ibu Bapa → Audio, Visual & Luar Talian**.
3. Tekan **Sediakan Audio Luar Talian** dan tunggu sehingga **3,357/3,357** disahkan. Selepas kemas kini dwibahasa, ulangi muat turun walaupun peket lama pernah lengkap.
4. Pasang PWA jika dikehendaki dan uji tanpa internet.

Audio dimuat turun daripada GitHub Pages pada origin yang sama, bukan dijana oleh AI. Teks baharu atau jawapan AI masih memerlukan pelayan audio dalam talian yang berasingan.

## Kemas kini selepas ini

- **Perubahan kod sahaja:** muat naik perubahan ke repositori, kemudian tekan **Run workflow**. Audio tidak perlu dimuat naik semula.
- **Perubahan audio:** gantikan kesemua bahagian yang berkaitan dan jalankan semula workflow.
- **Tukar nama tag/corak aset:** kemas kini `AUDIO_RELEASE_TAG` atau `AUDIO_ASSET_PATTERN` dalam `.github/workflows/deploy.yml`.

## Jika berlaku ralat

- **File size too big / 25 MB:** pastikan anda memilih fail `part-01` hingga `part-04`, bukan ZIP audio tunggal yang lama.
- **Release/asset not found:** semak tag `audio-v1` dan keempat-empat nama fail, termasuk huruf kecil serta sifar `01` hingga `04`.
- **ZIP audio tidak ditemui / bahagian hilang:** edit Release dan lampirkan bahagian yang tiada, kemudian jalankan semula workflow.
- **Audio 404 di PWA:** pastikan langkah `Sahkan dan sediakan audio Release` serta deployment berjaya.
- **Paparan lama:** jalankan workflow selepas perubahan kod, kemudian tutup dan buka semula PWA. Jangan kosongkan cache audio tanpa keperluan.
- **Backend AI disekat CORS:** masukkan origin Pages yang tepat dalam `ALLOWED_ORIGINS`, contohnya `https://NAMAANDA.github.io` tanpa `/` hujung.

Jangan masukkan API key dalam repositori, Release, workflow atau PWA.
