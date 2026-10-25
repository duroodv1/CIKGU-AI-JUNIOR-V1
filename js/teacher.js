const clean = value => String(value ?? '').replace(/[<>]/g, '').trim();
const short = (value, max = 900) => clean(value).slice(0, max);
const numberText = value => Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);

export function makePracticeGuide(topic, question, level = 1) {
  const steps = [
    {
      title: 'Fahami soalan',
      text: `Baca perlahan. Apakah yang perlu kita cari?\n\n${question.prompt}`,
      visual: question.visual || topic.example.visual
    },
    {
      title: 'Ingat konsep',
      text: topic.summary,
      visual: topic.points[0]
    }
  ];
  if (level === 1) {
    steps.push({ title: 'Lihat contoh dahulu', text: topic.example.text, visual: topic.example.visual });
  }
  const labels = ['Kenal pasti maklumat', 'Pilih kaedah', 'Selesaikan langkah demi langkah', 'Teruskan langkah'];
  question.steps.forEach((text, index) => {
    steps.push({ title: labels[Math.min(index, labels.length - 1)], text, visual: index === 0 ? question.visual : '' });
  });
  steps.push({ title: 'Semak jawapan', text: question.check });
  steps.push({ title: 'Jawapan akhir', text: question.options[question.answer], final: true });
  const nextQuestion = question === topic.alt ? topic.quiz : topic.alt;
  steps.push({ title: 'Cuba sendiri', text: nextQuestion.prompt, visual: nextQuestion.visual, tryThis: true });
  return { steps, source: 'prasedia', topicTitle: topic.title, question: question.prompt };
}

export function makeTopicGuide(topic, level = 1) {
  const steps = [
    { title: 'Fahami tujuan', text: `Kita sedang belajar topik “${topic.title}”.\n\n${topic.summary}`, visual: topic.example.visual },
    { title: 'Maklumat penting 1', text: topic.points[0] },
    { title: 'Maklumat penting 2', text: topic.points[1] },
    { title: 'Maklumat penting 3', text: topic.points[2] },
    { title: 'Contoh', text: topic.example.text, visual: topic.example.visual },
    { title: 'Semak kefahaman', text: topic.quiz.prompt, visual: topic.quiz.visual },
    { title: 'Cuba sendiri', text: 'Cuba jawab soalan latihan. Jika perlu, tekan “Beri Petunjuk”. Kamu tidak perlu tergesa-gesa.', tryThis: true }
  ];
  if (level === 3) {
    const attempt = steps.splice(5, 1)[0];
    steps.unshift({ title: 'Cuba fikir dahulu', text: attempt.text, visual: attempt.visual });
  }
  return { steps, source: 'prasedia', topicTitle: topic.title, question: topic.title };
}

function arithmeticGuide(left, operator, right, useRm = false) {
  const unit = useRm ? 'RM' : '';
  const operations = {
    '+': { name: 'tambah', reason: 'dua nilai digabungkan', result: left + right, check: () => `${unit}${numberText(left + right)} − ${unit}${numberText(right)} = ${unit}${numberText(left)}` },
    '-': { name: 'tolak', reason: 'kita mencari baki atau beza', result: left - right, check: () => `${unit}${numberText(right)} + ${unit}${numberText(left - right)} = ${unit}${numberText(left)}` },
    '×': { name: 'darab', reason: 'kumpulan yang sama banyak ditambah secara berulang', result: left * right, check: () => right !== 0 ? `${unit}${numberText(left * right)} ÷ ${unit}${numberText(right)} = ${unit}${numberText(left)}` : 'Semak dengan menulis semula tambah berulang.' },
    '÷': { name: 'bahagi', reason: 'satu jumlah dikongsi kepada kumpulan sama banyak', result: right === 0 ? null : left / right, check: () => right !== 0 ? `${unit}${numberText(right)} × ${unit}${numberText(left / right)} = ${unit}${numberText(left)}` : '' }
  };
  const operation = operations[operator];
  if (!operation || operation.result === null || !Number.isFinite(operation.result)) return null;
  const displayOperator = operator === '-' ? '−' : operator;
  const resultText = `${unit}${numberText(operation.result)}`;
  const expression = `${unit}${numberText(left)} ${displayOperator} ${unit}${numberText(right)} = ${resultText}`;
  const visual = operator === '+' && left <= 10 && right <= 10 && Number.isInteger(left) && Number.isInteger(right)
    ? `${'●'.repeat(left)} + ${'●'.repeat(right)} = ${'●'.repeat(left + right)}`
    : expression;
  return {
    source: 'kalkulator-berpandu',
    steps: [
      { title: 'Fahami soalan', text: `Kita perlu mengira ${unit}${numberText(left)} ${displayOperator} ${unit}${numberText(right)}.` },
      { title: 'Pilih kaedah', text: `Kita menggunakan operasi ${operation.name} kerana ${operation.reason}.` },
      { title: 'Selesaikan', text: expression, visual },
      { title: 'Berikan contoh', text: operator === '+' ? 'Bayangkan dua kumpulan objek digabungkan. Bilang semua objek satu demi satu.' : operator === '-' ? 'Bayangkan sebahagian objek diambil. Bilang objek yang masih tinggal.' : `Ingat bahawa ${operation.name} mempunyai operasi songsang untuk menyemak.` },
      { title: 'Jawapan akhir', text: resultText, final: true },
      { title: 'Semak jawapan', text: operation.check() },
      { title: 'Cuba sendiri', text: `Cuba kira: ${unit}${numberText(left + 1)} ${displayOperator} ${unit}${numberText(right)}. Tulis langkah anda dahulu.` }
    ]
  };
}

function localQuestionGuide(text, topic) {
  const normalized = text.replace(/,/g, '.').replace(/−/g, '-').replace(/[x×]/gi, '×').replace(/[:/]/g, '÷').replace(/\*/g, '×');
  const direct = normalized.match(/(RM)?\s*(\d+(?:\.\d+)?)\s*([+\-×÷])\s*(RM)?\s*(\d+(?:\.\d+)?)/i);
  if (direct) {
    return arithmeticGuide(Number(direct[2]), direct[3], Number(direct[5]), Boolean(direct[1] || direct[4] || /RM/i.test(text)));
  }

  const money = [...normalized.matchAll(/RM\s*(\d+(?:\.\d+)?)/gi)].map(match => Number(match[1]));
  if (money.length >= 2 && /baki|bayar|harga/i.test(normalized) && money.every(Number.isFinite)) {
    const paid = Math.max(...money);
    const price = Math.min(...money);
    if (paid !== price) {
      const guide = arithmeticGuide(paid, '-', price, true);
      guide.steps[0].text = 'Kita mencari baki. Wang yang dibayar mesti lebih besar daripada harga dalam soalan mudah ini.';
      guide.steps[1].text = `Gunakan tolak: wang dibayar RM${numberText(paid)} − harga RM${numberText(price)}. Tolak digunakan kerana sebahagian wang telah digunakan.`;
      return guide;
    }
  }

  const numbers = (normalized.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
  if (numbers.length >= 2 && /lagi|menerima|diberi|datang|jumlah/i.test(normalized) && !/baki|tinggal|dimakan|berlalu/i.test(normalized)) {
    return arithmeticGuide(numbers[0], '+', numbers[1], /RM/i.test(text));
  }
  if (numbers.length >= 2 && /baki|tinggal|dimakan|berlalu|keluar/i.test(normalized)) {
    return arithmeticGuide(Math.max(numbers[0], numbers[1]), '-', Math.min(numbers[0], numbers[1]), /RM/i.test(text));
  }

  if (topic) {
    const exact = [topic.quiz, topic.alt].find(question => question.prompt.toLocaleLowerCase() === text.toLocaleLowerCase().trim());
    if (exact) return makePracticeGuide(topic, exact);
    return {
      source: 'nota-berpandu',
      notice: 'Mod tanpa AI menggunakan nota prasedia. Untuk soalan baharu yang berbeza, semak semula bersama ibu bapa atau gunakan AI dalam talian yang telah diuji.',
      steps: [
        { title: 'Fahami soalan', text: `Soalan kamu: “${short(text, 300)}”\n\nMari gunakan nota topik ${topic.title} sebagai panduan.` },
        { title: 'Maklumat berkaitan', text: topic.summary, visual: topic.points[0] },
        { title: 'Lihat contoh', text: topic.example.text, visual: topic.example.visual },
        { title: 'Semak bersama', text: `Bandingkan soalan dengan contoh. ${topic.points[1]}` },
        { title: 'Cuba sendiri', text: topic.alt.prompt, visual: topic.alt.visual, tryThis: true }
      ]
    };
  }
  return null;
}

export function answerLocally(text, topic) {
  const guide = localQuestionGuide(text, topic);
  if (guide) return guide;
  return {
    source: 'had-prasedia',
    notice: 'Saya belum dapat memahami soalan baharu ini tanpa AI dalam talian. Saya tidak akan mereka jawapan.',
    steps: [
      { title: 'Mari pilih cara belajar', text: 'Kamu boleh pilih topik di sebelah, taip pengiraan seperti “RM10 − RM4”, atau tanya soalan latihan yang disediakan.' },
      { title: 'Contoh yang boleh saya bimbing', text: '• 3 + 2\n• RM10 − RM4\n• Soalan daripada topik yang dipilih' },
      { title: 'Kamu masih boleh belajar', text: 'Semua nota, latihan dan permainan prasedia masih berfungsi tanpa internet.' }
    ]
  };
}

function normalizeGuide(data) {
  if (!data || !Array.isArray(data.steps)) throw new Error('Format jawapan AI tidak lengkap.');
  const steps = data.steps.slice(0, 10).map((step, index) => ({
    title: short(step.title || `Langkah ${index + 1}`, 100),
    text: short(step.text, 1200),
    visual: short(step.visual || '', 300),
    final: Boolean(step.final),
    tryThis: Boolean(step.tryThis)
  })).filter(step => step.text);
  if (steps.length < 3) throw new Error('Jawapan AI tidak mempunyai langkah yang mencukupi.');
  return {
    source: 'ai',
    steps,
    notice: data.uncertain ? 'Cikgu AI tidak pasti tentang sesuatu maklumat. Sila semak dengan sumber atau orang dewasa.' : '',
    usage: data.usage || null
  };
}

async function fetchJson(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, credentials: 'omit' });
    let data = {};
    try { data = await response.json(); } catch { data = { error: 'Pelayan memberi respons yang tidak sah.' }; }
    if (!response.ok) {
      const error = new Error(data.error || `Permintaan gagal (${response.status}).`);
      error.status = response.status;
      error.code = data.code;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function validateBackendUrl(value) {
  if (!value) throw new Error('Masukkan alamat backend AI dahulu.');
  let url;
  try { url = new URL(value); } catch { throw new Error('Alamat backend tidak sah. Contoh: https://backend-anda.example.com'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Backend mesti menggunakan HTTPS (atau HTTP untuk ujian setempat).');
  if (location.protocol === 'https:' && url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Halaman HTTPS tidak boleh menghubungi backend HTTP. Gunakan HTTPS.');
  }
  return url.origin;
}

export async function testAIConnection(baseUrl, provider) {
  const base = validateBackendUrl(baseUrl);
  const health = await fetchJson(`${base}/health`, { headers: { Accept: 'application/json' } }, 10000);
  if (!health.providers?.[provider]?.configured) {
    throw new Error(`Backend bersambung, tetapi ${provider === 'gemini' ? 'Gemini' : 'GPT'} belum dikonfigurasi pada pelayan.`);
  }
  await fetchJson(`${base}/api/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ provider })
  }, 30000);
  return { health, testedAt: new Date().toISOString(), baseUrl: base };
}

export async function askOnlineAI({ baseUrl, provider, question, subject, topic, level }) {
  const base = validateBackendUrl(baseUrl);
  const data = await fetchJson(`${base}/api/teach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      provider,
      question: short(question, 700),
      subject: short(subject || '', 100),
      topic: short(topic || '', 100),
      level: Number(level) || 1
    })
  }, 35000);
  return normalizeGuide(data);
}
