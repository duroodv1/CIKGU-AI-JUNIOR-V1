import { SUBJECTS, findSubject, findTopic } from './content.js';

const subjectCache = new Map();
const LEVEL_BY_VARIANT = [2, 3, 1, 1, 1, 1, 2, 2, 3, 3];

function generatedContent(topic, variant) {
  switch (variant) {
    case 2: return {
      prompt: `Apakah penerangan yang betul tentang topik “${topic.title}”?`,
      correct: topic.summary,
      values: other => other.summary,
      hint: `Baca semula ringkasan nota “${topic.title}”.`,
      visual: topic.example.visual
    };
    case 3: return {
      prompt: `Dalam topik “${topic.title}”, apakah langkah atau peringatan yang sesuai?`,
      correct: topic.points[0],
      values: other => other.points[0],
      hint: 'Cari langkah pertama dalam kad nota topik ini.',
      visual: topic.icon
    };
    case 4: return {
      prompt: `Apakah langkah seterusnya yang boleh membantu dalam topik “${topic.title}”?`,
      correct: topic.points[1],
      values: other => other.points[1],
      hint: 'Baca poin kedua dalam nota topik ini.',
      visual: topic.icon
    };
    case 5: return {
      prompt: `Apakah cara semak atau peringatan penting dalam topik “${topic.title}”?`,
      correct: topic.points[2],
      values: other => other.points[2],
      hint: 'Baca poin ketiga dalam nota topik ini.',
      visual: topic.icon
    };
    case 6: return {
      prompt: `Manakah contoh yang berkaitan dengan topik “${topic.title}”?`,
      correct: topic.example.text,
      values: other => other.example.text,
      hint: `Rujuk kad “Contoh dahulu” untuk topik “${topic.title}”.`,
      visual: topic.example.visual
    };
    case 7: return {
      prompt: `Apabila menjawab soalan tentang “${topic.title}”, apakah petunjuk yang membantu?`,
      correct: topic.quiz.hint,
      values: other => other.quiz.hint,
      hint: 'Petunjuk yang betul membantu kamu memahami soalan tanpa mengambil jawapan daripada topik lain.',
      visual: topic.quiz.visual || topic.icon
    };
    case 8: return {
      prompt: `Bagaimanakah cara menyemak jawapan dalam topik “${topic.title}”?`,
      correct: topic.quiz.check,
      values: other => other.quiz.check,
      hint: 'Cari cara semak yang menggunakan semula maklumat dalam soalan.',
      visual: topic.quiz.visual || topic.icon
    };
    case 9: return {
      prompt: `Apakah petunjuk lain yang sesuai untuk latihan “${topic.title}”?`,
      correct: topic.alt.hint,
      values: other => other.alt.hint,
      hint: 'Bandingkan petunjuk dengan contoh dan langkah dalam topik ini.',
      visual: topic.alt.visual || topic.icon
    };
    default: return null;
  }
}

function uniqueDistractors(subject, topic, content, variant) {
  const pool = subject.topics
    .filter(other => other.id !== topic.id)
    .map(content.values)
    .filter(value => typeof value === 'string' && value.trim() && value !== content.correct);
  const unique = [...new Set(pool)];
  const topicIndex = subject.topics.findIndex(item => item.id === topic.id);
  const chosen = [];
  for (let offset = 0; offset < unique.length && chosen.length < 2; offset += 1) {
    const index = (topicIndex * 3 + variant * 2 + offset) % unique.length;
    const value = unique[index];
    if (!chosen.includes(value)) chosen.push(value);
  }
  if (chosen.length < 2) {
    for (const fallback of ['Rujuk nota topik lain.', 'Tidak dinyatakan dalam nota.']) {
      if (fallback !== content.correct && !chosen.includes(fallback)) chosen.push(fallback);
      if (chosen.length === 2) break;
    }
  }
  return chosen;
}

function makeGeneratedQuestion(subject, topic, variant) {
  const content = generatedContent(topic, variant);
  const distractors = uniqueDistractors(subject, topic, content, variant);
  const topicIndex = subject.topics.findIndex(item => item.id === topic.id);
  const answer = (topicIndex + variant) % 3;
  const options = [...distractors];
  options.splice(answer, 0, content.correct);
  return {
    id: `${subject.id}/${topic.id}/${variant}`,
    subjectId: subject.id,
    topicId: topic.id,
    variant,
    suggestedLevel: LEVEL_BY_VARIANT[variant],
    prompt: content.prompt,
    options,
    answer,
    hint: content.hint,
    steps: [
      `Baca tajuk dan fahami tujuan topik “${topic.title}”.`,
      'Bandingkan setiap pilihan dengan nota, contoh atau langkah topik.',
      content.correct
    ],
    check: `Semak dengan merujuk semula nota topik “${topic.title}”.`,
    visual: content.visual || ''
  };
}

function withMetadata(subject, topic, source, variant) {
  return {
    ...source,
    id: `${subject.id}/${topic.id}/${variant}`,
    subjectId: subject.id,
    topicId: topic.id,
    variant,
    suggestedLevel: LEVEL_BY_VARIANT[variant],
    options: [...source.options]
  };
}

function topicCandidates(subject, topic) {
  return Array.from({ length: 10 }, (_, variant) => {
    if (variant === 0) return withMetadata(subject, topic, topic.quiz, variant);
    if (variant === 1) return withMetadata(subject, topic, topic.alt, variant);
    return makeGeneratedQuestion(subject, topic, variant);
  });
}

export function getTopicQuestionCandidates(subjectId, topicId) {
  const subject = findSubject(subjectId);
  const topic = findTopic(subjectId, topicId);
  return subject && topic ? topicCandidates(subject, topic) : [];
}

export function getSubjectQuestions(subjectId) {
  if (subjectCache.has(subjectId)) return subjectCache.get(subjectId);
  const subject = findSubject(subjectId);
  if (!subject) return [];
  const candidates = new Map(subject.topics.map(topic => [topic.id, topicCandidates(subject, topic)]));
  const questions = [];
  // Susun secara bergilir supaya semua topik terwakili sebelum had 100 dikenakan.
  for (let variant = 0; variant < 10; variant += 1) {
    for (const topic of subject.topics) questions.push(candidates.get(topic.id)[variant]);
  }
  const selected = questions.slice(0, 100);
  subjectCache.set(subjectId, selected);
  return selected;
}

export function getTopicQuestions(subjectId, topicId) {
  return getSubjectQuestions(subjectId).filter(question => question.topicId === topicId);
}

export function getPracticeQuestions({ subjectId, topicId, scope = 'topic' }) {
  const base = scope === 'subject'
    ? getSubjectQuestions(subjectId)
    : getTopicQuestions(subjectId, topicId);
  // Susunan asal mengekalkan dua latihan yang telah disediakan sebelum soalan tambahan.
  return [...base];
}

export function getQuestionBankSummary() {
  return SUBJECTS.map(subject => ({
    subjectId: subject.id,
    total: getSubjectQuestions(subject.id).length,
    topics: subject.topics.map(topic => ({
      topicId: topic.id,
      total: getTopicQuestions(subject.id, topic.id).length
    }))
  }));
}
