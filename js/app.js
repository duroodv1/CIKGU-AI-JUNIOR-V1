import { SUBJECTS, LEVELS, GAMES, findSubject, findTopic } from './content.js';
import { loadState, saveState, clearState, createPin, verifyPin, storageEstimate, requestPersistentStorage } from './store.js';
import { makePracticeGuide, makeTopicGuide, answerLocally, askOnlineAI, testAIConnection, validateBackendUrl } from './teacher.js';
import { getPracticeQuestions } from './question-bank.js';
import { createTopicActivity, answerTopicActivity, retryTopicActivity, nextTopicActivity, pickActivitySequence, resetActivitySequence, checkActivitySequence, selectActivityMatch } from './activity-engine.js';
import { markTopicOpened, markNoteRead, recordPractice, recordHelp, recordGame, recordTopicActivity } from './progress.js';
import { createGame, getCurrentQuestion, answerChoice, nextGameRound, flipMemoryCard, resolveMemoryTurn, pickSequenceCard, checkSequence, toggleShopItem, checkoutShop } from './game-engine.js';
import { esc, attr, mascotSvg, audioAvailable, todayKey } from './ui.js';
import { renderStudent } from './student-views.js';
import { renderParent, renderParentAuth } from './parent-views.js';
import { samplePlayer, audioStatusText } from './audio.js';
import { noteSpeechSegments, questionSpeechSegments, guideSpeechSegments, speechTextFromSegments } from './speech-content.js';

const $ = selector => document.querySelector(selector);
const app = $('#app');
const main = $('#main');
const fullMain = $('#full-main');
const studentShell = $('#student-shell');
const modal = $('#modal');
const modalContent = $('#modal-content');
let state;
let deferredInstallPrompt = null;
let saveQueue = Promise.resolve();
let toastTimer;
let memoryTimer;

const freshPractice = (variant = 0) => ({ variant, selected: null, answeredCorrect: false, wrongAttempts: 0, feedback: null, lastWrong: null });
const initialChat = () => ({
  subjectId: state?.progress.last?.subjectId || 'matematik',
  topicId: state?.progress.last?.topicId || 'nombor',
  messages: [{ role: 'teacher', text: 'Helo! Saya Cikgu AI Junior. Tanya satu soalan atau pilih contoh di bawah. Saya akan tunjukkan langkahnya satu demi satu.' }],
  guide: null,
  step: 0,
  busy: false,
  notice: ''
});

const ui = {
  mode: 'mode',
  view: 'mode',
  subjectId: null,
  topicId: null,
  level: 1,
  lessonTab: 'notes',
  practice: freshPractice(),
  practiceScope: 'topic',
  guide: null,
  guideStep: 0,
  chat: null,
  game: null,
  activity: null,
  parentTab: 'overview',
  parentAuth: 'login',
  parentAuthenticated: false,
  reportSubject: 'all',
  offlineReady: false,
  offlineStatus: '',
  audioOfflineReady: false,
  audioOfflineDone: 0,
  audioOfflineTotal: 0,
  audioOfflineBytes: 0,
  audioOfflineDownloading: false,
  audioOfflineStatus: '',
  storageText: '',
  aiTesting: false,
  aiMessage: '',
  aiSuccess: false
};

function commit() {
  saveQueue = saveQueue.then(() => saveState(state)).catch(error => {
    console.error(error);
    toast('Perubahan berjalan, tetapi storan peranti mungkin penuh atau disekat.');
  });
  return saveQueue;
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 3600);
}

function announce(message) {
  $('#announcer').textContent = message;
}

function applyPreferences() {
  const root = document.documentElement;
  root.dataset.font = state.settings.font;
  root.dataset.contrast = state.settings.contrast;
  root.dataset.calm = String(state.settings.calm);
  root.dataset.reduceMotion = String(state.settings.reduceMotion);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.settings.calm ? '#f6f7f7' : '#f7f9fc');
}

function openModal(content) {
  modalContent.innerHTML = content;
  if (!modal.open) modal.showModal();
}
function closeModal() { if (modal.open) modal.close(); }
function modalShell(title, body, icon = '') {
  return `<div class="modal-body"><div class="modal-head"><div>${icon ? `<div class="modal-icon" aria-hidden="true">${icon}</div>` : ''}<h2 id="modal-title">${esc(title)}</h2></div><button class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>${body}</div>`;
}

function renderMode() {
  fullMain.innerHTML = `<div class="mode-page"><div class="mode-intro"><div class="mascot-welcome">${mascotSvg()}</div><div class="eyebrow">Ruang belajar mesra PPKI · 9–11 tahun</div><h1>Belajar ikut kemampuan.<br>Faham langkah demi langkah.</h1><p>Belajar Mengikut Kemampuan • Faham Langkah Demi Langkah • Yakin Berdikari</p></div><div class="mode-grid"><button class="mode-card student" data-action="choose-student"><span class="mode-decoration" aria-hidden="true">📚</span><span class="mode-icon" aria-hidden="true">👧</span><h2>Saya Murid</h2><p>Pilih subjek, baca nota bergambar, tanya Cikgu AI, buat latihan dan bermain.</p><span class="mode-cta">Mula Belajar <span aria-hidden="true">→</span></span></button><button class="mode-card parent" data-action="choose-parent"><span class="mode-decoration" aria-hidden="true">📈</span><span class="mode-icon" aria-hidden="true">👨‍👩‍👧</span><h2>Saya Ibu Bapa</h2><p>Lihat kemajuan anak dan urus tetapan audio, visual, AI, luar talian serta privasi.</p><span class="mode-cta">Buka Ruang Ibu Bapa <span aria-hidden="true">→</span></span></button></div><div class="mode-footer"><span aria-hidden="true">🔒</span><span>Data kemajuan disimpan pada peranti ini · Kandungan teras boleh digunakan tanpa AI</span></div></div>`;
}

function updateChrome() {
  const online = navigator.onLine;
  const badge = $('#connection-badge');
  badge.classList.toggle('offline', !online);
  badge.querySelector('span:last-child').textContent = online ? 'Dalam talian' : 'Luar talian · kandungan disimpan';
  const modeButton = $('#mode-button');
  if (ui.mode === 'student') modeButton.innerHTML = '<span aria-hidden="true">👧</span><span>Mod Murid</span><span aria-hidden="true">⌄</span>';
  else if (ui.mode === 'parent') modeButton.innerHTML = '<span aria-hidden="true">👨‍👩‍👧</span><span>Mod Ibu Bapa</span><span aria-hidden="true">⌄</span>';
  else modeButton.innerHTML = '<span aria-hidden="true">🏠</span><span>Pilih Mod</span><span aria-hidden="true">⌄</span>';
  document.querySelectorAll('[data-nav]').forEach(button => {
    const nav = button.dataset.nav;
    const active = (nav === 'subjects' && ['subjects', 'subject', 'lesson'].includes(ui.view)) || nav === ui.view || (nav === 'games' && ui.view === 'game');
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
}

function render({ focus = false } = {}) {
  if (!state) return;
  applyPreferences();
  app.hidden = false;
  const student = ui.mode === 'student';
  studentShell.hidden = !student;
  fullMain.hidden = student;
  if (student) {
    main.innerHTML = renderStudent(state, ui);
  } else if (ui.mode === 'parent') {
    fullMain.innerHTML = ui.parentAuthenticated ? renderParent(state, ui) : renderParentAuth(state, ui.parentAuth);
  } else {
    renderMode();
  }
  updateChrome();
  syncAudioControls();
  if (focus) requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? 'auto' : 'smooth' });
    (student ? main : fullMain).focus({ preventScroll: true });
  });
}

function navigate(view, focus = true) {
  samplePlayer.stop();
  ui.view = view;
  render({ focus });
}

function currentTopic() { return findTopic(ui.subjectId, ui.topicId); }
function practiceQuestions() {
  return getPracticeQuestions({ subjectId: ui.subjectId, topicId: ui.topicId, scope: ui.practiceScope });
}
function syncPracticeTopic() {
  if (ui.practiceScope !== 'subject') return;
  const question = practiceQuestions()[ui.practice.variant];
  if (question) ui.topicId = question.topicId;
}
function currentQuestion() {
  return practiceQuestions()[ui.practice.variant] || null;
}

function openLesson(subjectId, topicId, tab = 'notes') {
  const subject = findSubject(subjectId);
  const topic = findTopic(subjectId, topicId);
  if (!subject || !topic) return;
  ui.mode = 'student';
  ui.subjectId = subjectId;
  ui.topicId = topicId;
  ui.lessonTab = tab;
  ui.practiceScope = 'topic';
  ui.activity = null;
  ui.practice = freshPractice();
  ui.guide = null;
  ui.guideStep = 0;
  const stats = state.progress.topics[`${subjectId}/${topicId}`];
  if (stats?.lastLevel) ui.level = Math.max(1, Math.min(3, stats.lastLevel));
  markTopicOpened(state, subjectId, topicId, ui.level);
  commit();
  navigate('lesson');
}

function startSubjectPractice(subjectId) {
  const subject = findSubject(subjectId);
  if (!subject || !getPracticeQuestions({ subjectId, scope: 'subject' }).length) return;
  ui.mode = 'student';
  ui.subjectId = subjectId;
  ui.practiceScope = 'subject';
  ui.practice = freshPractice(0);
  ui.lessonTab = 'practice';
  ui.guide = null;
  ui.guideStep = 0;
  syncPracticeTopic();
  markTopicOpened(state, ui.subjectId, ui.topicId, ui.level);
  commit();
  navigate('lesson');
}

async function saveCompletedActivity() {
  if (ui.activity?.complete && !ui.activity.recorded) {
    recordTopicActivity(state, ui.activity);
    await commit();
  }
}

function resetPractice(variant = null) {
  samplePlayer.stop();
  const total = practiceQuestions().length;
  const next = variant === null
    ? (total ? (ui.practice.variant + 1) % total : 0)
    : Math.max(0, Math.min(Number(variant) || 0, Math.max(0, total - 1)));
  ui.practice = freshPractice(next);
  ui.guide = null;
  ui.guideStep = 0;
  syncPracticeTopic();
}

function showExample() {
  const topic = currentTopic();
  if (!topic) return;
  recordHelp(state, { subjectId: ui.subjectId, topicId: ui.topicId, level: ui.level, type: 'example' });
  commit();
  openModal(modalShell('Tunjuk Contoh', `<p>Contoh ini hampir sama. Perhatikan langkahnya dahulu, kemudian cuba soalan kamu.</p><div class="example-card card" style="padding:18px"><p>${esc(topic.example.text)}</p><div class="example-visual">${esc(topic.example.visual)}</div></div><div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">Saya Faham</button></div>`, '💡'));
}

function repeatCurrentStep() {
  const step = ui.guide?.steps[ui.guideStep];
  const topic = currentTopic();
  if (!step) return;
  openModal(modalShell('Terangkan Sekali Lagi', `<p>Mari baca dengan perlahan. Tidak perlu tergesa-gesa.</p><div class="step-card"><span class="step-kicker">${esc(step.title)}</span><p>${esc(step.text)}</p></div>${topic ? `<div class="notice calm" style="margin-top:15px"><span>🌱</span><p><strong>Ingat satu perkara:</strong><br>${esc(topic.points[0])}</p></div>` : ''}<div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">Cuba Sekali Lagi</button></div>`, '↻'));
}

function softTone(correct) {
  if (!state.settings.sound || state.settings.calm) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const context = new Audio();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = correct ? 520 : 330;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + .02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + .16);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .18);
    oscillator.onended = () => context.close();
  } catch { /* audio tidak kritikal */ }
}

function syncAudioControls() {
  const status = samplePlayer.status;
  document.querySelectorAll('[data-audio-control="play"]').forEach(button => { button.disabled = status === 'playing' || status === 'loading'; });
  document.querySelectorAll('[data-audio-control="pause"]').forEach(button => { button.disabled = status !== 'playing'; });
  document.querySelectorAll('[data-audio-control="stop"]').forEach(button => { button.disabled = status === 'idle'; });
  document.querySelectorAll('[data-audio-status]').forEach(element => { element.textContent = audioStatusText(status); });
}

samplePlayer.onChange = ({ message }) => {
  syncAudioControls();
  announce(message);
};

function speechSegments(target) {
  const topic = currentTopic();
  if (target === 'note') return noteSpeechSegments(topic);
  if (target === 'question') return questionSpeechSegments(currentQuestion());
  if (target === 'step') return guideSpeechSegments(ui.guide?.steps[ui.guideStep]);
  if (target === 'chat-step') return guideSpeechSegments(ui.chat?.guide?.steps[ui.chat.step]);
  return [];
}

async function playAudio(target) {
  if (!audioAvailable(state)) return;
  try {
    if (target === 'settings') {
      await samplePlayer.play();
      return;
    }
    const segments = speechSegments(target);
    const text = speechTextFromSegments(segments);
    if (!text) { toast('Tiada teks yang sesuai untuk dibaca pada paparan ini.'); return; }
    await samplePlayer.playText(text, { endpoint: state.settings.ttsEndpoint?.trim() || '/api/tts', segments });
  } catch (error) {
    toast(error.message);
  }
}

function studentSettingsModal() {
  const toggle = (key, title, description) => `<div class="switch-row"><div><label id="student-${key}">${title}</label><p>${description}</p></div><button class="switch" role="switch" aria-checked="${state.settings[key]}" aria-labelledby="student-${key}" data-action="toggle-setting" data-setting="${key}"></button></div>`;
  openModal(modalShell('Tetapan Paparan & Audio', `${toggle('voice', 'Bacaan suara dwibahasa', 'BM menggunakan ms-MY-YasminNeural dan English menggunakan en-US-AriaNeural. Audio prasedia menggunakan peket tempatan; teks baharu memerlukan internet.')}${toggle('sound', 'Bunyi lembut', 'Bunyi maklum balas selepas jawapan.')}${toggle('calm', 'Mod tenang', 'Warna lebih lembut dan bunyi dimatikan.')}${toggle('reduceMotion', 'Kurangkan animasi', 'Hadkan pergerakan pada skrin.')}<div class="field" style="margin-top:18px"><label for="student-font">Saiz teks</label><select id="student-font" class="select" data-change="font"><option value="normal" ${state.settings.font === 'normal' ? 'selected' : ''}>Biasa</option><option value="large" ${state.settings.font === 'large' ? 'selected' : ''}>Besar</option><option value="larger" ${state.settings.font === 'larger' ? 'selected' : ''}>Lebih besar</option></select></div><div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">Selesai</button></div>`, '⚙️'));
}

function aiIsUsable() {
  if (state.ai.provider === 'none' || !state.ai.consent || !navigator.onLine) return false;
  const test = state.ai.tests[state.ai.provider];
  if (!test || test.baseUrl !== state.ai.baseUrl) return false;
  const used = state.ai.usage.date === todayKey() ? state.ai.usage.count : 0;
  return used < state.ai.dailyLimit;
}

function aiFallbackReason() {
  if (state.ai.provider === 'none') return '';
  if (!navigator.onLine) return 'Cikgu AI dalam talian tidak tersedia buat sementara waktu. Kamu masih boleh belajar menggunakan nota, contoh dan latihan yang disimpan dalam aplikasi.';
  if (!state.ai.consent) return 'Persetujuan AI belum diberikan oleh ibu bapa. Panduan prasedia pada peranti digunakan.';
  if (state.ai.tests[state.ai.provider]?.baseUrl !== state.ai.baseUrl) return 'Penyedia AI belum berjaya diuji untuk backend ini. Panduan prasedia digunakan.';
  const used = state.ai.usage.date === todayKey() ? state.ai.usage.count : 0;
  if (used >= state.ai.dailyLimit) return 'Had penggunaan AI hari ini telah dicapai. Panggilan AI dihentikan dan kandungan prasedia digunakan.';
  return '';
}

async function handleChatSubmit(form) {
  if (ui.chat.busy) return;
  const data = new FormData(form);
  const question = String(data.get('question') || '').trim();
  if (!question) return;
  const subject = findSubject(ui.chat.subjectId) || SUBJECTS[0];
  const topic = findTopic(subject.id, ui.chat.topicId) || subject.topics[0];
  ui.chat.messages.push({ role: 'student', text: question });
  ui.chat.busy = true;
  ui.chat.guide = null;
  ui.chat.step = 0;
  ui.chat.notice = aiFallbackReason();
  render();
  let guide = null;
  if (aiIsUsable()) {
    const used = state.ai.usage.date === todayKey() ? state.ai.usage.count : 0;
    state.ai.usage = { date: todayKey(), count: used + 1 };
    await commit();
    try {
      guide = await askOnlineAI({ baseUrl: state.ai.baseUrl, provider: state.ai.provider, question, subject: subject.title, topic: topic.title, level: ui.level });
    } catch (error) {
      console.warn('AI online gagal; menggunakan sandaran setempat.', error);
      if (error.status === 429 || error.code === 'QUOTA_EXCEEDED' || error.code === 'DAILY_LIMIT') {
        state.ai.usage = { date: todayKey(), count: state.ai.dailyLimit };
        await commit();
      }
      ui.chat.notice = `AI dalam talian tidak dapat digunakan (${error.message}). Panduan prasedia digunakan sebagai sandaran.`;
    }
  }
  if (!guide) guide = answerLocally(question, topic);
  ui.chat.messages.push({ role: 'teacher', text: guide.source === 'ai' ? 'Saya sudah menyemak soalan ini dan menyusun penerangan. Mari baca satu langkah pada satu masa.' : guide.source === 'had-prasedia' ? 'Saya tidak mahu mereka jawapan. Mari pilih cara yang boleh saya bimbing dengan tepat.' : 'Bagus, kamu sudah bertanya! Mari kita selesaikan melalui kad langkah di bawah.' });
  ui.chat.guide = guide;
  ui.chat.step = 0;
  ui.chat.busy = false;
  render();
  requestAnimationFrame(() => { const messages = $('#chat-messages'); if (messages) messages.scrollTop = messages.scrollHeight; });
}

function audioManifest() {
  return globalThis.CIKGU_OFFLINE_AUDIO || { clips: [], total: 0, bytes: 0 };
}

function audioSizeText(bytes) {
  return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : 'saiz belum diketahui';
}

function updateAudioOfflinePanel() {
  const status = $('#audio-offline-status');
  if (status) status.textContent = ui.audioOfflineStatus;
  const title = $('#audio-offline-title');
  if (title) title.textContent = ui.audioOfflineReady ? 'Audio prasedia sedia untuk luar talian.' : ui.audioOfflineDownloading ? 'Peket audio sedang dimuat turun.' : 'Peket audio belum disimpan sepenuhnya.';
  const bar = $('#audio-offline-bar');
  if (bar) bar.style.width = `${ui.audioOfflineTotal ? Math.min(100, ui.audioOfflineDone / ui.audioOfflineTotal * 100) : 0}%`;
  const button = $('#download-audio-button');
  if (button) {
    button.disabled = ui.audioOfflineDownloading || ui.audioOfflineReady || !ui.audioOfflineTotal;
    button.textContent = ui.audioOfflineDownloading ? 'Sedang Memuat Turun…' : ui.audioOfflineReady ? 'Audio Luar Talian Lengkap ✓' : `Sediakan Audio Luar Talian (${audioSizeText(ui.audioOfflineBytes)})`;
  }
}

function applyAudioOfflineStatus(status, downloading = false) {
  ui.audioOfflineDone = Number(status.done) || 0;
  ui.audioOfflineTotal = Number(status.total) || 0;
  ui.audioOfflineBytes = Number(status.bytes) || 0;
  ui.audioOfflineReady = Boolean(status.ready);
  ui.audioOfflineDownloading = downloading;
  ui.audioOfflineStatus = ui.audioOfflineReady
    ? `${ui.audioOfflineTotal} klip audio BM/English telah disimpan. Nota, soalan dan panduan prasedia boleh didengar tanpa internet.`
    : `${ui.audioOfflineDone}/${ui.audioOfflineTotal} klip disimpan · ${audioSizeText(ui.audioOfflineBytes)}. Lengkapkan muat turun sebelum menutup internet. Teks baharu tetap memerlukan penjanaan dalam talian.`;
  updateAudioOfflinePanel();
}

async function serviceWorkerRequest(type, timeout = 20000) {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker tidak disokong.');
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker belum aktif.')), 10000))
  ]);
  const worker = registration.active || navigator.serviceWorker.controller;
  if (!worker) throw new Error('Service Worker belum aktif.');
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = timeout ? setTimeout(() => { channel.port1.close(); reject(new Error('Pelayan cache tidak menjawab.')); }, timeout) : null;
    channel.port1.onmessage = event => {
      if (timer) clearTimeout(timer);
      channel.port1.close();
      if (event.data?.type === 'AUDIO_ERROR') reject(new Error(event.data.message || 'Muat turun audio gagal.'));
      else resolve(event.data);
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}

async function checkAudioOfflineCache() {
  const manifest = audioManifest();
  ui.audioOfflineTotal = manifest.total || manifest.clips?.length || 0;
  ui.audioOfflineBytes = manifest.bytes || 0;
  if (location.protocol === 'file:') {
    applyAudioOfflineStatus({ done: ui.audioOfflineTotal, total: ui.audioOfflineTotal, bytes: ui.audioOfflineBytes, ready: ui.audioOfflineTotal > 0 });
    if (ui.audioOfflineReady) ui.audioOfflineStatus = `${ui.audioOfflineTotal} klip audio BM/English dibundel dalam aplikasi desktop dan boleh dimainkan serta-merta tanpa internet. Teks baharu masih memerlukan pelayan audio dalam talian.`;
    updateAudioOfflinePanel();
    return;
  }
  try {
    applyAudioOfflineStatus(await serviceWorkerRequest('AUDIO_STATUS'));
  } catch (error) {
    ui.audioOfflineReady = false;
    ui.audioOfflineStatus = `Status peket audio belum dapat disahkan: ${error.message}`;
    updateAudioOfflinePanel();
  }
}

async function downloadOfflineAudio() {
  if (location.protocol === 'file:') { await checkAudioOfflineCache(); return; }
  if (!navigator.onLine) { toast('Sambungkan internet untuk melengkapkan muat turun audio.'); return; }
  if (ui.audioOfflineDownloading) return;
  requestPersistentStorage().catch(() => false);
  ui.audioOfflineDownloading = true;
  ui.audioOfflineStatus = `Memulakan muat turun ${audioSizeText(ui.audioOfflineBytes)}. Biarkan aplikasi terbuka; klip yang sudah disimpan tidak akan diulang.`;
  updateAudioOfflinePanel();
  try {
    const status = await serviceWorkerRequest('DOWNLOAD_AUDIO', 0);
    applyAudioOfflineStatus(status);
    toast('Peket audio luar talian lengkap dan telah disahkan.');
    if (ui.mode === 'parent' && ui.parentTab === 'settings') render();
  } catch (error) {
    ui.audioOfflineDownloading = false;
    ui.audioOfflineStatus = `Muat turun berhenti: ${error.message} Klip yang sudah disimpan akan dikekalkan; tekan butang untuk menyambung.`;
    updateAudioOfflinePanel();
    toast('Audio belum lengkap. Sambungan boleh diteruskan tanpa mengulang klip sedia ada.');
  }
}

async function checkOfflineCache() {
  if (location.protocol === 'file:') {
    ui.offlineReady = true;
    ui.offlineStatus = 'Aplikasi desktop membaca fail setempat; kandungan teras dan peket audio prasedia tidak memerlukan internet.';
    await checkAudioOfflineCache();
    if (ui.mode === 'parent') render();
    return;
  }
  if (!('caches' in window)) {
    ui.offlineReady = false;
    ui.offlineStatus = 'Storan cache tidak disokong oleh pelayar ini.';
  } else {
    try {
      const urls = ['./index.html', './styles.css', './js/app.js', './js/content.js'].map(path => new URL(path, location.href).href);
      const matches = await Promise.all(urls.map(url => caches.match(url)));
      ui.offlineReady = matches.every(Boolean);
      ui.offlineStatus = ui.offlineReady ? 'Fail utama, kandungan dan latihan telah disahkan dalam cache. Status peket audio penuh ditunjukkan secara berasingan di bawah.' : 'Storan luar talian belum lengkap. Pastikan Service Worker aktif, tunggu sebentar dan semak semula.';
    } catch (error) {
      ui.offlineReady = false;
      ui.offlineStatus = `Storan luar talian tidak dapat disemak: ${error.message}`;
    }
  }
  await checkAudioOfflineCache();
  if (ui.mode === 'parent') render();
}

async function refreshStorage() {
  try {
    const estimate = await storageEstimate();
    const used = estimate.usage ? (estimate.usage / 1024 / 1024).toFixed(2) : '0.00';
    const quota = estimate.quota ? Math.round(estimate.quota / 1024 / 1024) : 0;
    ui.storageText = `Anggaran penggunaan storan: ${used} MB${quota ? ` daripada kira-kira ${quota} MB yang tersedia untuk pelayar ini` : ''}.`;
  } catch { ui.storageText = 'Anggaran storan tidak tersedia dalam pelayar ini.'; }
  if (ui.mode === 'parent' && ui.parentAuthenticated) render();
}

async function handleAction(action, data, element) {
  switch (action) {
    case 'go-mode':
      samplePlayer.stop();
      ui.parentAuthenticated = false;
      ui.mode = 'mode'; ui.view = 'mode'; ui.game = null; ui.activity = null;
      closeModal(); navigate('mode'); break;
    case 'choose-student':
      ui.mode = 'student'; ui.view = 'subjects';
      if (!ui.chat) ui.chat = initialChat();
      navigate('subjects'); break;
    case 'choose-parent':
      ui.mode = 'parent'; ui.parentAuth = state.parent.pinSet ? 'login' : 'setup';
      ui.view = 'parent'; navigate('parent'); break;
    case 'home': navigate('subjects'); break;
    case 'open-subject':
      ui.subjectId = data.id; ui.practiceScope = 'topic'; ui.view = 'subject'; ui.guide = null; navigate('subject'); break;
    case 'start-subject-practice': startSubjectPractice(data.id); break;
    case 'back-subject': navigate('subject'); break;
    case 'continue-last':
      if (state.progress.last) openLesson(state.progress.last.subjectId, state.progress.last.topicId);
      break;
    case 'set-level':
      ui.level = Number(data.level); resetPractice(ui.practice.variant); ui.guide = null; render();
      toast(`Tahap ${ui.level} dipilih. Bantuan masih boleh diminta.`); break;
    case 'open-topic': openLesson(ui.subjectId, data.id); break;
    case 'lesson-tab': samplePlayer.stop(); ui.lessonTab = data.tab; render(); break;
    case 'note-done':
      samplePlayer.stop();
      markNoteRead(state, ui.subjectId, ui.topicId, ui.level); await commit(); ui.lessonTab = 'practice'; render(); break;
    case 'start-guide': {
      samplePlayer.stop();
      const topic = currentTopic();
      ui.guide = makePracticeGuide(topic, currentQuestion(), ui.level); ui.guideStep = 0; ui.lessonTab = 'teacher'; render(); break;
    }
    case 'start-topic-guide':
      samplePlayer.stop();
      ui.guide = makeTopicGuide(currentTopic(), ui.level); ui.guideStep = 0; ui.lessonTab = 'teacher'; render(); break;
    case 'next-step':
      samplePlayer.stop();
      if (ui.guide && ui.guideStep < ui.guide.steps.length - 1) ui.guideStep += 1;
      render(); announce(`Langkah ${ui.guideStep + 1}: ${ui.guide.steps[ui.guideStep].title}`); break;
    case 'prev-step': samplePlayer.stop(); if (ui.guideStep > 0) ui.guideStep -= 1; render(); break;
    case 'repeat-step': repeatCurrentStep(); break;
    case 'show-example': showExample(); break;
    case 'try-self': resetPractice(); ui.lessonTab = 'practice'; render(); break;
    case 'new-question': resetPractice(); render(); break;
    case 'retry-practice': resetPractice(ui.practice.variant); ui.lessonTab = 'practice'; render(); break;
    case 'easy-level': ui.level = 1; resetPractice(0); ui.lessonTab = 'practice'; render(); toast('Tahap 1 dipilih. Contoh dan bantuan visual disediakan.'); break;
    case 'select-answer':
      if (!ui.practice.answeredCorrect) {
        const index = Number(data.index);
        if (ui.practice.selected !== index) { ui.practice.selected = index; ui.practice.feedback = null; ui.practice.lastWrong = null; }
        render();
      }
      break;
    case 'check-answer': {
      const question = currentQuestion();
      if (ui.practice.selected === null) { toast('Pilih satu jawapan dahulu. Kamu boleh meminta petunjuk jika perlu.'); break; }
      if (ui.practice.lastWrong === ui.practice.selected && ui.practice.feedback) { toast('Cuba pilihan lain, atau tekan “Beri Petunjuk”.'); break; }
      const correct = ui.practice.selected === question.answer;
      recordPractice(state, { subjectId: ui.subjectId, topicId: ui.topicId, level: ui.level, correct });
      if (correct) {
        ui.practice.answeredCorrect = true;
        ui.practice.feedback = { correct: true, title: 'Bagus, jawapan kamu betul!', text: `Semak semula: ${question.check}` };
      } else {
        ui.practice.wrongAttempts += 1;
        ui.practice.lastWrong = ui.practice.selected;
        const messages = [
          `Bagus, kamu sudah cuba! Mari semak bahagian ini: ${question.hint}`,
          `Kita pecahkan kepada langkah lebih kecil. ${currentTopic().example.text}`,
          'Tidak mengapa jika masih sukar. Tekan “Tunjuk Cara” dan kita semak satu langkah pada satu masa.'
        ];
        ui.practice.feedback = { correct: false, title: 'Bagus kerana sudah cuba!', text: messages[Math.min(ui.practice.wrongAttempts - 1, 2)] };
      }
      softTone(correct); await commit(); render(); break;
    }
    case 'hint':
      recordHelp(state, { subjectId: ui.subjectId, topicId: ui.topicId, level: ui.level, type: 'hint' });
      ui.practice.feedback = { correct: false, title: 'Petunjuk kecil 💡', text: currentQuestion().hint };
      await commit(); render(); break;
    case 'repeat-explanation':
      ui.practice.feedback = { correct: false, title: 'Mari terangkan dengan cara lain', text: `${currentTopic().summary} Ingat: ${currentTopic().points[0]}` };
      render(); break;
    case 'audio-play': await playAudio(data.target); break;
    case 'audio-pause': samplePlayer.pause(); break;
    case 'audio-stop': samplePlayer.stop(); break;
    case 'save-tts-settings': {
      const value = ($('#tts-endpoint')?.value || '').trim();
      try {
        if (value) {
          const url = new URL(value);
          if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
            throw new Error('Gunakan alamat HTTP/HTTPS tanpa nama pengguna, kata laluan, query atau token.');
          }
          state.settings.ttsEndpoint = url.href.replace(/\/$/, '');
        } else {
          state.settings.ttsEndpoint = '';
        }
        await commit();
        toast(value ? 'Alamat pelayan audio Yasmin disimpan.' : 'Audio menggunakan endpoint /api/tts pada origin yang sama.');
      } catch (error) {
        toast(`Alamat audio tidak sah. ${error.message}`);
      }
      break;
    }
    case 'student-settings': studentSettingsModal(); break;
    case 'close-modal': closeModal(); break;
    case 'chat-suggestion': {
      const input = $('#chat-question'); if (input) { input.value = data.text; input.focus(); } break;
    }
    case 'chat-next': samplePlayer.stop(); if (ui.chat.guide && ui.chat.step < ui.chat.guide.steps.length - 1) ui.chat.step += 1; render(); break;
    case 'chat-prev': samplePlayer.stop(); if (ui.chat.step > 0) ui.chat.step -= 1; render(); break;
    case 'chat-done': samplePlayer.stop(); ui.chat.guide = null; ui.chat.notice = 'Bagus! Cuba tulis semula langkah dengan perkataan sendiri atau buat latihan topik.'; render(); break;
    case 'clear-chat': samplePlayer.stop(); ui.chat = initialChat(); render(); break;
    case 'open-chat-topic': openLesson(ui.chat.subjectId, ui.chat.topicId); break;
    case 'open-topic-activity': {
      const activity = createTopicActivity(ui.subjectId, ui.topicId, data.activity);
      if (!activity) { toast('Aktiviti ini belum tersedia. Sila pilih aktiviti lain.'); break; }
      ui.activity = activity; navigate('topic-activity'); break;
    }
    case 'back-activities': ui.activity = null; ui.lessonTab = 'activities'; navigate('lesson'); break;
    case 'replay-topic-activity': {
      const previous = ui.activity;
      ui.activity = createTopicActivity(previous.subjectId, previous.topicId, previous.activityId);
      render(); break;
    }
    case 'activity-answer': {
      const result = answerTopicActivity(ui.activity, Number(data.index));
      if (result) softTone(result.correct); render(); break;
    }
    case 'activity-retry': retryTopicActivity(ui.activity); render(); break;
    case 'activity-next':
      if (nextTopicActivity(ui.activity)) { await saveCompletedActivity(); render(); }
      break;
    case 'activity-sequence-card': pickActivitySequence(ui.activity, Number(data.id)); render(); break;
    case 'activity-sequence-reset': resetActivitySequence(ui.activity); render(); break;
    case 'activity-sequence-check': {
      const result = checkActivitySequence(ui.activity);
      if (result) softTone(result.correct);
      await saveCompletedActivity(); render(); break;
    }
    case 'activity-match': {
      const result = selectActivityMatch(ui.activity, data.key);
      if (result && 'correct' in result) softTone(result.correct);
      await saveCompletedActivity(); render(); break;
    }
    case 'open-game':
      clearTimeout(memoryTimer); ui.game = createGame(data.id); getCurrentQuestion(ui.game); navigate('game'); break;
    case 'back-games': clearTimeout(memoryTimer); ui.game = null; navigate('games'); break;
    case 'replay-game': {
      const id = ui.game.id; ui.game = createGame(id); getCurrentQuestion(ui.game); render(); break;
    }
    case 'game-answer': {
      const result = answerChoice(ui.game, Number(data.index));
      if (result) softTone(result.correct); render(); break;
    }
    case 'game-next':
      if (nextGameRound(ui.game)) {
        if (ui.game.complete) { recordGame(state, ui.game); await commit(); }
        render();
      }
      break;
    case 'memory-card': {
      const result = flipMemoryCard(ui.game, Number(data.index)); render();
      if (result?.resolve) memoryTimer = setTimeout(() => {
        const outcome = resolveMemoryTurn(ui.game);
        if (outcome?.match) softTone(true);
        if (ui.view === 'game') render();
      }, state.settings.reduceMotion ? 200 : 850);
      break;
    }
    case 'sequence-card': pickSequenceCard(ui.game, Number(data.id)); render(); break;
    case 'reset-sequence': ui.game.selected = []; ui.game.feedback = null; render(); break;
    case 'check-sequence': { const result = checkSequence(ui.game); if (result) softTone(result.correct); render(); break; }
    case 'shop-item': {
      const result = toggleShopItem(ui.game, Number(data.id));
      if (result && !result.ok) toast(result.message); else render(); break;
    }
    case 'checkout-shop': checkoutShop(ui.game); render(); break;
    case 'review-topic': openLesson(data.subject, data.topic, 'review'); break;
    case 'parent-lock': ui.parentAuthenticated = false; ui.mode = 'mode'; navigate('mode'); break;
    case 'parent-tab':
      ui.parentTab = data.tab; ui.aiMessage = ''; navigate('parent');
      if (data.tab === 'settings') { checkOfflineCache(); refreshStorage(); }
      if (data.tab === 'privacy') refreshStorage();
      break;
    case 'toggle-setting':
      state.settings[data.setting] = !state.settings[data.setting];
      element.setAttribute('aria-checked', String(state.settings[data.setting]));
      applyPreferences(); await commit();
      if (data.setting === 'voice') {
        if (!state.settings.voice) samplePlayer.stop();
        render();
      }
      break;
    case 'select-provider': {
      const urlInput = $('#ai-base-url');
      const limitInput = $('#ai-limit');
      if (urlInput) state.ai.baseUrl = urlInput.value.trim();
      if (limitInput) state.ai.dailyLimit = Number(limitInput.value) || state.ai.dailyLimit;
      state.ai.provider = data.provider;
      state.ai.consent = data.provider === 'none' ? false : state.ai.consent;
      ui.aiMessage = '';
      render();
      await commit();
      break;
    }
    case 'toggle-ai-consent': {
      const urlInput = $('#ai-base-url');
      if (urlInput) state.ai.baseUrl = urlInput.value.trim();
      state.ai.consent = !state.ai.consent;
      render();
      await commit();
      break;
    }
    case 'test-ai': {
      if (state.ai.provider === 'none') break;
      const input = $('#ai-base-url');
      state.ai.baseUrl = input?.value.trim() || state.ai.baseUrl;
      ui.aiTesting = true; ui.aiMessage = 'Menguji backend dan membuat satu panggilan API kecil. Sila tunggu…'; ui.aiSuccess = false; render();
      try {
        const result = await testAIConnection(state.ai.baseUrl, state.ai.provider);
        state.ai.baseUrl = result.baseUrl;
        state.ai.tests[state.ai.provider] = { baseUrl: result.baseUrl, testedAt: result.testedAt };
        const used = state.ai.usage.date === todayKey() ? state.ai.usage.count : 0;
        state.ai.usage = { date: todayKey(), count: used + 1 };
        ui.aiSuccess = true;
        ui.aiMessage = 'Sambungan backend dan panggilan API berjaya. Status aktif juga memerlukan persetujuan data dan baki had harian.';
      } catch (error) {
        delete state.ai.tests[state.ai.provider];
        if (error.status === 429) state.ai.usage = { date: todayKey(), count: state.ai.dailyLimit };
        ui.aiSuccess = false;
        ui.aiMessage = `Ujian belum berjaya: ${error.message} Status tidak ditandakan aktif; kandungan prasedia masih berfungsi.`;
      }
      ui.aiTesting = false; await commit(); render(); break;
    }
    case 'check-offline':
      await checkOfflineCache();
      toast(ui.offlineReady && ui.audioOfflineReady ? 'Kandungan dan audio luar talian telah disahkan.' : ui.offlineReady ? 'Kandungan teras disahkan; peket audio belum lengkap.' : 'Cache kandungan belum lengkap.');
      break;
    case 'download-audio': await downloadOfflineAudio(); break;
    case 'persist-storage': {
      try { const granted = await requestPersistentStorage(); toast(granted ? 'Storan berterusan dibenarkan oleh pelayar.' : 'Pelayar tidak memberikan storan berterusan. Eksport data secara berkala.'); }
      catch { toast('Permintaan storan tidak disokong dalam pelayar ini.'); } break;
    }
    case 'refresh-storage': await refreshStorage(); break;
    case 'change-pin':
      openModal(modalShell('Tukar PIN Ibu Bapa', `<form id="change-pin-form"><div class="field"><label for="old-pin">PIN semasa</label><input id="old-pin" name="oldPin" class="input pin-input" type="password" inputmode="numeric" minlength="6" maxlength="6" required></div><div class="field"><label for="new-pin">PIN baharu (6 digit)</label><input id="new-pin" name="newPin" class="input pin-input" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required></div><div class="field"><label for="new-pin-confirm">Ulang PIN baharu</label><input id="new-pin-confirm" name="confirm" class="input pin-input" type="password" inputmode="numeric" minlength="6" maxlength="6" required></div><p class="auth-error" id="pin-change-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">Simpan PIN Baharu</button></div></form>`, '🔐'));
      break;
    case 'export-data': {
      const exportState = {
        application: 'CIKGU AI JUNIOR PPKI V.1', exportedAt: new Date().toISOString(),
        progress: state.progress, settings: state.settings,
        ai: { provider: state.ai.provider, baseUrl: state.ai.baseUrl, dailyLimit: state.ai.dailyLimit, consent: state.ai.consent },
        note: 'Hash dan salt PIN tidak dieksport. Tiada API key disimpan dalam aplikasi.'
      };
      const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `cikgu-ppki-kemajuan-${todayKey()}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Fail eksport disediakan. Simpan di tempat yang selamat.'); break;
    }
    case 'delete-data':
      openModal(modalShell('Padam Semua Data Tempatan?', `<div class="notice danger"><span>⚠️</span><p>Tindakan ini tidak boleh diundur. Semua kemajuan, tetapan, PIN dan konfigurasi AI pada peranti ini akan dipadam.</p></div><form id="delete-data-form" style="margin-top:18px"><div class="field"><label for="delete-pin">Sahkan PIN ibu bapa</label><input id="delete-pin" name="pin" class="input pin-input" type="password" inputmode="numeric" minlength="6" maxlength="6" required></div><div class="field"><label for="delete-confirm">Taip <strong>PADAM</strong> untuk mengesahkan</label><input id="delete-confirm" name="confirmation" class="input" type="text" autocomplete="off" pattern="PADAM" required></div><p class="auth-error" id="delete-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button class="btn btn-danger" type="submit">Padam Data Sekarang</button></div></form>`, '🗑️'));
      break;
    case 'install':
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null; $('#install-button').hidden = true;
      } else toast('Gunakan menu pelayar “Pasang aplikasi” atau “Add to Home Screen” jika tersedia.');
      break;
    default: break;
  }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.id === 'chat-form') return handleChatSubmit(form);
  const data = new FormData(form);
  if (form.id === 'parent-setup-form') {
    const pin = String(data.get('pin')); const confirm = String(data.get('confirm'));
    const error = $('#auth-error');
    if (pin !== confirm) { error.textContent = 'PIN tidak sama. Sila ulang semula.'; return; }
    try {
      const button = form.querySelector('button[type="submit"]'); button.disabled = true;
      state.parent = await createPin(pin); await commit();
      ui.parentAuthenticated = true; ui.parentTab = 'overview'; render({ focus: true });
      toast('PIN ibu bapa berjaya dicipta.');
    } catch (exception) { error.textContent = exception.message; form.querySelector('button[type="submit"]').disabled = false; }
  }
  if (form.id === 'parent-login-form') {
    const button = form.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const valid = await verifyPin(String(data.get('pin')), state.parent);
      if (valid) { ui.parentAuthenticated = true; ui.parentTab = 'overview'; render({ focus: true }); }
      else { $('#auth-error').textContent = 'PIN tidak betul. Cuba sekali lagi.'; button.disabled = false; form.reset(); }
    } catch (exception) { $('#auth-error').textContent = exception.message; button.disabled = false; }
  }
  if (form.id === 'ai-settings-form') {
    try {
      const provider = state.ai.provider;
      const rawUrl = String(data.get('baseUrl') || '').trim();
      state.ai.baseUrl = provider === 'none' && !rawUrl ? '' : validateBackendUrl(rawUrl);
      state.ai.dailyLimit = Number(data.get('dailyLimit')) || 10;
      ui.aiMessage = 'Tetapan AI disimpan. Status aktif hanya diberikan selepas ujian API berjaya dan persetujuan diberikan.';
      ui.aiSuccess = true;
      render();
      await commit();
    } catch (error) { ui.aiMessage = error.message; ui.aiSuccess = false; render(); }
  }
  if (form.id === 'change-pin-form') {
    const error = $('#pin-change-error');
    if (String(data.get('newPin')) !== String(data.get('confirm'))) { error.textContent = 'PIN baharu tidak sama.'; return; }
    try {
      if (!await verifyPin(String(data.get('oldPin')), state.parent)) { error.textContent = 'PIN semasa tidak betul.'; return; }
      state.parent = await createPin(String(data.get('newPin'))); await commit(); closeModal(); toast('PIN baharu berjaya disimpan.');
    } catch (exception) { error.textContent = exception.message; }
  }
  if (form.id === 'delete-data-form') {
    const error = $('#delete-error');
    if (String(data.get('confirmation')) !== 'PADAM') { error.textContent = 'Sila taip PADAM dengan huruf besar.'; return; }
    try {
      if (!await verifyPin(String(data.get('pin')), state.parent)) { error.textContent = 'PIN tidak betul. Data tidak dipadam.'; return; }
      state = await clearState(); await commit(); closeModal();
      ui.parentAuthenticated = false; ui.chat = null; ui.game = null; ui.mode = 'mode'; ui.view = 'mode';
      applyPreferences(); render(); toast('Semua data tempatan telah dipadam.');
    } catch (exception) { error.textContent = exception.message; }
  }
}

async function handleChange(element) {
  const type = element.dataset.change;
  if (!type) return;
  if (type === 'font') { state.settings.font = element.value; applyPreferences(); await commit(); }
  if (type === 'contrast') { state.settings.contrast = element.value; applyPreferences(); await commit(); }
  if (type === 'chat-subject') {
    const subject = findSubject(element.value) || SUBJECTS[0]; ui.chat.subjectId = subject.id; ui.chat.topicId = subject.topics[0].id; ui.chat.guide = null; render();
  }
  if (type === 'chat-topic') { ui.chat.topicId = element.value; ui.chat.guide = null; render(); }
  if (type === 'report-subject') { ui.reportSubject = element.value; render(); }
}

document.body.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    if (ui.mode !== 'student') { ui.mode = 'student'; if (!ui.chat) ui.chat = initialChat(); }
    navigate(nav.dataset.nav); return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  Promise.resolve(handleAction(action, button.dataset, button)).catch(error => {
    console.error(error); toast(`Tindakan tidak dapat disiapkan: ${error.message}`);
  });
});
document.body.addEventListener('submit', event => { Promise.resolve(handleSubmit(event)).catch(error => { console.error(error); toast(error.message); }); });
document.body.addEventListener('change', event => { Promise.resolve(handleChange(event.target)).catch(error => toast(error.message)); });
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

window.addEventListener('online', () => {
  updateChrome();
  if (ui.mode === 'parent' && ui.parentTab === 'ai') render();
  toast('Sambungan internet kembali. AI yang telah diuji boleh digunakan mengikut had.');
});
window.addEventListener('offline', () => {
  updateChrome();
  if (ui.mode === 'parent' && ui.parentTab === 'ai') render();
  toast('Anda di luar talian. Nota, latihan dan permainan yang telah disimpan masih boleh digunakan.');
});
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; $('#install-button').hidden = false; });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; $('#install-button').hidden = true; toast('Aplikasi berjaya dipasang pada peranti.'); });

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !['http:', 'https:'].includes(location.protocol)) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    navigator.serviceWorker.addEventListener('message', event => {
      const message = event.data || {};
      if (message.type === 'AUDIO_PROGRESS') applyAudioOfflineStatus(message, true);
      if (message.type === 'AUDIO_COMPLETE') applyAudioOfflineStatus(message, false);
      if (message.type === 'AUDIO_ERROR') {
        ui.audioOfflineDownloading = false;
        ui.audioOfflineStatus = `Muat turun audio belum lengkap: ${message.message || 'ralat rangkaian'}. Tekan butang untuk menyambung.`;
        updateAudioOfflinePanel();
      }
    });
    await navigator.serviceWorker.ready;
    await checkOfflineCache();
    registration.addEventListener('updatefound', () => console.info('Versi baharu aplikasi sedang dimuat turun.'));
  } catch (error) {
    console.warn('Service Worker gagal didaftarkan.', error);
    ui.offlineStatus = 'Service Worker belum aktif. PWA memerlukan HTTPS atau localhost; aplikasi desktop menggunakan fail setempat.';
  }
}

async function init() {
  try {
    state = await loadState();
    state.settings.reduceMotion = state.settings.reduceMotion || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !state.meta.updatedAt);
    ui.chat = initialChat();
    render();
    setTimeout(() => {
      const splash = $('#splash');
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), state.settings.reduceMotion ? 20 : 350);
    }, state.settings.reduceMotion ? 100 : 750);
    registerServiceWorker();
  } catch (error) {
    console.error(error);
    $('#splash').innerHTML = `<div class="notice danger"><span>⚠️</span><p><strong>Aplikasi tidak dapat dimulakan.</strong><br>${esc(error.message)}</p></div>`;
  }
}

init();
