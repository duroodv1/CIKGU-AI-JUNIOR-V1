import { SUBJECTS } from './content.js';
import { getSubjectQuestions } from './question-bank.js';
import { makeTopicGuide, makePracticeGuide, answerLocally } from './teacher.js';
import { detectSpeechLanguage, ENGLISH_LANGUAGE, splitSpeechText } from './speech-language.js';

export const normalizeSpeechText = text => String(text || '').replace(/\s+/g, ' ').trim();
const hasEnglish = segments => segments.some(text => detectSpeechLanguage(text) === ENGLISH_LANGUAGE);

function bilingualSegments(text) {
  const clean = normalizeSpeechText(text);
  if (!clean) return [];
  const parts = splitSpeechText(clean);
  // Kekalkan segmentasi lama untuk kandungan BM supaya klip sedia ada boleh
  // digunakan semula. Ayat English/campuran dipisahkan mengikut bahasa.
  return hasEnglish(parts) ? parts : [clean];
}

export function noteSpeechSegments(topic) {
  if (!topic) return [];
  const original = [topic.title, topic.summary, ...topic.points, `Contoh: ${topic.example.text}`].join(' ');
  const bilingual = [
    ...splitSpeechText(topic.title),
    ...splitSpeechText(topic.summary),
    ...topic.points.flatMap(splitSpeechText),
    'Contoh.',
    ...splitSpeechText(topic.example.text)
  ].map(normalizeSpeechText).filter(Boolean);
  return hasEnglish(bilingual) ? bilingual : [normalizeSpeechText(original)];
}

export function questionSpeechSegments(question) {
  if (!question) return [];
  const original = [question.prompt, 'Pilihan jawapan.', ...question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)].join(' ');
  const bilingual = [
    ...splitSpeechText(question.prompt),
    'Pilihan jawapan.',
    ...question.options.flatMap((option, index) => splitSpeechText(`${String.fromCharCode(65 + index)}: ${option}`))
  ].map(normalizeSpeechText).filter(Boolean);
  return hasEnglish(bilingual) ? bilingual : [normalizeSpeechText(original)];
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
  if (!step) return [];
  return [spokenSpeechSegment(`${step.title}.`), ...bilingualSegments(spokenSpeechSegment(step.text))].filter(Boolean);
}

export function speechTextFromSegments(segments) {
  return normalizeSpeechText((segments || []).join(' '));
}

function addGuide(set, guide) {
  guide?.steps.forEach(step => guideSpeechSegments(step).forEach(text => set.add(normalizeSpeechText(text))));
}

/**
 * Senarai canonical bagi semua audio prasedia. Setiap teks diberi hash
 * SHA-256(voice + NUL + rate + NUL + teks); suara dipilih oleh speech-language.js.
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
