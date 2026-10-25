import { GAMES } from './content.js';
import { esc, attr } from './ui.js';
import { getCurrentQuestion, shopTotal } from './game-engine.js';

function gameFeedback(feedback) {
  if (!feedback) return '';
  return `<div class="feedback ${feedback.correct ? 'success' : 'try'}" role="status"><span class="feedback-icon" aria-hidden="true">${feedback.correct ? '🌟' : '💡'}</span><div><h3>${esc(feedback.title)}</h3><p>${esc(feedback.text)}</p></div></div>`;
}

function choiceRound(game) {
  const question = getCurrentQuestion(game);
  if (!question) return '';
  const counting = game.id === 'kira';
  const nature = game.id === 'alam';
  return `<div class="game-instruction"><span class="pill blue">Pusingan ${game.round} / ${game.total}</span><h2>${esc(question.prompt)}</h2><p>${counting ? 'Bilang satu demi satu. Tiada pemasa.' : nature ? 'Fikirkan ciri utama objek, kemudian pilih kumpulan.' : 'Baca ayat dan pilih jawapan yang paling sesuai.'}</p></div>
    ${counting ? `<div class="counting-objects" aria-label="Objek untuk dibilang">${esc(question.visual)}</div>` : nature ? `<div class="classify-item" aria-hidden="true">${esc(question.visual)}</div>` : question.visual ? `<div class="question-visual">${esc(question.visual)}</div>` : ''}
    <div class="${nature ? 'classify-options' : 'game-options'}">${question.options.map((option, index) => `<button class="answer-option ${game.answered && index === question.answer ? 'correct' : ''}" data-action="game-answer" data-index="${index}" ${game.answered ? 'disabled' : ''}>${!nature && !counting ? `<span class="answer-letter">${String.fromCharCode(65 + index)}</span>` : ''}<span>${esc(option)}</span></button>`).join('')}</div>
    ${gameFeedback(game.feedback)}
    ${game.answered ? `<div class="game-bottom"><small>${game.feedback?.correct ? 'Jawapan disemak: tepat.' : `Jawapan yang betul: ${esc(question.options[question.answer])}`}</small><button class="btn btn-primary" data-action="game-next">${game.round >= game.total ? 'Lihat Hasil' : 'Soalan Seterusnya'} <span aria-hidden="true">→</span></button></div>` : ''}`;
}

function memoryRound(game) {
  return `<div class="game-instruction"><span class="pill blue">${game.score} / 4 pasangan</span><h2>Cari dua gambar yang sama</h2><p>Buka dua kad. Jika belum sama, cuba ingat kedudukannya.</p></div>
    <div class="memory-grid">${game.cards.map((card, index) => {
      const visible = card.open || card.matched;
      return `<button class="memory-card ${visible ? '' : 'hidden-card'} ${card.matched ? 'matched' : ''}" data-action="memory-card" data-index="${index}" aria-label="${visible ? esc(card.icon) : `Kad memori ${index + 1}, belum dibuka`}" ${card.matched || game.locked ? 'disabled' : ''}>${visible ? esc(card.icon) : '?'}</button>`;
    }).join('')}</div>${gameFeedback(game.feedback)}
    ${game.answered ? `<div class="game-bottom"><span></span><button class="btn btn-primary" data-action="game-next">Lihat Hasil →</button></div>` : ''}`;
}

function sequenceRound(game) {
  return `<div class="game-instruction"><span class="pill blue">Satu langkah pada satu masa</span><h2>Susun rutin dari mula hingga akhir</h2><p>Tekan kad mengikut urutan. Kamu boleh set semula jika mahu berubah fikiran.</p></div>
    <div class="sequence-grid">${game.cards.map(card => {
      const position = game.selected.indexOf(card.id);
      return `<button class="sequence-card ${position >= 0 ? 'selected' : ''}" data-action="sequence-card" data-id="${card.id}" ${position >= 0 || game.answered ? 'disabled' : ''}><span class="sequence-number">${position >= 0 ? position + 1 : card.icon}</span><strong>${esc(card.text)}</strong></button>`;
    }).join('')}</div>
    <div class="practice-actions"><button class="btn btn-secondary" data-action="reset-sequence" ${!game.selected.length || game.answered ? 'disabled' : ''}>↺ Susun Semula</button><button class="btn btn-primary" data-action="check-sequence" ${game.selected.length !== game.correct.length || game.answered ? 'disabled' : ''}>✓ Semak Urutan</button></div>
    ${gameFeedback(game.feedback)}${game.answered ? `<div class="game-bottom"><span></span><button class="btn btn-primary" data-action="game-next">Lihat Hasil →</button></div>` : ''}`;
}

function shopRound(game) {
  if (game.stage === 'change') return `<div class="game-instruction"><span class="pill yellow">Langkah 2: Kira baki</span><h2>${esc(game.current.prompt)}</h2><p>Gunakan operasi tolak. Kemudian semak dengan operasi tambah.</p></div><div class="question-visual">${esc(game.current.visual)}</div><div class="game-options">${game.current.options.map((option, index) => `<button class="answer-option ${game.answered && index === game.current.answer ? 'correct' : ''}" data-action="game-answer" data-index="${index}" ${game.answered ? 'disabled' : ''}>${esc(option)}</button>`).join('')}</div>${gameFeedback(game.feedback)}${game.answered ? `<div class="notice calm" style="margin-top:16px"><span>🔎</span><p><strong>Cara semak:</strong> Jumlah harga + baki = RM${game.wallet}.</p></div><div class="game-bottom"><span></span><button class="btn btn-primary" data-action="game-next">Lihat Hasil →</button></div>` : ''}`;
  const total = shopTotal(game);
  return `<div class="game-instruction"><span class="pill yellow">Langkah 1: Pilih item</span><h2>Beli mengikut wang yang ada</h2><p>Ini simulasi pembelajaran. Tiada wang atau transaksi sebenar.</p></div>
    <div class="shop-wallet"><strong>👛 Wang simulasi: RM${game.wallet}</strong><span>Jumlah pilihan: <strong>RM${total}</strong> · Baki: <strong>RM${game.wallet - total}</strong></span></div>
    <div class="shop-grid">${game.items.map(item => `<button class="shop-item ${game.selected.includes(item.id) ? 'selected' : ''}" data-action="shop-item" data-id="${item.id}" aria-pressed="${game.selected.includes(item.id)}"><span aria-hidden="true">${item.icon}</span><strong>${esc(item.name)}</strong><small>RM${item.price} ${game.selected.includes(item.id) ? '· ✓ dipilih' : ''}</small></button>`).join('')}</div>
    <div class="shop-total">${game.selected.length ? `${game.selected.length} item dipilih. Semak jumlah sebelum meneruskan.` : 'Pilih sekurang-kurangnya satu item.'}</div>
    <div class="game-bottom"><small>Tidak cukup wang? Buang satu item atau buat pilihan lain.</small><button class="btn btn-primary" data-action="checkout-shop" ${!game.selected.length ? 'disabled' : ''}>Kira Baki →</button></div>`;
}

export function renderGameBoard(game) {
  const meta = GAMES.find(item => item.id === game.id);
  if (game.complete) {
    const percent = game.id === 'padan' ? 100 : game.total ? Math.round(game.score / game.total * 100) : 100;
    return `<div class="empty-state"><div class="big-icon" aria-hidden="true">🌟</div><span class="pill green">Aktiviti selesai</span><h1 style="margin-top:14px">Bagus, kamu sudah cuba!</h1><p>${game.id === 'padan' ? `Kamu menemui semua ${game.score} pasangan.` : `Skor latihan: ${game.score} daripada ${game.total}. Skor membantu kita memilih latihan seterusnya, bukan mengukur kecerdasan.`}</p><div class="card" style="max-width:380px;margin:0 auto 20px;padding:17px"><strong>${percent}% ketepatan pusingan ini</strong><div class="bar" style="margin-top:10px"><span style="width:${percent}%"></span></div></div><div class="practice-actions" style="justify-content:center"><button class="btn btn-primary" data-action="replay-game">Main Semula</button><button class="btn btn-secondary" data-action="back-games">Pilih Permainan Lain</button></div></div>`;
  }
  let content = '';
  if (['kira', 'kata', 'alam'].includes(game.id)) content = choiceRound(game);
  else if (game.id === 'padan') content = memoryRound(game);
  else if (game.id === 'rutin') content = sequenceRound(game);
  else if (game.id === 'belanja') content = shopRound(game);
  return `<div class="page-head"><div><div class="eyebrow">${esc(meta?.subject || 'Permainan')}</div><h1>${esc(meta?.icon || '')} ${esc(meta?.title || 'Permainan')}</h1></div><button class="btn btn-secondary btn-small" data-action="back-games">← Keluar</button></div><section class="card game-board">${content}</section>`;
}
