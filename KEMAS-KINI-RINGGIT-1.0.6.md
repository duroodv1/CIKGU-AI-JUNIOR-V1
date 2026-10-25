# Kemas kini 1.0.6 — Sebutan “ringgit” daripada rakaman pengguna

## Apa yang berubah

- Rakaman `RM.mp3` yang diberikan pengguna digunakan untuk perkataan **ringgit**.
- Ucapan pertama rakaman dipangkas kepada klip asas lebih kurang 1.10 saat, mono 24 kHz, dan disimpan sebagai `assets/audio/ringgit-user.mp3`.
- Tepat **25 klip prasedia** yang mengandungi perkataan tersebut dijana semula. Sempadan `WordBoundary` Edge TTS menentukan kedudukan perkataan; bahagian ayat lain kekal menggunakan Yasmin/Aria.
- **3,332 klip lain kekal sama dari segi bait** dengan peket 1.0.5. Jumlah keseluruhan kekal **3,357 klip**.
- Backend `tts_server.py` menggunakan rakaman yang sama untuk teks baharu yang mengandungi `ringgit`.
- Revisi `user-rm-20261025-v1` masuk dalam hash hanya bagi teks terlibat. Oleh itu, cache PWA lama memerlukan **25 klip baharu sahaja**, bukan semua 3,357 klip.

## Status pengesahan setempat

- 58/58 ujian Node lulus.
- 26/26 aliran browser dan 4/4 aliran dwibahasa lulus.
- 10/10 pemeriksaan TTS sebenar lulus, termasuk ayat Ringgit baharu.
- 3/3 aliran AI tiruan lulus; ini bukan ujian Gemini/GPT sebenar.
- Audio Electron daripada sumber dan ASAR berfungsi dengan rangkaian dimatikan.
- 25/25 klip baharu mempunyai skor padanan gelombang 0.9964–0.9984 terhadap rakaman yang dipangkas. Ini audit teknikal, bukan pengganti penilaian pendengar.
- EXE 1.0.6 x64 lulus ujian 7-Zip dan audit ASAR. Ia tidak ditandatangani dan belum diuji pada Windows 10/11 sebenar.

## Terbitkan pembetulan ke PWA GitHub Pages

> Versi live dalam akaun GitHub pengguna tidak diubah oleh fail setempat ini. Langkah berikut perlu dilakukan dalam repositori pemilik.

1. Ekstrak **`CIKGU-AI-PWA-GITHUB.zip`**.
2. Dalam repositori PWA, pilih **Add file → Upload files** dan muat naik kandungan hasil ekstrak, termasuk folder `.github`. Gantikan fail lama dan commit.
3. Buka **Releases** dan edit Release `audio-v1` yang sedang digunakan oleh workflow.
4. Pada bahagian aset, gantikan **`cikgu-yasmin-offline.zip`** dengan ZIP baharu yang mempunyai nama sama. Jika menggunakan empat bahagian, gantikan kesemua empat dengan bahagian baharu.
5. Buka **Actions → Terbit PWA dengan audio daripada Release → Run workflow**. Tunggu semua langkah bertanda hijau.
6. Buka PWA dan pastikan versi menunjukkan **1.0.6**. Dalam **Tetapan → Ketersediaan luar talian & storan**, tekan **Sediakan Audio Luar Talian** dan tunggu status lengkap.
7. Uji satu kad yang menyebut “Lima ringgit…”. Audio prasedia selepas ini berfungsi tanpa internet.

### Mengapa kod dan audio perlu diganti bersama?

Manifest dan fungsi hash berada dalam kod ringan, manakala MP3 berada dalam ZIP audio. Jika hanya satu digantikan, aplikasi mungkin mencari nama klip baharu yang belum ada atau terus menggunakan klip lama. Workflow menyemak bilangan, format dan jumlah bait terhadap manifest sebelum menerbitkan.

## Pasang di Windows

Gunakan **`CIKGU-AI-JUNIOR-PPKI-Setup-1.0.6.exe`**. Semua 3,357 klip sudah dibundel; pemasang tidak memerlukan muat turun audio berasingan untuk kandungan prasedia. Teks baharu/AI tetap memerlukan backend dalam talian yang berasingan.

## Had penting

- GitHub Pages hanya menghantar fail statik; ia tidak menjalankan `POST /api/tts`.
- Pelayan TTS dinamik perlu memasang `backend/requirements-tts.txt`, yang kini merangkumi `edge-tts` dan `imageio-ffmpeg`.
- Jangan dedahkan API key dalam JavaScript, GitHub, EXE atau URL.
- Penilaian akhir kualiti sebutan oleh pengguna tetap disarankan walaupun audit gelombang dan semua ujian teknikal lulus.
