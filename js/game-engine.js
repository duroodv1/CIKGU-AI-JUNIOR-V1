const shuffle = array => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const choice = array => array[Math.floor(Math.random() * array.length)];

const wordQuestions = [
  { prompt: 'Lengkapkan: Saya ____ tangan sebelum makan.', options: ['cuci', 'baca', 'tulis'], answer: 0, hint: 'Kita membersihkan tangan dengan air dan sabun.', visual: '🧼' },
  { prompt: 'Choose the word: “Buku” in English is…', options: ['book', 'bag', 'chair'], answer: 0, hint: 'We read a book.', visual: '📖' },
  { prompt: 'Pilih ayat lengkap.', options: ['Adik makan nasi.', 'Nasi dan', 'Makan di'], answer: 0, hint: 'Cari siapa dan apa yang dilakukan.', visual: '🍚' },
  { prompt: 'Complete: This ___ a dog.', options: ['is', 'are', 'am'], answer: 0, hint: 'Use “is” for one thing.', visual: '🐕' },
  { prompt: 'Apakah maksud “basikal”?', options: ['Kenderaan dikayuh', 'Alat memasak', 'Tempat tidur'], answer: 0, hint: 'Basikal mempunyai pedal.', visual: '🚲' },
  { prompt: '“Ibu” in English is…', options: ['mother', 'father', 'sister'], answer: 0, hint: 'Mother means ibu.', visual: '👩' }
];

const natureQuestions = [
  { prompt: 'Pilih kumpulan untuk kucing.', visual: '🐱', options: ['Haiwan', 'Makanan', 'Pakaian'], answer: 0, hint: 'Kucing bernafas, bergerak dan memerlukan makanan.' },
  { prompt: 'Pilih kumpulan untuk epal.', visual: '🍎', options: ['Haiwan', 'Makanan', 'Pakaian'], answer: 1, hint: 'Epal boleh dimakan.' },
  { prompt: 'Pilih kumpulan untuk baju.', visual: '👕', options: ['Haiwan', 'Makanan', 'Pakaian'], answer: 2, hint: 'Baju dipakai pada badan.' },
  { prompt: 'Pilih kumpulan untuk ikan.', visual: '🐟', options: ['Haiwan', 'Makanan', 'Pakaian'], answer: 0, hint: 'Ikan hidup di air dan mempunyai insang.' },
  { prompt: 'Pilih kumpulan untuk nasi.', visual: '🍚', options: ['Haiwan', 'Makanan', 'Pakaian'], answer: 1, hint: 'Nasi memberi kita tenaga.' },
  { prompt: 'Pilih kumpulan untuk kasut.', visual: '👟', options: ['Haiwan', 'Makanan', 'Pakaian'], answer: 2, hint: 'Kasut dipakai pada kaki.' }
];

const routines = [
  [
    { id: 0, icon: '💧', text: 'Basahkan tangan' },
    { id: 1, icon: '🧼', text: 'Gosok dengan sabun' },
    { id: 2, icon: '🚿', text: 'Bilas dengan air' },
    { id: 3, icon: '🧻', text: 'Lap hingga kering' }
  ],
  [
    { id: 0, icon: '🌅', text: 'Bangun tidur' },
    { id: 1, icon: '🪥', text: 'Gosok gigi' },
    { id: 2, icon: '🍞', text: 'Sarapan' },
    { id: 3, icon: '🎒', text: 'Sedia ke sekolah' }
  ],
  [
    { id: 0, icon: '🌰', text: 'Masukkan biji benih ke tanah' },
    { id: 1, icon: '💧', text: 'Siram secukupnya' },
    { id: 2, icon: '🌱', text: 'Anak pokok tumbuh' },
    { id: 3, icon: '🌳', text: 'Pokok membesar' }
  ]
];

function countingQuestion() {
  const count = 3 + Math.floor(Math.random() * 7);
  const object = choice(['🍎', '⭐', '⚽', '🐟', '🌼', '🧸']);
  const options = shuffle([count, count === 3 ? 4 : count - 1, count + 1]);
  return {
    prompt: `Berapa ${object} yang kamu nampak?`,
    visual: Array(count).fill(object).join(' '),
    options,
    answer: options.indexOf(count),
    hint: 'Bilang satu demi satu. Jangan kira objek yang sama dua kali.'
  };
}

export function createGame(id) {
  const base = { id, round: 1, total: 5, score: 0, answered: false, feedback: null, complete: false, recorded: false };
  if (id === 'kira') return { ...base, current: countingQuestion() };
  if (id === 'kata') return { ...base, questions: shuffle(wordQuestions), current: null };
  if (id === 'alam') return { ...base, questions: shuffle(natureQuestions), current: null };
  if (id === 'rutin') {
    const correct = choice(routines);
    return { ...base, total: 1, correct, cards: shuffle(correct), selected: [] };
  }
  if (id === 'padan') {
    const icons = shuffle(['🍎', '🚗', '🌟', '🐟', '🌻', '⚽']).slice(0, 4);
    const cards = shuffle(icons.flatMap((icon, pair) => [{ icon, pair }, { icon, pair }])).map((card, index) => ({ ...card, index, open: false, matched: false }));
    return { ...base, total: 1, cards, flipped: [], locked: false };
  }
  if (id === 'belanja') {
    return {
      ...base,
      total: 1,
      stage: 'shop',
      wallet: 10,
      items: [
        { id: 0, icon: '💧', name: 'Air', price: 2 },
        { id: 1, icon: '🍞', name: 'Roti', price: 3 },
        { id: 2, icon: '✏️', name: 'Pensel', price: 1 },
        { id: 3, icon: '📘', name: 'Buku', price: 4 },
        { id: 4, icon: '🧸', name: 'Mainan', price: 6 },
        { id: 5, icon: '🍎', name: 'Epal', price: 2 }
      ],
      selected: [],
      current: null
    };
  }
  return null;
}

export function getCurrentQuestion(game) {
  if (!game) return null;
  if (game.id === 'kata' || game.id === 'alam') {
    if (!game.current) game.current = game.questions[(game.round - 1) % game.questions.length];
  }
  return game.current;
}

export function answerChoice(game, answerIndex) {
  if (!game || game.answered || game.complete) return null;
  const question = getCurrentQuestion(game);
  if (!question || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) return null;
  const correct = answerIndex === question.answer;
  game.answered = true;
  if (correct) game.score += 1;
  game.feedback = {
    correct,
    title: correct ? 'Bagus, jawapan kamu betul!' : 'Bagus kerana sudah cuba!',
    text: correct ? 'Kamu memeriksa maklumat dengan teliti.' : question.hint,
    answer: question.options[question.answer]
  };
  return game.feedback;
}

export function nextGameRound(game) {
  if (!game?.answered) return false;
  if (game.round >= game.total) {
    game.complete = true;
    return true;
  }
  game.round += 1;
  game.answered = false;
  game.feedback = null;
  game.current = game.id === 'kira' ? countingQuestion() : null;
  getCurrentQuestion(game);
  return true;
}

export function flipMemoryCard(game, index) {
  if (!game || game.id !== 'padan' || game.locked || game.complete) return null;
  const card = game.cards[index];
  if (!card || card.matched || card.open || game.flipped.length >= 2) return null;
  card.open = true;
  game.flipped.push(index);
  if (game.flipped.length === 2) {
    game.locked = true;
    return { resolve: true };
  }
  return { resolve: false };
}

export function resolveMemoryTurn(game) {
  if (!game || game.id !== 'padan' || game.flipped.length !== 2) return null;
  const [first, second] = game.flipped;
  const match = game.cards[first].pair === game.cards[second].pair;
  if (match) {
    game.cards[first].matched = true;
    game.cards[second].matched = true;
    game.score += 1;
    game.feedback = { correct: true, title: 'Jumpa pasangan!', text: 'Kedua-dua gambar sama. Teruskan dengan pasangan lain.' };
  } else {
    game.cards[first].open = false;
    game.cards[second].open = false;
    game.feedback = { correct: false, title: 'Cuba sekali lagi', text: 'Belum sama. Cuba ingat kedudukan setiap gambar.' };
  }
  game.cards[first].open = match;
  game.cards[second].open = match;
  game.flipped = [];
  game.locked = false;
  if (game.cards.every(card => card.matched)) {
    game.answered = true;
    game.feedback = { correct: true, title: 'Semua pasangan dijumpai!', text: 'Hebat! Kamu menggunakan ingatan visual dan memberi tumpuan.' };
  }
  return { match, complete: game.answered };
}

export function pickSequenceCard(game, id) {
  if (!game || game.id !== 'rutin' || game.answered || game.selected.includes(id)) return false;
  if (!game.correct.some(card => card.id === id)) return false;
  game.selected.push(id);
  game.feedback = null;
  return true;
}

export function checkSequence(game) {
  if (!game || game.id !== 'rutin' || game.selected.length !== game.correct.length) return null;
  const correct = game.selected.every((id, index) => id === game.correct[index].id);
  game.answered = correct;
  if (correct) {
    game.score = 1;
    game.feedback = { correct: true, title: 'Urutan betul!', text: 'Kamu menyusun tindakan satu demi satu dengan tepat.' };
  } else {
    game.selected = [];
    game.feedback = { correct: false, title: 'Mari cuba dengan petunjuk', text: `Mula dengan langkah “${game.correct[0].text}”. Kemudian fikirkan apa yang berlaku seterusnya.` };
  }
  return game.feedback;
}

export function shopTotal(game) {
  if (!game || game.id !== 'belanja') return 0;
  return game.items.filter(item => game.selected.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
}

export function toggleShopItem(game, id) {
  if (!game || game.id !== 'belanja' || game.stage !== 'shop') return null;
  const item = game.items.find(entry => entry.id === id);
  if (!item) return null;
  if (game.selected.includes(id)) {
    game.selected = game.selected.filter(itemId => itemId !== id);
    return { ok: true };
  }
  if (shopTotal(game) + item.price > game.wallet) {
    return { ok: false, message: 'Wang tidak cukup untuk menambah item ini. Buang satu item atau pilih yang lain.' };
  }
  game.selected.push(id);
  return { ok: true };
}

export function checkoutShop(game) {
  if (!game || game.id !== 'belanja' || game.stage !== 'shop' || !game.selected.length) return false;
  const total = shopTotal(game);
  const change = game.wallet - total;
  const options = shuffle([change, change + 1, Math.max(0, change - 1)].filter((value, index, array) => array.indexOf(value) === index));
  while (options.length < 3) options.push(options[options.length - 1] + 2);
  game.current = {
    prompt: `Jumlah harga ialah RM${total}. Kamu membayar RM${game.wallet}. Berapa baki wang?`,
    visual: `RM${game.wallet} − RM${total} = ?`,
    options: options.map(value => `RM${value}`),
    answer: options.indexOf(change),
    hint: `Baki = wang dibayar − jumlah harga. Kira RM${game.wallet} − RM${total}. Semak: RM${total} + baki = RM${game.wallet}.`
  };
  game.stage = 'change';
  return true;
}
