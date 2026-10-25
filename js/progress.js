export const topicKey = (subjectId, topicId) => `${subjectId}/${topicId}`;

export function getTopicStats(state, subjectId, topicId) {
  return state.progress.topics[topicKey(subjectId, topicId)] || {
    attempts: 0, correct: 0, wrong: 0, hints: 0, examples: 0, levels: {}, lastLevel: 1
  };
}

function ensureTopic(state, subjectId, topicId) {
  const key = topicKey(subjectId, topicId);
  if (!state.progress.topics[key]) {
    state.progress.topics[key] = { attempts: 0, correct: 0, wrong: 0, hints: 0, examples: 0, levels: {}, lastLevel: 1 };
  }
  return state.progress.topics[key];
}

function addActivity(state, entry) {
  state.progress.activity.unshift({ date: new Date().toISOString(), ...entry });
  state.progress.activity = state.progress.activity.slice(0, 100);
}

export function markTopicOpened(state, subjectId, topicId, level) {
  const stats = ensureTopic(state, subjectId, topicId);
  stats.lastLevel = level;
  stats.lastOpenedAt = new Date().toISOString();
  state.progress.last = { subjectId, topicId, level };
}

export function markNoteRead(state, subjectId, topicId, level) {
  const stats = ensureTopic(state, subjectId, topicId);
  stats.noteReadAt = new Date().toISOString();
  stats.lastLevel = level;
}

export function recordPractice(state, { subjectId, topicId, level, correct }) {
  const stats = ensureTopic(state, subjectId, topicId);
  const levelStats = stats.levels[level] || { attempts: 0, correct: 0, wrong: 0 };
  state.progress.attempts += 1;
  stats.attempts += 1;
  levelStats.attempts += 1;
  if (correct) {
    state.progress.correct += 1;
    stats.correct += 1;
    levelStats.correct += 1;
    if (!stats.completedAt) stats.completedAt = new Date().toISOString();
    stats.lastCorrectAt = new Date().toISOString();
  } else {
    state.progress.wrong += 1;
    stats.wrong += 1;
    levelStats.wrong += 1;
  }
  stats.levels[level] = levelStats;
  stats.lastLevel = level;
  state.progress.last = { subjectId, topicId, level };
  addActivity(state, { type: 'Latihan', subjectId, topicId, level, correct });
}

export function recordHelp(state, { subjectId, topicId, level, type }) {
  const stats = ensureTopic(state, subjectId, topicId);
  if (type === 'hint') {
    state.progress.hints += 1;
    stats.hints += 1;
  } else if (type === 'example') {
    state.progress.examples += 1;
    stats.examples += 1;
  }
  stats.lastLevel = level;
}

export function recordGame(state, game) {
  if (game.recorded) return;
  game.recorded = true;
  state.progress.games += 1;
  const stats = state.progress.gameStats[game.id] || { plays: 0, bestScore: 0, lastScore: 0 };
  stats.plays += 1;
  stats.lastScore = game.score;
  stats.bestScore = Math.max(stats.bestScore, game.score);
  stats.lastPlayedAt = new Date().toISOString();
  state.progress.gameStats[game.id] = stats;
  addActivity(state, { type: 'Permainan', gameId: game.id, correct: true, score: game.score, total: game.total });
}

export function getTopicActivityStats(state, subjectId, topicId, activityId) {
  const key = `${subjectId}/${topicId}/${activityId}`;
  return state.progress.activityStats?.[key] || { plays: 0, completed: false, bestScore: 0, lastScore: 0 };
}

export function completedTopicActivities(state, subjectId, topicId) {
  const prefix = `${subjectId}/${topicId}/`;
  return Object.entries(state.progress.activityStats || {}).filter(([key, stats]) => key.startsWith(prefix) && stats.completed).length;
}

export function recordTopicActivity(state, session) {
  if (!session || session.recorded || !session.complete) return;
  session.recorded = true;
  if (!state.progress.activityStats) state.progress.activityStats = {};
  const key = session.id;
  const stats = state.progress.activityStats[key] || { plays: 0, completed: false, bestScore: 0, lastScore: 0 };
  stats.plays += 1;
  stats.completed = true;
  stats.lastScore = session.score;
  stats.bestScore = Math.max(stats.bestScore, session.score);
  stats.lastPlayedAt = new Date().toISOString();
  state.progress.activityStats[key] = stats;
  addActivity(state, {
    type: 'Aktiviti Topik',
    subjectId: session.subjectId,
    topicId: session.topicId,
    activityId: session.activityId,
    correct: true,
    score: session.score,
    total: session.total
  });
}

export function subjectProgress(state, subject) {
  let completed = 0;
  let attempts = 0;
  let correct = 0;
  let wrong = 0;
  subject.topics.forEach(topic => {
    const stats = getTopicStats(state, subject.id, topic.id);
    if (stats.correct > 0) completed += 1;
    attempts += stats.attempts;
    correct += stats.correct;
    wrong += stats.wrong;
  });
  return {
    completed,
    total: subject.topics.length,
    percent: subject.topics.length ? Math.round(completed / subject.topics.length * 100) : 0,
    attempts, correct, wrong
  };
}

export function masteryLabel(stats) {
  if (!stats.attempts) return { text: 'Belum mula', tone: '' };
  const accuracy = stats.correct / stats.attempts;
  if (stats.correct >= 3 && accuracy >= .8) return { text: 'Semakin yakin', tone: 'green' };
  if (stats.correct >= 1 && accuracy >= .7) return { text: 'Sudah mula menguasai', tone: 'green' };
  if (stats.wrong > stats.correct) return { text: 'Cuba dengan sedikit bantuan', tone: 'yellow' };
  return { text: 'Sedang berlatih', tone: 'blue' };
}

export function reviewTopics(state, subjects, limit = 5) {
  const rows = [];
  subjects.forEach(subject => subject.topics.forEach(topic => {
    const stats = getTopicStats(state, subject.id, topic.id);
    if (stats.attempts && (stats.wrong > 0 || stats.correct / stats.attempts < .75)) {
      rows.push({ subject, topic, stats, priority: stats.wrong * 2 + stats.attempts - stats.correct });
    }
  }));
  return rows.sort((a, b) => b.priority - a.priority || b.stats.attempts - a.stats.attempts).slice(0, limit);
}

export function confidentTopics(state, subjects, limit = 5) {
  const rows = [];
  subjects.forEach(subject => subject.topics.forEach(topic => {
    const stats = getTopicStats(state, subject.id, topic.id);
    if (stats.correct > 0) rows.push({ subject, topic, stats, accuracy: stats.correct / stats.attempts });
  }));
  return rows.sort((a, b) => b.accuracy - a.accuracy || b.stats.correct - a.stats.correct).slice(0, limit);
}
