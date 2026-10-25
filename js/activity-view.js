import { esc } from './ui.js';
import { findSubject, findTopic } from './content.js';
import { TOPIC_ACTIVITIES } from './activity-engine.js';
import { getTopicActivityStats, completedTopicActivities } from './progress.js';

export function renderActivityGrid(state, subject, topic) {
  const completed = completedTopicActivities(state, subject.id, topic.id);
  return `
    <section class="activity-intro card"><div><span class="pill blue">15 aktiviti untuk topik ini</span><h2>Belajar Melalui Aktiviti</h2><p>Pilih mana-mana aktiviti. Tiada pemasa, tiada sekatan dan kamu boleh mengulanginya bila-bila masa.</p></div><div class="activity-total"><strong>${completed} / 15</strong><span>aktiviti selesai</span></div><div class="progress-track" style="grid-column:1/-1"><div class="progress-bar" style="width:${Math.min(100, completed / 15 * 100)}%"></div></div></section>
    <div class="activity-grid">${TOPIC_ACTIVITIES.map((activity, index) => {
      const stats = getTopicActivityStats(state, subject.id, topic.id, activity.id);
      return `<button class="activity-card card" data-action="open-topic-activity" data-activity="${activity.id}"><span class="activity-number">${index + 1}</span><span class="activity-icon">${activity.icon}</span><h3>${esc(activity.title)}</h3><p>${esc(activity.description)}</p><span class="pill ${stats.completed ? 'green' : ''}">${stats.completed ? '✓ Selesai' : 'Belum dicuba'}</span></button>`;
    }).join('')}</div>`;
}

function renderFeedback(session) {
  const feedback = session.feedback;
  if (!feedback || session.complete || feedback.selected !== undefined) return '';
  return `<div class="answer-feedback ${feedback.correct ? 'correct' : 'try'}"><strong>${feedback.correct ? '✓' : '🌱'} ${esc(feedback.title)}</strong><p>${esc(feedback.text)}</p>${!feedback.correct && feedback.answer ? `<p class="correct-answer-note">Jawapan yang betul: <strong>${esc(feedback.answer)}</strong></p>` : ''}</div>`;
}

function renderChoice(session) {
  const question = session.questions[session.round];
  if (!question) return '<div class="notice warning"><p>Soalan aktiviti tidak tersedia.</p></div>';
  const last = session.round === session.total - 1;
  return `<section class="question-card card"><div class="practice-label">Soalan ${session.round + 1} / ${session.total}</div><div class="question-visual">${esc(question.visual || '🧩')}</div><div class="question-text">${esc(question.prompt)}</div><div class="answer-options">${question.options.map((option, index) => `<button class="answer-option ${session.answered && index === question.answer ? 'correct' : ''}" data-action="activity-answer" data-index="${index}" ${session.answered ? 'disabled' : ''}><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`).join('')}</div>${renderFeedback(session)}${session.answered ? `<div class="practice-actions">${!session.feedback?.correct ? '<button class="btn btn-secondary" data-action="activity-retry">↻ Cuba Semula</button>' : ''}<button class="btn btn-primary" data-action="activity-next">${last ? 'Lihat Hasil →' : 'Soalan Seterusnya →'}</button></div>` : ''}</section>`;
}

function renderSequence(session) {
  return `<section class="card activity-play-card"><div class="practice-label">Susun mengikut urutan yang betul</div><h2>Tekan kad satu demi satu</h2><div class="sequence-selected">${session.selected.length ? session.selected.map((id, index) => `<div class="sequence-step"><span>${index + 1}</span>${esc(session.correct.find(card => card.id === id)?.text || '')}</div>`).join('') : '<p class="empty-note">Kad yang dipilih akan muncul di sini.</p>'}</div><div class="sequence-pool">${session.cards.map(card => `<button class="btn btn-secondary" data-action="activity-sequence-card" data-id="${card.id}" ${session.selected.includes(card.id) ? 'disabled' : ''}>${esc(card.text)}</button>`).join('')}</div>${renderFeedback(session)}<div class="modal-actions" style="justify-content:flex-start"><button class="btn btn-secondary" data-action="activity-sequence-reset" ${!session.selected.length ? 'disabled' : ''}>Susun Semula</button><button class="btn btn-primary" data-action="activity-sequence-check" ${session.selected.length !== session.correct.length ? 'disabled' : ''}>Semak Urutan</button></div></section>`;
}

function renderMatch(session) {
  return `<section class="card activity-play-card"><div class="practice-label">Padanan ${session.score} / ${session.total}</div><h2>Pilih dua kad yang berkaitan</h2><p class="muted">Tekan satu kad, kemudian tekan pasangannya. Jika belum sepadan, kamu boleh terus mencuba.</p><div class="topic-match-grid">${session.cards.map(card => {
    const matched = session.matched.includes(card.key);
    const selected = session.selectedKey === card.key;
    return `<button class="topic-match-card ${matched ? 'matched' : ''} ${selected ? 'selected' : ''}" data-action="activity-match" data-key="${esc(card.key)}" aria-pressed="${selected}" ${matched ? 'disabled' : ''}><small>${card.side === 'left' ? 'Maklumat' : 'Padanan'}</small><span>${esc(card.text)}</span>${matched ? '<b>✓</b>' : ''}</button>`;
  }).join('')}</div>${renderFeedback(session)}</section>`;
}

function renderResult(session, meta) {
  return `<section class="card empty-state activity-result"><div class="empty-icon">🎉</div><h2>Aktiviti Selesai!</h2><p>Kamu telah menamatkan <strong>${esc(meta.title)}</strong>.</p><div class="result-score">${session.score} / ${session.total}</div><p class="muted">Skor direkodkan sebagai kemajuan latihan, bukan penilaian kecerdasan. Kamu boleh mencuba semula untuk berlatih.</p><div class="modal-actions" style="justify-content:center"><button class="btn btn-secondary" data-action="replay-topic-activity">↻ Main Semula</button><button class="btn btn-primary" data-action="back-activities">Kembali ke 15 Aktiviti</button></div></section>`;
}

export function renderTopicActivity(session) {
  if (!session) return '<div class="notice warning"><p>Aktiviti tidak tersedia.</p><button class="btn btn-secondary" data-action="back-activities">Kembali</button></div>';
  const subject = findSubject(session.subjectId);
  const topic = findTopic(session.subjectId, session.topicId);
  const meta = TOPIC_ACTIVITIES.find(item => item.id === session.activityId);
  if (!subject || !topic || !meta) return '<div class="notice warning"><p>Aktiviti tidak ditemui.</p><button class="btn btn-secondary" data-action="back-subject">Kembali</button></div>';
  const activityIndex = TOPIC_ACTIVITIES.findIndex(item => item.id === meta.id) + 1;
  let body = '';
  if (session.complete) body = renderResult(session, meta);
  else if (session.kind === 'choice') body = renderChoice(session);
  else if (session.kind === 'sequence') body = renderSequence(session);
  else if (session.kind === 'match') body = renderMatch(session);
  return `<div class="lesson-header card"><button class="btn-icon" data-action="back-activities" aria-label="Kembali ke senarai aktiviti">←</button><span class="topic-header-icon">${meta.icon}</span><div><div class="eyebrow">${esc(subject.title)} · ${esc(topic.title)}</div><h1>${esc(meta.title)}</h1><p>Aktiviti ${activityIndex} daripada 15 · Tanpa pemasa</p></div></div>${body}`;
}
