# Kemas kini 1.0.7 — Ringgit Malaysia dan Sen

## Perubahan yang dibuat

Versi ini menggantikan binaan 1.0.6 selepas pratonton pengguna mendapati sebutan/sambungan masih tidak sesuai.

- **15 klip** menggunakan rakaman baharu “Ringgit Malaysia” sebagai satu frasa.
- **10 klip** menggunakan Pilihan 5 daripada rakaman asal untuk “ringgit” berasingan.
- **12 ayat berkaitan** menggunakan rakaman baharu “Sen”. Kata Sen dalam teks lain tidak diubah.
- Rakaman frasa dan Sen dikekalkan pada kelajuan asal. Ringgit berasingan disesuaikan dengan tempoh ruang perkataan setiap ayat.
- Semua sisipan adalah **berurutan tanpa crossfade**, dengan fade 6 ms untuk mengelakkan klik. Tiada pertindihan audio disengajakan.
- **3,332 klip lain dikekalkan**; jumlah keseluruhan kekal 3,357 klip.
- Revisi hash `user-rm-sen-20261025-v2` hanya menyentuh 25 teks Ringgit. Cache lama memuat turun 25 klip baharu sahaja selepas kod dan ZIP audio dikemas kini.

## Rakaman yang disertakan

- `assets/audio/ringgit-user.mp3` — Ringgit berasingan, Pilihan 5.
- `assets/audio/ringgit-malaysia-user.mp3` — rakaman baharu Ringgit Malaysia.
- `assets/audio/sen-user.mp3` — rakaman baharu Sen.

Hash ketiga-tiga sampel direkodkan dalam manifest dan disahkan semasa pembungkusan.

## Pengesahan setempat

- 58/58 ujian Node lulus.
- 26/26 aliran browser dan 4/4 aliran dwibahasa lulus.
- 10/10 kumpulan TTS sebenar lulus, termasuk Ringgit berasingan serta frasa Ringgit Malaysia/Sen.
- 3/3 aliran AI tiruan lulus; ini bukan ujian Gemini/GPT sebenar.
- Electron sumber dan ASAR memainkan audio luar talian tanpa API TTS.
- EXE 1.0.7 x64 lulus 7-Zip dan audit ASAR: 175,065,316 bait; SHA-256 `2156797a581608a172a0c7b3d12bfef51d9fefbd1d037aa921327dcfa0b70c42`.
- Audit pelan WordBoundary dan korelasi PCM lulus untuk 15 frasa, 10 Ringgit berasingan dan 12 Sen. Skor minimum: Ringgit/frasa 0.996055; Sen 0.989056.
- 3,332 klip lain sama dari segi bait dengan peket sebelumnya.

> Audit teknikal bukan pengganti penilaian pendengar. Klip ujian frasa/Sen telah diluluskan pengguna sebelum 25 klip dijana semula.

## Uji pratonton

1. Muat semula atau tutup/buka semula pratonton supaya kod 1.0.6 tidak kekal dalam halaman lama.
2. Pastikan versi menunjukkan **1.0.7**.
3. Buka nota yang mengandungi “Mata wang Malaysia ialah Ringgit Malaysia…”.
4. Tekan **Berhenti** pada audio lain, kemudian tekan **Dengar** pada satu kad sahaja.
5. Jika cache audio perlu disediakan semula, gunakan **Tetapan → Ketersediaan luar talian & storan → Sediakan Audio Luar Talian**.

## Terbitkan ke PWA GitHub Pages

> Fail setempat ini tidak mengubah laman live dalam akaun GitHub pengguna.

1. Ekstrak `CIKGU-AI-PWA-GITHUB.zip` dan muat naik kandungannya ke pangkal repositori, termasuk `.github`. Commit perubahan.
2. Edit Release `audio-v1` dan gantikan `cikgu-yasmin-offline.zip` dengan ZIP baharu yang mempunyai nama sama. Jika menggunakan empat bahagian, gantikan kesemua empat.
3. Buka **Actions → Terbit PWA dengan audio daripada Release → Run workflow** dan tunggu semua langkah hijau.
4. Buka PWA, pastikan versi **1.0.7**, kemudian tekan **Sediakan Audio Luar Talian** dalam Tetapan.

Kod ringan dan ZIP audio mesti digantikan bersama kerana nama hash 25 klip berubah. Workflow menyemak bilangan, format dan jumlah bait terhadap manifest.

## Had penting

- GitHub Pages tidak menjalankan backend Python atau `POST /api/tts`; audio prasedia berfungsi sebagai fail statik.
- Teks baharu memerlukan backend berasingan dengan `backend/requirements-tts.txt` dan ketiga-tiga fail sampel.
- Jangan dedahkan API key dalam JavaScript, GitHub, EXE atau URL.
- EXE tidak ditandatangani dan pemasangan pada Windows 10/11 sebenar masih memerlukan pengesahan berasingan.
