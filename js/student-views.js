import { SUBJECTS, LEVELS, GAMES, findSubject, findTopic } from './content.js';
import { esc, attr, mascotSvg, breadcrumbs, levelName, audioAvailable, audioButton, formatDate } from './ui.js';
import { getTopicStats, subjectProgress, masteryLabel, reviewTopics, confidentTopics } from './progress.js';
import { renderGameBoard } from './game-view.js';
import { getPracticeQuestions } from './question-bank.js';
import { renderActivityGrid, renderTopicActivity } from './activity-view.js';

const subjectStyle = subject => `--subject-color:${subject.color};--subject-soft:${subject.soft}`;

function noteVisual(topic) {
  if (topic.id !== 'kenal-wang') return esc(topic.example.visual);
  return `<div class="currency-demo"><div class="banknote-row"><span class="demo-banknote rm1">RM1<small>ILUSTRASI</small></span><span class="demo-banknote rm5">RM5<small>ILUSTRASI</small></span><span class="demo-banknote rm10">RM10<small>ILUSTRASI</small></span></div><div class="coin-row"><span class="demo-coin">5 sen</span><span class="demo-coin">10 sen</span><span class="demo-coin c20">20 sen</span><span class="demo-coin c50">50 sen</span></div><span class="currency-caption">Warna & nilai untuk pembelajaran · Bukan wang sebenar</span></div>`;
}

function feedbackHtml(feedback) {
  if (!feedback) return '';
  return `<div class="feedback ${feedback.correct ? 'success' : 'try'}" role="status"><span class="feedback-icon" aria-hidden="true">${feedback.correct ? '🌟' : '💛'}</span><div><h3>${esc(feedback.title)}</h3><p>${esc(feedback.text)}</p></div></div>`;
}

export function renderSubjects(state) {
  const totalDone = SUBJECTS.reduce((sum, subject) => sum + subjectProgress(state, subject).completed, 0);
  const last = state.progress.last;
  const lastSubject = last ? findSubject(last.subjectId) : null;
  const lastTopic = last ? findTopic(last.subjectId, last.topicId) : null;
  return `<section class="welcome-strip"><div><span class="pill blue">✨ Ruang belajar kamu</span><h2 style="margin-top:10px">Helo, Sahabat Cikgu!</h2><p>Pilih satu subjek. Belajar perlahan pun tidak apa—yang penting kita cuba.</p></div><div class="welcome-mascot"><div class="welcome-speech">Satu langkah<br>pada satu masa 😊</div>${mascotSvg()}</div></section>
    <div class="section-head"><div><h2>Apa yang kita mahu belajar?</h2><p>7 subjek · nota, Cikgu AI, latihan dan permainan</p></div><span class="pill green">${totalDone} topik sudah dicuba dengan betul</span></div>
    <div class="subject-grid">${SUBJECTS.map(subject => {
      const progress = subjectProgress(state, subject);
      const wide = subject.id === 'wang';
      return `<button class="subject-card ${wide ? 'wide' : ''}" style="${subjectStyle(subject)}" data-action="open-subject" data-id="${subject.id}"><span class="subject-icon" aria-hidden="true">${esc(subject.icon)}</span>${wide ? '<span class="money-illustration" aria-hidden="true">RM10</span>' : ''}<h3>${esc(subject.title)}</h3><p>${esc(subject.description)}</p><div class="subject-card-bottom"><small>${progress.completed}/${progress.total} topik · ${progress.attempts} latihan</small><span class="subject-arrow" aria-hidden="true">→</span></div><div class="subject-progress" aria-label="${progress.percent}% topik selesai"><span style="width:${progress.percent}%"></span></div></button>`;
    }).join('')}</div>
    ${lastSubject && lastTopic ? `<section class="card continue-card"><span class="continue-icon" aria-hidden="true">${esc(lastTopic.icon)}</span><div><h3>Sambung daripada sesi lepas</h3><p>${esc(lastSubject.short)} · ${esc(lastTopic.title)} · Tahap ${last.level}</p></div><button class="btn btn-soft" data-action="continue-last">Sambung Belajar →</button></section>` : `<div class="notice calm" style="margin-top:24px"><span aria-hidden="true">🌱</span><p><strong>Petua kecil:</strong> Mulakan dengan Tahap 1 jika topik ini baharu. Kamu boleh menukar tahap pada bila-bila masa.</p></div>`}`;
}

export function renderSubject(state, ui) {
  const subject = findSubject(ui.subjectId);
  if (!subject) return renderSubjects(state);
  return `${breadcrumbs([{ label: 'Utama', action: 'home' }, { label: subject.title }])}
    <section class="card subject-hero" style="${subjectStyle(subject)}"><span class="subject-hero-icon" aria-hidden="true">${esc(subject.icon)}</span><div><h1>${esc(subject.title)}</h1><p>${esc(subject.description)}</p></div></section>
    <section class="card level-panel"><div><h2>Pilih tahap pembelajaran</h2><p>Tahap boleh ditukar. Jawapan salah tidak akan mengunci tahap kamu.</p></div><div class="level-options">${LEVELS.map(level => `<button class="level-button ${ui.level === level.id ? 'active' : ''}" data-action="set-level" data-level="${level.id}" aria-pressed="${ui.level === level.id}"><span aria-hidden="true">${level.icon}</span><span><strong>Tahap ${level.id} · ${level.name}</strong><small>${esc(level.description)}</small></span></button>`).join('')}</div></section>
    <section class="card subject-bank-card"><div><span class="pill blue">Bank soalan subjek</span><h2>Latihan Campuran · 100 Soalan</h2><p>100 soalan merangkumi semua ${subject.topics.length} topik. Buat mengikut tahap kamu, tanpa pemasa dan tanpa sekatan.</p></div><button class="btn btn-primary" data-action="start-subject-practice" data-id="${subject.id}">Mula Latihan Campuran →</button></section>
    <div class="section-head"><div><h2>Topik pembelajaran</h2><p>${subject.topics.length} topik · Tahap ${ui.level} (${levelName(ui.level)}) dipilih</p></div></div>
    <div class="topic-grid" style="${subjectStyle(subject)}">${subject.topics.map(topic => {
      const stats = getTopicStats(state, subject.id, topic.id);
      return `<button class="topic-card" data-action="open-topic" data-id="${topic.id}"><span class="topic-icon" aria-hidden="true">${esc(topic.icon)}</span><span class="topic-info"><strong>${esc(topic.title)}</strong><small>${stats.attempts ? `${stats.correct} betul · ${stats.attempts} cubaan` : 'Nota + latihan + 15 aktiviti'}</small></span>${stats.correct ? '<span class="topic-status" title="Sudah ada jawapan betul" aria-label="Sudah ada jawapan betul">✓</span>' : ''}<span class="topic-arrow" aria-hidden="true">›</span></button>`;
    }).join('')}</div>`;
}

function lessonTabs(ui) {
  return `<div class="lesson-tabs" role="tablist" aria-label="Aktiviti topik">${[['notes', '🖼️ Nota'], ['teacher', '💬 Tunjuk Cara'], ['practice', '✏️ Latihan'], ['activities', '🧩 Aktiviti'], ['review', '↻ Ulang Kaji']].map(([id, label]) => `<button role="tab" aria-selected="${ui.lessonTab === id}" class="${ui.lessonTab === id ? 'active' : ''}" data-action="lesson-tab" data-tab="${id}">${label}</button>`).join('')}</div>`;
}

function renderNotes(state, ui, subject, topic) {
  return `<div class="note-grid"><article class="card note-main"><span class="pill blue">Nota bergambar · Tahap ${ui.level}</span><h2 style="margin-top:15px">${esc(topic.title)}</h2><p class="note-summary">${esc(topic.summary)}</p><div class="visual-board" role="img" aria-label="Ilustrasi: ${attr(topic.example.visual)}">${noteVisual(topic)}</div><div class="note-points">${topic.points.map((point, index) => `<div class="note-point"><span>${index + 1}</span><div>${esc(point)}</div></div>`).join('')}</div><div class="practice-actions">${audioAvailable(state) ? audioButton('note') : ''}<button class="btn btn-primary" data-action="note-done">Saya Faham, Cuba Latihan →</button></div></article>
    <aside class="lesson-side"><section class="card example-card"><h3>💡 Contoh dahulu</h3><p>${esc(topic.example.text)}</p><div class="example-visual">${esc(topic.example.visual)}</div></section><section class="card lesson-actions-card"><h3>Perlukan bantuan?</h3><p>Cikgu AI akan menunjukkan satu kad pada satu masa.</p><button class="btn btn-soft" data-action="start-topic-guide">💬 Terangkan Topik Ini</button><button class="btn btn-secondary" data-action="start-guide">👣 Tunjuk Cara Latihan</button></section></aside></div>`;
}

export function renderGuide(state, ui) {
  const guide = ui.guide;
  if (!guide) return '';
  const index = Math.max(0, Math.min(ui.guideStep, guide.steps.length - 1));
  const step = guide.steps[index];
  return `<div class="teacher-intro">${mascotSvg('teacher-avatar')}<div><h3>Cikgu tunjuk satu langkah pada satu masa</h3><p>Baca dahulu. Tekan “Langkah Seterusnya” apabila kamu sudah bersedia.</p></div></div><section class="card steps-shell"><div class="steps-progress" aria-label="Langkah ${index + 1} daripada ${guide.steps.length}">${guide.steps.map((_, dot) => `<span class="${dot < index ? 'done' : dot === index ? 'current' : ''}"></span>`).join('')}<small>${index + 1}/${guide.steps.length}</small></div><article class="step-card"><span class="step-kicker">LANGKAH ${index + 1}</span><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p>${step.visual ? `<div class="step-visual">${esc(step.visual)}</div>` : ''}${step.final ? `<div class="final-answer">✓ Jawapan: ${esc(step.text)}</div>` : ''}</article>${guide.notice ? `<div class="notice warning" style="margin-top:15px"><span>ⓘ</span><p>${esc(guide.notice)}</p></div>` : ''}<div class="step-actions"><div class="step-actions-right"><button class="btn btn-secondary" data-action="prev-step" ${index === 0 ? 'disabled' : ''}>← Undur</button><button class="btn btn-secondary" data-action="repeat-step">↻ Terangkan Sekali Lagi</button>${audioAvailable(state) ? audioButton('step') : ''}</div><div class="step-actions-right">${index < guide.steps.length - 1 ? `<button class="btn btn-primary" data-action="next-step">Langkah Seterusnya →</button>` : `<button class="btn btn-primary" data-action="try-self">Cuba Sendiri →</button>`}</div></div></section><div class="practice-actions"><button class="btn btn-soft" data-action="show-example">💡 Tunjuk Contoh</button><button class="btn btn-secondary" data-action="lesson-tab" data-tab="practice">✏️ Pergi ke Latihan</button></div>`;
}

function renderTeacher(state, ui, subject, topic) {
  if (ui.guide) return renderGuide(state, ui);
  return `<div class="teacher-intro">${mascotSvg('teacher-avatar')}<div><h3>Mari faham, bukan sekadar hafal jawapan</h3><p>Saya akan menerangkan sebab sesuatu kaedah digunakan, memberi contoh dan cara menyemak.</p></div></div><div class="note-grid"><section class="card note-main"><span class="pill blue">Panduan prasedia tersedia luar talian</span><h2 style="margin-top:15px">Apa yang kamu mahu saya tunjukkan?</h2><p class="note-summary">Pilih penerangan topik atau cara menyelesaikan soalan latihan. Setiap langkah akan dipaparkan dalam kad berasingan.</p><div class="practice-actions"><button class="btn btn-primary" data-action="start-topic-guide">👣 Terangkan Topik Ini</button><button class="btn btn-soft" data-action="start-guide">✏️ Tunjuk Cara Latihan</button></div><div class="divider"></div><h3>Atau tanya dalam perbualan</h3><p>Dalam mod tanpa AI, saya boleh membimbing pengiraan mudah dan topik prasedia. Saya akan memberitahu jika saya tidak pasti.</p><button class="btn btn-secondary" data-nav="chat">💬 Buka Perbualan Cikgu AI</button></section><aside class="lesson-side"><section class="card example-card"><h3>Contoh visual</h3><p>${esc(topic.example.text)}</p><div class="example-visual">${esc(topic.example.visual)}</div></section><div class="notice calm"><span>🌱</span><p>Kamu boleh ulang seberapa kali yang diperlukan. Tiada pemasa.</p></div></aside></div>`;
}

function renderPractice(state, ui, subject, topic) {
  const practice = ui.practice;
  const questions = getPracticeQuestions({ subjectId: subject.id, topicId: topic.id, scope: ui.practiceScope });
  const question = questions[practice.variant] || questions[0];
  if (!question) return '<div class="notice warning"><span>ⓘ</span><p>Soalan untuk topik ini belum tersedia.</p></div>';
  const selected = practice.selected;
  return `<div class="practice-layout"><section class="card question-card"><div class="question-label"><span class="pill blue">${ui.practiceScope === 'subject' ? 'Latihan Campuran' : 'Latihan Topik'} · Soalan ${practice.variant + 1} / ${questions.length} · Tahap ${ui.level}</span><span class="pill">${practice.wrongAttempts ? `${practice.wrongAttempts} kali cuba` : 'Tiada pemasa'}</span></div>${ui.level === 1 ? `<div class="notice" style="margin-bottom:18px"><span>💡</span><p><strong>Contoh dahulu:</strong><br>${esc(topic.example.text)}</p></div>` : ''}<div class="question-text">${esc(question.prompt)}</div>${question.visual ? `<div class="question-visual" role="img" aria-label="Ilustrasi soalan">${esc(question.visual)}</div>` : ''}<div class="answer-options" role="group" aria-label="Pilihan jawapan">${question.options.map((option, index) => {
    let className = selected === index ? 'selected' : '';
    if (practice.answeredCorrect && index === question.answer) className = 'correct';
    if (practice.lastWrong === index && !practice.answeredCorrect) className = 'wrong';
    return `<button class="answer-option ${className}" data-action="select-answer" data-index="${index}" aria-pressed="${selected === index}" ${practice.answeredCorrect ? 'disabled' : ''}><span class="answer-letter">${practice.answeredCorrect && index === question.answer ? '✓' : String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
  }).join('')}</div><div class="practice-actions"><button class="btn btn-primary" data-action="check-answer" ${practice.answeredCorrect ? 'disabled' : ''}>✓ Semak Jawapan</button><button class="btn btn-secondary" data-action="new-question">↻ Soalan Baharu</button>${audioAvailable(state) ? audioButton('question') : ''}</div>${feedbackHtml(practice.feedback)}${practice.answeredCorrect ? `<div class="practice-actions"><button class="btn btn-green" data-action="try-self">Cuba Soalan Seterusnya →</button></div>` : ''}</section>
    <aside class="card help-panel"><h3>Perlukan sedikit bantuan?</h3><p>Pilih satu. Kamu tidak akan dihukum kerana meminta bantuan.</p><button class="btn btn-soft" data-action="hint">💡 Beri Petunjuk</button><button class="btn btn-secondary" data-action="repeat-explanation">↻ Terangkan Sekali Lagi</button><button class="btn btn-secondary" data-action="show-example">🖼️ Tunjuk Contoh</button><button class="btn btn-secondary" data-action="start-guide">👣 Tunjuk Cara</button><button class="btn btn-secondary" data-action="new-question">📝 Cuba Sendiri / Soalan Baharu</button>${ui.level > 1 ? '<button class="btn btn-secondary" data-action="easy-level">🌱 Kembali ke Tahap Mudah</button>' : ''}<div class="level-nudge">Tahap ${ui.level}: ${esc(LEVELS[ui.level - 1].description)}<br><button class="text-button" data-action="back-subject">Tukar tahap atau topik</button></div></aside></div>`;
}

function renderReview(state, ui, subject, topic) {
  const stats = getTopicStats(state, subject.id, topic.id);
  const mastery = masteryLabel(stats);
  return `<div class="note-grid"><section class="card note-main"><span class="pill ${mastery.tone}">${esc(mastery.text)}</span><h2 style="margin-top:15px">Ulang kaji dan pembetulan</h2><p class="note-summary">Kita lihat bahagian yang boleh diperbaiki. Kesalahan membantu kita tahu langkah mana yang perlu dilatih.</p><div class="progress-summary" style="grid-template-columns:repeat(3,1fr);margin-top:20px"><div class="stat-card card"><strong>${stats.attempts}</strong><small>Cubaan</small></div><div class="stat-card card"><strong>${stats.correct}</strong><small>Betul</small></div><div class="stat-card card"><strong>${stats.hints}</strong><small>Petunjuk</small></div></div><div class="notice calm"><span>🔎</span><div><strong>Cara menyemak jawapan</strong><p>${esc(topic.quiz.check)}</p></div></div><div class="practice-actions"><button class="btn btn-primary" data-action="retry-practice">↻ Cuba Semula</button><button class="btn btn-secondary" data-action="start-guide">👣 Semak Langkah</button></div></section><aside class="lesson-side"><section class="card example-card"><h3>Contoh hampir sama</h3><p>${esc(topic.example.text)}</p><div class="example-visual">${esc(topic.example.visual)}</div></section>${stats.lastCorrectAt ? `<div class="notice calm"><span>🌟</span><p>Jawapan betul terakhir: ${formatDate(stats.lastCorrectAt)}. Kamu semakin membina kemahiran.</p></div>` : '<div class="notice"><span>🌱</span><p>Belum ada jawapan betul direkodkan. Mulakan dengan contoh, kemudian cuba satu soalan.</p></div>'}</aside></div>`;
}

export function renderLesson(state, ui) {
  const subject = findSubject(ui.subjectId);
  const topic = findTopic(ui.subjectId, ui.topicId);
  if (!subject || !topic) return renderSubjects(state);
  const mixed = ui.practiceScope === 'subject';
  const heading = mixed ? 'Latihan Campuran' : topic.title;
  const subheading = mixed ? `${subject.title} · 100 soalan · Topik: ${topic.title}` : subject.title;
  return `${breadcrumbs([{ label: 'Utama', action: 'home' }, { label: subject.short, action: 'back-subject' }, { label: topic.title }])}<div class="lesson-header" style="${subjectStyle(subject)}"><span class="lesson-header-icon" aria-hidden="true">${esc(topic.icon)}</span><div><h1>${esc(heading)}</h1><p>${esc(subheading)} · Tahap ${ui.level} (${levelName(ui.level)})</p></div></div>${lessonTabs(ui)}${ui.lessonTab === 'notes' ? renderNotes(state, ui, subject, topic) : ui.lessonTab === 'teacher' ? renderTeacher(state, ui, subject, topic) : ui.lessonTab === 'practice' ? renderPractice(state, ui, subject, topic) : ui.lessonTab === 'activities' ? renderActivityGrid(state, subject, topic) : renderReview(state, ui, subject, topic)}`;
}

function aiLabel(state) {
  if (state.ai.provider === 'none') return '<span class="pill green ai-mode-label">Panduan prasedia</span>';
  const test = state.ai.tests[state.ai.provider];
  const active = state.ai.consent && test?.baseUrl === state.ai.baseUrl;
  return `<span class="pill ${active ? 'green' : 'yellow'} ai-mode-label">${active ? `${state.ai.provider === 'gemini' ? 'Gemini' : 'GPT'} diuji` : 'Sandaran prasedia'}</span>`;
}

function chatGuide(state, ui) {
  const guide = ui.chat.guide;
  if (!guide) return '';
  const index = Math.min(ui.chat.step, guide.steps.length - 1);
  const step = guide.steps[index];
  return `<section class="steps-shell" style="padding:0 18px 18px"><div class="steps-progress">${guide.steps.map((_, dot) => `<span class="${dot <= index ? 'current' : ''}"></span>`).join('')}<small>${index + 1}/${guide.steps.length}</small></div><article class="step-card"><span class="step-kicker">LANGKAH ${index + 1}</span><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p>${step.visual ? `<div class="step-visual">${esc(step.visual)}</div>` : ''}</article><div class="step-actions"><div class="step-actions-right"><button class="btn btn-secondary btn-small" data-action="chat-prev" ${index === 0 ? 'disabled' : ''}>← Undur</button>${audioAvailable(state) ? audioButton('chat-step') : ''}</div><div class="step-actions-right">${index < guide.steps.length - 1 ? '<button class="btn btn-primary" data-action="chat-next">Langkah Seterusnya →</button>' : '<button class="btn btn-green" data-action="chat-done">Selesai ✓</button>'}</div></div>${guide.notice ? `<div class="notice warning" style="margin-top:12px"><span>ⓘ</span><p>${esc(guide.notice)}</p></div>` : ''}</section>`;
}

export function renderChat(state, ui) {
  const chat = ui.chat;
  const subject = findSubject(chat.subjectId) || SUBJECTS[0];
  const topic = findTopic(subject.id, chat.topicId) || subject.topics[0];
  const suggestions = [topic.quiz.prompt, subject.id === 'wang' || subject.id === 'matematik' ? 'RM10 − RM4' : `Terangkan ${topic.title}`, topic.alt.prompt];
  return `<div class="page-head"><div><div class="eyebrow">Belajar melalui perbualan</div><h1>Tanya Cikgu AI</h1><p>Jawapan diterangkan langkah demi langkah. Jangan masukkan nama penuh, alamat atau maklumat peribadi.</p></div></div><div class="chat-layout"><section class="card chat-card"><div class="chat-statusbar">${mascotSvg('teacher-avatar')}<div><h2>Cikgu AI Junior</h2><p>Sabar, jelas dan tidak tergesa-gesa</p></div>${aiLabel(state)}</div><div id="chat-messages" class="chat-messages">${chat.messages.map(message => `<div class="message ${message.role === 'student' ? 'student' : ''}">${message.role === 'teacher' ? mascotSvg('message-avatar') : ''}<div class="message-bubble">${esc(message.text).replace(/\n/g, '<br>')}</div></div>`).join('')}${chat.busy ? '<div class="message">' + mascotSvg('message-avatar') + '<div class="message-bubble">Cikgu sedang menyemak soalan dan menyusun langkah…</div></div>' : ''}</div>${chatGuide(state, ui)}${chat.notice ? `<div class="notice warning" style="margin:0 18px 15px"><span>ⓘ</span><p>${esc(chat.notice)}</p></div>` : ''}<div class="chat-suggestions">${suggestions.map(text => `<button data-action="chat-suggestion" data-text="${attr(text)}">${esc(text.length > 42 ? text.slice(0, 42) + '…' : text)}</button>`).join('')}</div><form id="chat-form" class="chat-form"><label class="sr-only" for="chat-question">Soalan untuk Cikgu AI</label><textarea id="chat-question" name="question" class="textarea" maxlength="700" required placeholder="Contoh: RM10 − RM4 atau soalan tentang topik ini…"></textarea><button class="btn btn-primary" type="submit" ${chat.busy ? 'disabled' : ''}>Hantar ➤</button></form></section>
    <aside class="chat-side"><section class="card"><h3>Topik perbualan</h3><p>Pilih topik supaya panduan prasedia lebih tepat.</p><div class="field"><label for="chat-subject">Subjek</label><select id="chat-subject" class="select" data-change="chat-subject">${SUBJECTS.map(item => `<option value="${item.id}" ${item.id === subject.id ? 'selected' : ''}>${esc(item.short)}</option>`).join('')}</select></div><div class="field"><label for="chat-topic">Topik</label><select id="chat-topic" class="select" data-change="chat-topic">${subject.topics.map(item => `<option value="${item.id}" ${item.id === topic.id ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></div><button class="btn btn-soft" data-action="open-chat-topic">Buka Nota Topik</button></section><section class="card"><h3>${state.ai.provider === 'none' ? '📚 Mod tanpa AI' : '🌐 AI & sandaran'}</h3><p>${state.ai.provider === 'none' ? 'Pengiraan mudah dan kandungan topik diproses pada peranti. Tiada soalan dihantar ke pelayan.' : 'Jika AI belum diuji, tiada internet atau kuota habis, aplikasi menggunakan panduan prasedia secara automatik.'}</p><button class="btn btn-secondary btn-small" data-action="clear-chat">Kosongkan Perbualan</button></section></aside></div>`;
}

export function renderGames(state) {
  return `<div class="page-head"><div><div class="eyebrow">Belajar sambil bermain</div><h1>Permainan Pendidikan</h1><p>Pilih satu aktiviti. Semua permainan mempunyai arahan, maklum balas dan cara semak—tanpa pemasa wajib.</p></div><span class="pill green">${state.progress.games} aktiviti selesai</span></div><div class="game-grid">${GAMES.map(game => {
    const stats = state.progress.gameStats[game.id];
    return `<button class="card game-card" style="--game-color:${game.color}" data-action="open-game" data-id="${game.id}"><span class="game-icon" aria-hidden="true">${game.icon}</span><span class="pill">${esc(game.subject)}</span><h3>${esc(game.title)}</h3><p>${esc(game.description)}</p><span class="game-play">${stats ? `Dimainkan ${stats.plays} kali · ` : ''}Mula Main →</span></button>`;
  }).join('')}</div><div class="notice calm" style="margin-top:24px"><span>🧘</span><p><strong>Mod tenang:</strong> Tiada bunyi mengejut atau animasi pantas. Kamu boleh berhenti dan kembali semula pada bila-bila masa.</p></div>`;
}

export function renderProgress(state) {
  const p = state.progress;
  const completed = SUBJECTS.reduce((sum, subject) => sum + subjectProgress(state, subject).completed, 0);
  const total = SUBJECTS.reduce((sum, subject) => sum + subject.topics.length, 0);
  const reviews = reviewTopics(state, SUBJECTS, 4);
  const confident = confidentTopics(state, SUBJECTS, 4);
  return `<div class="page-head"><div><div class="eyebrow">Lihat perkembangan</div><h1>Kemajuan Saya</h1><p>Setiap cubaan ialah sebahagian daripada pembelajaran. Tiada label pintar atau lemah di sini.</p></div><button class="btn btn-soft" data-nav="subjects">Terus Belajar →</button></div><div class="positive-banner card"><span aria-hidden="true">🌱</span><div><h3>${p.attempts ? 'Kamu sudah meluangkan masa untuk belajar!' : 'Mari mulakan langkah pertama!'}</h3><p>${p.attempts ? 'Teruskan dengan langkah kecil dan ulang apabila perlu.' : 'Pilih satu topik yang menarik. Cikgu akan membantu.'}</p></div></div><div class="progress-summary"><div class="card stat-card"><div class="stat-icon">📚</div><strong>${completed}/${total}</strong><small>Topik dengan jawapan betul</small></div><div class="card stat-card"><div class="stat-icon">✏️</div><strong>${p.attempts}</strong><small>Latihan dicuba</small></div><div class="card stat-card"><div class="stat-icon">🌟</div><strong>${p.correct}</strong><small>Jawapan betul</small></div><div class="card stat-card"><div class="stat-icon">🧩</div><strong>${p.games}</strong><small>Permainan selesai</small></div></div><div class="progress-columns"><section class="card progress-card"><h2>Kemajuan setiap subjek</h2>${SUBJECTS.map(subject => {
    const progress = subjectProgress(state, subject);
    return `<div class="subject-progress-row"><div class="progress-label"><span>${esc(subject.icon)}</span><strong>${esc(subject.short)}</strong><small>${progress.completed}/${progress.total} topik</small></div><div class="bar"><span style="width:${progress.percent}%;--bar-color:${subject.color}"></span></div></div>`;
  }).join('')}</section><section class="card progress-card"><h2>Cadangan ulang kaji</h2>${reviews.length ? `<div class="mastery-list">${reviews.map(({ subject, topic, stats }) => `<button class="mastery-item" data-action="review-topic" data-subject="${subject.id}" data-topic="${topic.id}" style="text-align:left;border:0;width:100%"><strong>${esc(topic.icon)} ${esc(topic.title)}</strong><small>${esc(subject.short)} · ${stats.wrong} salah / ${stats.attempts} cubaan</small><span class="pill yellow">Mari cuba sekali lagi</span></button>`).join('')}</div>` : '<div class="empty-state" style="padding:20px"><div class="big-icon">🌼</div><p>Belum ada cadangan. Selesaikan beberapa latihan dahulu.</p></div>'}<div class="divider"></div><h2>Semakin yakin</h2>${confident.length ? `<div class="mastery-list">${confident.slice(0, 3).map(({ subject, topic, stats }) => `<div class="mastery-item"><strong>${esc(topic.title)}</strong><small>${esc(subject.short)}</small><span class="pill green">${esc(masteryLabel(stats).text)}</span></div>`).join('')}</div>` : '<p style="color:var(--muted);font-size:.85rem">Topik yang sudah dicuba dengan betul akan dipaparkan di sini.</p>'}</section></div>`;
}

export function renderStudent(state, ui) {
  if (ui.view === 'subject') return renderSubject(state, ui);
  if (ui.view === 'lesson') return renderLesson(state, ui);
  if (ui.view === 'topic-activity' && ui.activity) return renderTopicActivity(ui.activity);
  if (ui.view === 'chat') return renderChat(state, ui);
  if (ui.view === 'games') return renderGames(state);
  if (ui.view === 'game' && ui.game) return renderGameBoard(ui.game);
  if (ui.view === 'progress') return renderProgress(state);
  return renderSubjects(state);
}
