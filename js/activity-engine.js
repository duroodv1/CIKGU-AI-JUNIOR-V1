import { findSubject, findTopic } from './content.js';
import { getTopicQuestionCandidates } from './question-bank.js';

export const TOPIC_ACTIVITIES = [
  { id: 'faham', icon: '💡', title: 'Faham Topik', kind: 'choice', description: 'Pilih penerangan yang sepadan dengan nota.' },
  { id: 'contoh', icon: '🖼️', title: 'Pilih Contoh', kind: 'choice', description: 'Kenali contoh bagi topik ini.' },
  { id: 'poin', icon: '🪜', title: 'Langkah & Poin', kind: 'choice', description: 'Semak tiga poin penting, satu pada satu masa.' },
  { id: 'petunjuk', icon: '🔎', title: 'Petunjuk Membantu', kind: 'choice', description: 'Pilih petunjuk yang membantu menyelesaikan soalan.' },
  { id: 'semak', icon: '✅', title: 'Cara Menyemak', kind: 'choice', description: 'Pilih cara semak yang sesuai.' },
  { id: 'latihan', icon: '✏️', title: 'Latihan Asas', kind: 'choice', description: 'Cuba soalan asas dengan maklum balas.' },
  { id: 'cabaran', icon: '🌱', title: 'Cabaran Latihan', kind: 'choice', description: 'Cuba soalan kedua tanpa pemasa.' },
  { id: 'betul-salah', icon: '⚖️', title: 'Betul atau Salah', kind: 'choice', description: 'Bezakan pernyataan topik ini daripada topik lain.' },
  { id: 'petunjuk-tambahan', icon: '💭', title: 'Petunjuk Tambahan', kind: 'choice', description: 'Fahami petunjuk bagi latihan kedua.' },
  { id: 'susun-poin', icon: '🧩', title: 'Susun Poin', kind: 'sequence', description: 'Susun semula tiga poin nota.' },
  { id: 'susun-langkah', icon: '👣', title: 'Susun Langkah', kind: 'sequence', description: 'Susun langkah penyelesaian dengan tepat.' },
  { id: 'padan-konsep', icon: '🔗', title: 'Padankan Konsep', kind: 'match', description: 'Padankan tajuk, ringkasan dan contoh.' },
  { id: 'padan-jawapan', icon: '🎯', title: 'Padankan Jawapan', kind: 'match', description: 'Padankan tiga soalan dengan jawapannya.' },
  { id: 'berkaitan', icon: '🗂️', title: 'Berkaitan atau Tidak', kind: 'choice', description: 'Kelasifikasikan pernyataan mengikut topik.' },
  { id: 'kata-penting', icon: '🔤', title: 'Cari Perkataan Penting', kind: 'choice', description: 'Lengkapkan nama topik dengan perkataan yang betul.' }
];

const VARIANTS = {
  faham: [2], contoh: [6], poin: [3, 4, 5], petunjuk: [7], semak: [8],
  latihan: [0], cabaran: [1], 'petunjuk-tambahan': [9]
};

function customQuestion(topic, id, prompt, options, answer, hint) {
  return {
    id: `${topic.id}/aktiviti/${id}`,
    prompt,
    options,
    answer,
    hint,
    steps: [
      `Baca tajuk topik “${topic.title}”.`,
      'Bandingkan pernyataan dengan nota dan contoh topik.',
      `Gunakan petunjuk: ${hint}`
    ],
    check: `Semak dengan merujuk nota “${topic.title}”.`,
    visual: topic.icon
  };
}

function trueFalseQuestions(subject, topic) {
  const topicIndex = subject.topics.findIndex(item => item.id === topic.id);
  const other = subject.topics[(topicIndex + 1) % subject.topics.length];
  const statements = [
    { text: `Topik “${topic.title}” menerangkan bahawa ${topic.summary}`, answer: 0 },
    { text: `Topik “${topic.title}” memberi contoh: ${other.example.text}`, answer: 1 },
    { text: `Dalam topik “${topic.title}”, kita belajar: ${topic.points[0]}`, answer: 0 }
  ];
  if (topicIndex % 2) statements.reverse();
  return statements.map((item, index) => customQuestion(
    topic,
    `betul-salah-${index}`,
    `Betul atau salah? ${item.text}`,
    ['Betul', 'Salah'],
    item.answer,
    'Rujuk kandungan topik ini sahaja. Jangan campurkan contoh daripada topik lain.'
  ));
}

function relatedQuestions(subject, topic) {
  const topicIndex = subject.topics.findIndex(item => item.id === topic.id);
  const otherA = subject.topics[(topicIndex + 1) % subject.topics.length];
  const otherB = subject.topics[(topicIndex + 2) % subject.topics.length];
  const statements = [
    { text: topic.summary, related: true },
    { text: otherA.summary, related: false },
    { text: topic.example.text, related: true },
    { text: otherB.example.text, related: false }
  ];
  if (topicIndex % 2) statements.push(statements.shift());
  return statements.map((item, index) => customQuestion(
    topic,
    `berkaitan-${index}`,
    `Adakah pernyataan ini berkaitan dengan “${topic.title}”? ${item.text}`,
    ['Berkaitan', 'Tidak berkaitan'],
    item.related ? 0 : 1,
    'Cari pernyataan yang benar-benar terdapat dalam nota atau contoh topik ini.'
  ));
}

function keywordQuestion(subject, topic) {
  const stopWords = new Set(['dan', 'atau', 'untuk', 'dengan', 'dalam', 'pada', 'yang', 'the', 'and', 'of', 'to', 'a', 'an']);
  const words = topic.title.split(/\s+/).map(word => word.replace(/[^\p{L}\p{N}-]/gu, '')).filter(Boolean);
  const meaningful = words.filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()));
  const correct = meaningful.at(-1) || words.at(-1) || topic.title;
  const pool = subject.topics.filter(item => item.id !== topic.id).map(item => {
    const parts = item.title.split(/\s+/).map(word => word.replace(/[^\p{L}\p{N}-]/gu, '')).filter(Boolean);
    return parts.at(-1) || item.title;
  }).filter(word => word && word.toLowerCase() !== correct.toLowerCase());
  const distractors = [...new Set(pool)].slice(0, 2);
  const topicIndex = subject.topics.findIndex(item => item.id === topic.id);
  const answer = topicIndex % 3;
  const options = [...distractors];
  options.splice(answer, 0, correct);
  const masked = topic.title.replace(correct, '____');
  return customQuestion(topic, 'kata-penting', `Lengkapkan nama topik: “${masked}”.`, options, answer, 'Perkataan ini terdapat dalam tajuk topik yang sedang dipelajari.');
}

function sequenceCards(items, seed) {
  if (items.length < 2) return [...items];
  const shift = (seed % (items.length - 1)) + 1;
  let cards = [...items.slice(shift), ...items.slice(0, shift)];
  if (cards.every((card, index) => card.id === items[index].id)) cards = cards.reverse();
  return cards;
}

function makeMatchCards(pairs, seed) {
  const shift = pairs.length ? seed % pairs.length : 0;
  const ordered = [...pairs.slice(shift), ...pairs.slice(0, shift)];
  return ordered.flatMap((pair, index) => {
    const left = { key: `${pair.id}-left`, pair: pair.id, side: 'left', text: pair.left };
    const right = { key: `${pair.id}-right`, pair: pair.id, side: 'right', text: pair.right };
    return index % 2 ? [right, left] : [left, right];
  });
}

function baseSession(subject, topic, meta) {
  return {
    id: `${subject.id}/${topic.id}/${meta.id}`,
    subjectId: subject.id,
    topicId: topic.id,
    activityId: meta.id,
    kind: meta.kind,
    round: 0,
    total: 1,
    score: 0,
    answered: false,
    complete: false,
    recorded: false,
    feedback: null
  };
}

export function createTopicActivity(subjectId, topicId, activityId) {
  const subject = findSubject(subjectId);
  const topic = findTopic(subjectId, topicId);
  const meta = TOPIC_ACTIVITIES.find(item => item.id === activityId);
  if (!subject || !topic || !meta) return null;
  const session = baseSession(subject, topic, meta);
  const candidates = getTopicQuestionCandidates(subjectId, topicId);

  if (VARIANTS[activityId]) {
    session.questions = VARIANTS[activityId].map(variant => candidates[variant]);
    session.total = session.questions.length;
    return session;
  }
  if (activityId === 'betul-salah') {
    session.questions = trueFalseQuestions(subject, topic);
    session.total = session.questions.length;
    return session;
  }
  if (activityId === 'berkaitan') {
    session.questions = relatedQuestions(subject, topic);
    session.total = session.questions.length;
    return session;
  }
  if (activityId === 'kata-penting') {
    session.questions = [keywordQuestion(subject, topic)];
    return session;
  }
  if (activityId === 'susun-poin' || activityId === 'susun-langkah') {
    const source = activityId === 'susun-poin' ? topic.points : topic.quiz.steps;
    session.correct = source.map((text, id) => ({ id, text }));
    session.cards = sequenceCards(session.correct, subject.topics.findIndex(item => item.id === topic.id) + (activityId === 'susun-langkah' ? 1 : 0));
    session.selected = [];
    return session;
  }
  if (activityId === 'padan-konsep') {
    const pairs = [
      { id: 0, left: 'Tajuk topik', right: topic.title },
      { id: 1, left: 'Ringkasan', right: topic.summary },
      { id: 2, left: 'Contoh', right: topic.example.text }
    ];
    session.cards = makeMatchCards(pairs, subject.topics.findIndex(item => item.id === topic.id));
    session.total = pairs.length;
    session.selectedKey = null;
    session.matched = [];
    return session;
  }
  if (activityId === 'padan-jawapan') {
    const pairs = [0, 1, 2].map(variant => {
      const question = candidates[variant];
      return { id: variant, left: question.prompt, right: question.options[question.answer] };
    });
    session.cards = makeMatchCards(pairs, subject.topics.findIndex(item => item.id === topic.id) + 1);
    session.total = pairs.length;
    session.selectedKey = null;
    session.matched = [];
    return session;
  }
  return null;
}

export function answerTopicActivity(session, answerIndex) {
  if (!session || session.kind !== 'choice' || session.answered || session.complete) return null;
  const question = session.questions[session.round];
  if (!question || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) return null;
  const correct = answerIndex === question.answer;
  session.answered = true;
  if (correct) session.score += 1;
  session.feedback = {
    correct,
    title: correct ? 'Bagus, jawapan kamu betul!' : 'Bagus kerana sudah cuba!',
    text: correct ? question.check : question.hint,
    answer: question.options[question.answer]
  };
  return session.feedback;
}

export function retryTopicActivity(session) {
  if (!session || session.kind !== 'choice' || !session.answered || session.complete || session.feedback?.correct) return false;
  session.answered = false;
  session.feedback = null;
  return true;
}

export function nextTopicActivity(session) {
  if (!session || session.kind !== 'choice' || !session.answered || session.complete) return false;
  if (session.round >= session.total - 1) {
    session.complete = true;
    return true;
  }
  session.round += 1;
  session.answered = false;
  session.feedback = null;
  return true;
}

export function pickActivitySequence(session, id) {
  if (!session || session.kind !== 'sequence' || session.complete || session.selected.includes(id)) return false;
  if (!session.correct.some(card => card.id === id)) return false;
  session.selected.push(id);
  session.feedback = null;
  return true;
}

export function resetActivitySequence(session) {
  if (!session || session.kind !== 'sequence' || session.complete) return false;
  session.selected = [];
  session.feedback = null;
  return true;
}

export function checkActivitySequence(session) {
  if (!session || session.kind !== 'sequence' || session.complete || session.selected.length !== session.correct.length) return null;
  const correct = session.selected.every((id, index) => id === session.correct[index].id);
  if (!correct) {
    session.selected = [];
    session.feedback = { correct: false, title: 'Mari cuba dengan petunjuk', text: `Mula dengan “${session.correct[0].text}”. Kemudian susun langkah seterusnya.` };
    return session.feedback;
  }
  session.score = 1;
  session.answered = true;
  session.complete = true;
  session.feedback = { correct: true, title: 'Urutan betul!', text: 'Kamu menyusun langkah satu demi satu dengan tepat.' };
  return session.feedback;
}

export function selectActivityMatch(session, key) {
  if (!session || session.kind !== 'match' || session.complete || session.matched.includes(key)) return null;
  const card = session.cards.find(item => item.key === key);
  if (!card) return null;
  if (session.selectedKey === null) {
    session.selectedKey = key;
    session.feedback = null;
    return { selected: true };
  }
  if (session.selectedKey === key) {
    session.selectedKey = null;
    return { selected: false };
  }
  const first = session.cards.find(item => item.key === session.selectedKey);
  const match = first && first.pair === card.pair && first.side !== card.side;
  session.selectedKey = null;
  if (!match) {
    session.feedback = { correct: false, title: 'Belum sepadan, cuba lagi', text: 'Baca kedua-dua kad dengan perlahan. Cari maklumat yang saling berkaitan.' };
    return session.feedback;
  }
  session.matched.push(first.key, card.key);
  session.score += 1;
  session.feedback = { correct: true, title: 'Padanan betul!', text: 'Kamu menemui dua kad yang saling berkaitan.' };
  if (session.matched.length === session.cards.length) {
    session.answered = true;
    session.complete = true;
    session.feedback = { correct: true, title: 'Semua padanan dijumpai!', text: 'Bagus! Kamu memadankan semua maklumat dengan tepat.' };
  }
  return session.feedback;
}
