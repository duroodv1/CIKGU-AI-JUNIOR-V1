# Terbit PWA melalui GitHub Release + Actions

Kaedah ini untuk pengguna yang **tidak mahu menggunakan GitHub Desktop** dan menghadapi had **25 MB** semasa memuat naik audio.

Setiap bahagian audio kurang daripada 25 MB. Untuk muat naik baharu, lampirkan **kesemua empat** dalam Release yang sama; workflow akan menggabungkannya semula.

**Jika Release anda sudah mempunyai `cikgu-yasmin-offline.zip` yang penuh**, anda tidak perlu memadamnya atau memuat naik empat bahagian. Workflow terkini secara automatik memilih ZIP penuh tersebut. Empat bahagian hanya pilihan sandaran apabila muat naik ZIP penuh gagal.

## 2. Tetapkan GitHub Pages

1. Buka **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Jangan pilih **Deploy from a branch** untuk kaedah ini.
