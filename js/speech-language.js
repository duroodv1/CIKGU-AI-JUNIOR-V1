/* Pemilihan suara dwibahasa untuk audio prasedia dan TTS dalam talian. */
export const MALAY_LANGUAGE = 'ms-MY';
export const ENGLISH_LANGUAGE = 'en-US';
export const MALAY_VOICE = 'ms-MY-YasminNeural';
export const ENGLISH_VOICE = 'en-US-AriaNeural';

// Kata fungsi diberi berat lebih tinggi. Senarai ini sengaja kecil, telus dan
// boleh diaudit; teks yang tidak pasti kekal menggunakan suara Bahasa Melayu.
const EN_FUNCTION = new Set(`
a an the and or but if so because as at by for from in into of off on onto out over to up with without
i you he she it we they me him her us them my your his its our their mine yours ours theirs
this that these those there here who what which where when why how
am is are was were be been being do does did done have has had having
can could may might must shall should will would not no yes
after again all also any before both each either every few first last many more most much next once one only other same second some than then three through two very
say says said read write choose check look listen find match count use uses using used begin begins come comes make makes need needs put start finish
`.trim().split(/\s+/));

const EN_WORDS = new Set(`
${[...EN_FUNCTION].join(' ')}
about above across act acting alphabet animal animals answer apple apples arent around away bag ball banana basic bed bird birds blue body book books bread breakfast brother call capital cat cats chair child children class clean clear colour colours complete cow cup day dog dogs door down drink duck eat egg eight elephant english example eyes family father fish five food four full garden girl give gives go good green healthy help home horse house ink jump know learn left letter letters like little long man meow mother name nine number numbers object objects page parent park pen people picture pillow plate play plays please purple question red rice right ripe room school sentence sentences seven six sister skin small sound sounds spell spelling stop story sun syrup table ten thing things think third time tom too tree understand vocabulary water way whereupon white window word words work world write writing yellow
`.trim().split(/\s+/));

const MS_FUNCTION = new Set(`
a atau dan tetapi jika kerana sebagai di dari dalam kepada pada dengan untuk bagi daripada tentang antara tanpa oleh selepas sebelum semasa ketika apabila sambil sementara hingga sampai
saya aku kamu anda kita kami dia beliau mereka ibu ayah adik kakak saudara
ini itu tersebut sini situ sana siapa apa apakah siapakah bila bilakah mengapa kenapa bagaimana bagaimanakah berapa berapakah mana manakah
ialah adalah ialahkan bukan tidak tak belum sudah telah sedang akan masih lagi pernah mesti perlu boleh bolehkah harus hendak mahu mahukan
ada mempunyai memiliki menjadi jadi lakukan buat cuba pilih baca tulis dengar semak fahami ingat gunakan lihat sebut susun cari jawab bandingkan rujuk fikirkan kenal pasti
satu dua tiga empat lima enam tujuh lapan sembilan sepuluh pertama kedua ketiga seterusnya kemudian akhir setiap beberapa lebih kurang sama lain
`.trim().split(/\s+/));

const MS_WORDS = new Set(`
${[...MS_FUNCTION].join(' ')}
abjad aktiviti air ajaran akar alat alamat amalan anak anjing angka anggota arah arahan asas ayat atas awal bahagian bahan baharu baju baki bakul bangun banyak barang bawah bayangkan bebas beg bekas belajar belon benar bentuk berat berjalan berwarna besar betul bicara bilangan bilik bimbingan bina biru biskut bola buah buku bulat bulatan bunyi burung cara cerita cermin ciri contoh cuaca cukup dakwat dahan darat dapur deria dinding duduk dunia epal faham fakta fungsi gabungkan gambar garis garisan gelap gigi guli gunakan hadiah haiwan harga hari hujan huruf hidup hidupan hidung hijau hitam ibu ibubapa ikan inggeris isi jalan jam jambatan jari jarum jauh jawapan jenis jumlah kaki kali kanan kandungan kapal kawan kecil kefahaman kehidupan keadaan kelas keluarga kemahiran kembali kening keperluan kereta kerusi keselamatan kiri kira kiraan kognitif komen konsep kosakata kucing kuman kuning kira langkah lantai latihan lelaki lengkap letak lima loceng loghat makan makanan malam manusia mata matahari matematik meja melompat membaca membantu membilang membina memegang memerlukan menggunakan menyebut menulis menyiram merah minggu minum minuman modal murid nasi nombor nota objek oren pagi pandangan pasu pelajaran pelbagai pemadam pembaris pensel pendidikan pengiraan penjagaan penyelesaian perasaan peraturan pergerakan peringatan perkara perkataan perlu permaidani persekitaran pertanyaan petunjuk pic pilih pinggan pintu pisang pokok poin posisi prasedia proses pukul putaran rajah rangkaian ringkas ringkasan roda roti rupa sabun sahaja sebutan secara segera sejuk sekolah sekali selamat selipar semak semakin semua senarai sentiasa sepatutnya sepuluh seratus seribu sesuai setiap siang sifar simbol situasi suara sudip sudut suku susu susunan tahap tajuk tambah tangan tanah tanda tanya tayang teh teknik teks telinga teliti tempat tengah tepat terangkan terima terjemahan tetap tiada tinggi tingkap tolak topik tumbuhan tunjuk turutan ucap ucapan udara ukuran ulang ulangi umum upaya urus wang warna waktu wajah
`.trim().split(/\s+/));

function words(text) {
  return String(text || '').toLocaleLowerCase('ms-MY').match(/[a-z]+(?:['’][a-z]+)?/g) || [];
}

export function detectSpeechLanguage(text) {
  const raw = String(text || '').trim();
  // Pilihan abjad English seperti "C: D" tidak mempunyai kata lain untuk
  // dianalisis. Format berlabel ini hanya dihasilkan untuk segmen dwibahasa.
  if (/^[A-Z]\s*:\s*[A-Za-z][.!?]?$/.test(raw)) return ENGLISH_LANGUAGE;
  // Huruf pilihan tidak menentukan bahasa jawapan selepasnya.
  const source = raw.replace(/^\s*[A-Z]\s*:\s*/, '');
  let english = 0;
  let malay = 0;
  for (const word of words(source)) {
    if (EN_WORDS.has(word)) english += EN_FUNCTION.has(word) ? 2 : 1;
    if (MS_WORDS.has(word)) malay += MS_FUNCTION.has(word) ? 2 : 1;
  }
  return english > malay ? ENGLISH_LANGUAGE : MALAY_LANGUAGE;
}

export function speechVoiceForText(text) {
  return detectSpeechLanguage(text) === ENGLISH_LANGUAGE ? ENGLISH_VOICE : MALAY_VOICE;
}

export function splitSpeechText(text) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) return [];
  const output = [];
  const add = value => {
    const part = String(value || '').replace(/\s+/g, ' ').trim();
    if (part) output.push(part);
  };

  for (const paragraph of clean.split(/\n+/)) {
    for (const sentence of paragraph.split(/(?<=[.!?…])\s+(?=[“”"'‘’\p{L}\p{N}])/u)) {
      const part = sentence.trim();
      if (!part) continue;

      // Pisahkan istilah dalam petikan jika bahasanya berbeza, contohnya
      // What is / “buku” / in English dan topik / “Alphabet”.
      const quoted = part.match(/^(.*?)[“"]([^”"]+)[”"](.*)$/);
      if (quoted) {
        const outerLanguage = detectSpeechLanguage(`${quoted[1]} ${quoted[3]}`);
        const innerLanguage = detectSpeechLanguage(quoted[2]);
        if (outerLanguage !== innerLanguage) {
          add(quoted[1]);
          add(quoted[2]);
          if (/[\p{L}\p{N}]/u.test(quoted[3])) add(quoted[3]);
          continue;
        }
      }

      // Contoh dwibahasa "Three cats = tiga ekor kucing" dibaca oleh dua suara.
      const equalParts = part.split(/\s+=\s+/);
      if (equalParts.length === 2 && detectSpeechLanguage(equalParts[0]) !== detectSpeechLanguage(equalParts[1])) {
        equalParts.forEach(add);
        continue;
      }

      // Contoh "Red means merah" dan "Biru means blue" menggunakan dua suara.
      const means = part.match(/^(.+?)\s+means\s+(.+)$/i);
      if (means && /\p{L}/u.test(means[1]) && /\p{L}/u.test(means[2])) {
        const leftLanguage = detectSpeechLanguage(means[1]);
        const rightLanguage = detectSpeechLanguage(means[2]);
        if (leftLanguage === ENGLISH_LANGUAGE && rightLanguage === MALAY_LANGUAGE) {
          add(`${means[1]} means`);
          add(means[2]);
          continue;
        }
        if (leftLanguage === MALAY_LANGUAGE && rightLanguage === ENGLISH_LANGUAGE) {
          add(means[1]);
          add(`means ${means[2]}`);
          continue;
        }
      }
      add(part);
    }
  }
  return output;
}
