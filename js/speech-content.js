import { SUBJECTS } from './content.js';
import { getSubjectQuestions } from './question-bank.js';
import { makeTopicGuide, makePracticeGuide, answerLocally } from './teacher.js';

export const normalizeSpeechText = text => String(text || '').replace(/\s+/g, ' ').trim();

export function noteSpeechSegments(topic) {
  if (!topic) return [];
  return [[topic.title, topic.summary, ...topic.points, `Contoh: ${topic.example.text}`].join(' ')];
}

export function questionSpeechSegments(question) {
  if (!question) return [];
  return [[question.prompt, 'Pilihan jawapan.', ...question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)].join(' ')];
}

const SPOKEN_EQUIVALENTS = new Map([
  ['△', 'Bentuk segi tiga.'],
  ['○', 'Bentuk bulatan.'],
  ['🍌', 'Pisang.']
]);

export function spokenSpeechSegment(text) {
  const clean = normalizeSpeechText(text);
  return SPOKEN_EQUIVALENTS.get(clean) || SPOKEN_EQUIVALENTS.get(clean.replace(/[.!?]+$/u, '')) || clean;
}

export function guideSpeechSegments(step) {
  return step ? [spokenSpeechSegment(`${step.title}.`), spokenSpeechSegment(step.text)] : [];
}

export function speechTextFromSegments(segments) {
  return normalizeSpeechText((segments || []).join(' '));
}

function addGuide(set, guide) {
  guide?.steps.forEach(step => guideSpeechSegments(step).forEach(text => set.add(normalizeSpeechText(text))));
}

/**
 * Senarai canonical bagi semua audio prasedia. Fail dinamakan menggunakan
 * SHA-256(voice + NUL + rate + NUL + teks), sama seperti cache audio dinamik.
 */
export function collectOfflineAudioSegments() {
  const segments = new Set();
  const add = text => {
    const clean = normalizeSpeechText(text);
    if (clean) segments.add(clean);
  };

  for (const subject of SUBJECTS) {
    const topicMap = new Map(subject.topics.map(topic => [topic.id, topic]));
    for (const topic of subject.topics) {
      noteSpeechSegments(topic).forEach(add);
      for (const level of [1, 2, 3]) addGuide(segments, makeTopicGuide(topic, level));

      // Liputi panduan setempat bagi butang cadangan perbualan yang prasedia.
      const suggestions = [
        topic.quiz.prompt,
        subject.id === 'wang' || subject.id === 'matematik' ? 'RM10 − RM4' : `Terangkan ${topic.title}`,
        topic.alt.prompt
      ];
      suggestions.forEach(text => addGuide(segments, answerLocally(text, topic)));
    }

    for (const question of getSubjectQuestions(subject.id)) {
      questionSpeechSegments(question).forEach(add);
      const topic = topicMap.get(question.topicId);
      for (const level of [1, 2, 3]) addGuide(segments, makePracticeGuide(topic, question, level));
    }
  }
  return [...segments].sort((a, b) => a.localeCompare(b, 'ms'));
}
