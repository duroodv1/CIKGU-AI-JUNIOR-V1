# CIKGU AI JUNIOR PPKI V.1 — PWA + Audio Luar Talian

Pakej ini mengandungi aplikasi web statik, **3,357 klip MP3 prajana (mono, 24 kbps)** menggunakan `ms-MY-YasminNeural` untuk Bahasa Melayu dan `en-US-AriaNeural` untuk English, serta pelayan Python pilihan untuk menjana audio bagi teks baharu. Tiada API key disertakan.

**Versi 1.0.6:** sebutan `ringgit` dalam 25 klip menggunakan rakaman yang diberikan pengguna. Sebanyak 3,332 klip lain dikekalkan. Backend teks baharu menggunakan rakaman yang sama; lihat `KEMAS-KINI-RINGGIT-1.0.6.md` untuk langkah kemas kini.

Kandungan merangkumi **7 subjek, 78 topik, 700 soalan dan 1,170 aktiviti**. Kemajuan disimpan pada peranti. Aplikasi kini mempunyai **satu Mod Murid**; Mod Ibu Bapa, PIN dan profil berbilang pengguna telah dibuang.

## Jalankan PWA

### Dengan pelayan audio untuk teks baharu

```bash
python3 -m pip install -r backend/requirements-tts.txt
python3 backend/tts_server.py
```

Windows:

```powershell
py -m pip install -r backend/requirements-tts.txt
py backend/tts_server.py
```

Buka `http://localhost:4173`. Pelayan ini menghantar PWA dan endpoint `POST /api/tts` pada origin yang sama.

Pelayan statik seperti `python3 -m http.server 4173` juga memadai untuk kandungan dan **audio prasedia**. Python + `edge-tts` hanya diperlukan untuk teks baharu yang tiada dalam peket atau cache.

## Sediakan audio untuk luar talian — wajib sekali dalam PWA

1. Buka PWA melalui HTTPS atau localhost semasa dalam talian.
2. Buka **Tetapan → Ketersediaan luar talian & storan**.
3. Tekan **Sediakan Audio Luar Talian**. Saiz sebenar dipaparkan pada butang.
4. Biarkan aplikasi terbuka sehingga status menyatakan bahawa semua **3,357/3,357 klip** telah disimpan. Selepas kemas kini audio, ulangi langkah ini walaupun peket lama pernah dimuat turun; klip lapuk akan dibuang selepas peket baharu lengkap. Bagi kemas kini 1.0.5 → 1.0.6, hanya **25 URL Ringgit** berubah dan perlu dimuat turun semula.
5. Jika pelayar membenarkannya, tekan **Minta Storan Berterusan** untuk mengurangkan risiko cache dibuang.
6. Pasang PWA melalui **Install app / Add to Home Screen**, kemudian buka semula dan uji dengan rangkaian dimatikan.

Muat turun boleh disambung selepas sambungan terputus; klip sedia ada tidak dijana atau dimuat turun semula. Status lengkap hanya diberikan selepas Service Worker mengira semua klip dalam Cache Storage.

> Membersihkan data/cache laman atau menukar origin akan membuang salinan audio. Dalam keadaan tersebut, ulangi muat turun. Sediakan storan dan ruang yang mencukupi pada peranti.

## Audio yang berfungsi tanpa internet

Selepas peket lengkap disimpan:

- Bacaan nota dan contoh prasedia.
- Bacaan 700 soalan bersama pilihannya.
- Bacaan kad langkah bagi panduan topik/latihan tahap 1–3 dan cadangan perbualan prasedia.
- Sampel suara Yasmin dalam Tetapan.
- Audio dinamik lain yang **pernah dijana** dan masih ada dalam cache.

**Teks bebas, soalan baharu atau jawapan AI yang belum mempunyai audio tidak boleh dijana tanpa internet.** Aplikasi tidak berpura-pura memainkan audio bagi teks tersebut; teks masih boleh dibaca pada skrin.

## Bacaan suara dan privasi

- Bahasa Melayu: **`ms-MY-YasminNeural`**; English (Amerika Syarikat): **`en-US-AriaNeural`**; kadar `-8%`. Suara dipilih mengikut bahasa setiap segmen, termasuk ayat campuran.
- Perkataan **ringgit** menggunakan rakaman pengguna dalam 25 klip prasedia dan dalam backend teks baharu yang telah dikemas kini.
- **Dengar** membaca teks semasa; **Jeda** menyambung klip yang sama; **Berhenti** menghentikan dan menetapkan semula bacaan.
- Audio prasedia dimainkan daripada fail setempat/Cache Storage dan tidak memanggil `/api/tts`.
- Hanya teks baharu yang tiada dalam peket/cache dihantar ke pelayan audio apabila Dengar ditekan. Jangan masukkan maklumat peribadi.
- `assets/audio/contoh-suara.mp3` hanya untuk pradengar sampel, bukan had kandungan.

## Terbit ke GitHub Pages

1. Ekstrak kandungan ZIP ke pangkal repositori, termasuk seluruh folder `assets/audio/offline/` dan `js/offline-audio-manifest.js`.
2. Pastikan `index.html`, `manifest.webmanifest`, `sw.js`, folder `js` dan folder `assets` berada di lokasi tersebut.
3. Dalam GitHub, buka **Settings → Pages**.
4. Pilih **Deploy from a branch**, cabang `main` dan folder `/ (root)`, kemudian simpan.
5. Selepas URL aktif, buka PWA dan lengkapkan muat turun audio seperti di atas.

Semua laluan adalah relatif dan menyokong `https://NAMAANDA.github.io/NAMA-REPO/`. Jangan buang fail MP3 untuk mengecilkan penerbitan; manifest dan ujian liputan memerlukan set lengkap.

**GitHub Pages tidak menjalankan Python.** Audio prasedia tetap berfungsi kerana ia fail statik. Untuk teks baharu, hoskan `backend/tts_server.py` secara berasingan pada HTTPS, tetapkan `ALLOWED_ORIGINS`, dan masukkan URL penuh `/api/tts` dalam **Tetapan → Audio & maklum balas**. Jangan masukkan API key atau token dalam URL/repositori.

## AI dalam talian

Mod Pembelajaran Tanpa AI berfungsi serta-merta. Gemini/GPT memerlukan backend HTTPS berasingan dan konfigurasi dalam **Tetapan → AI pilihan**. AI generatif dan audio bagi jawapan baharunya memerlukan internet.

Rujuk pakej projek lengkap untuk backend AI Node, Electron, skrip penjanaan dan laporan ujian.
