import { samplePlayer } from './audio.js';

export const esc = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const attr = esc;

export function mascotSvg(className = '') {
  return `<svg class="${className}" viewBox="0 0 120 120" aria-hidden="true"><path fill="#ffd66b" d="M18 27c0-8 7-14 15-14h54c8 0 15 6 15 14v48c0 8-7 14-15 14H62L43 105l3-16H33c-8 0-15-6-15-14V27Z"/><circle cx="43" cy="48" r="16" fill="#fff"/><circle cx="77" cy="48" r="16" fill="#fff"/><circle cx="43" cy="48" r="7" fill="#203b5a"/><circle cx="77" cy="48" r="7" fill="#203b5a"/><path fill="#f29a55" d="m60 51 9 9H51l9-9Z"/><path d="M43 72c10 8 24 8 34 0" fill="none" stroke="#203b5a" stroke-width="5" stroke-linecap="round"/></svg>`;
}

export function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Jejak halaman">${items.map((item, index) => `${index ? '<span aria-hidden="true">›</span>' : ''}${item.action ? `<button data-action="${item.action}" ${item.id ? `data-id="${attr(item.id)}"` : ''}>${esc(item.label)}</button>` : `<span aria-current="page">${esc(item.label)}</span>`}`).join('')}</nav>`;
}

export function levelName(level) {
  return ['', 'Asas', 'Berkembang', 'Berdikari'][level] || 'Asas';
}

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ms-MY', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function audioAvailable(state) {
  return Boolean(state.settings.voice && samplePlayer.supported);
}

export function audioButton(target = 'current') {
  const sample = target === 'settings';
  const label = sample ? 'Pradengar Yasmin' : 'Bacaan dwibahasa';
  const help = sample
    ? 'Ayat sampel sahaja · suara ms-MY-YasminNeural.'
    : 'BM: Yasmin ms-MY · English: Sonia en-GB · audio baharu memerlukan internet.';
  return `<div class="audio-sample" data-audio-sample><div class="audio-sample-heading"><span class="audio-sample-label">${label}</span><span class="audio-status" data-audio-status>Sedia</span></div><div class="audio-controls" role="group" aria-label="Kawalan bacaan suara dwibahasa"><button class="btn btn-soft btn-small" data-action="audio-play" data-audio-control="play" data-target="${attr(target)}" aria-label="${sample ? 'Dengar sampel suara Yasmin' : 'Dengar teks ini dengan suara yang sepadan dengan bahasa'}"><span aria-hidden="true">▶</span>Dengar</button><button class="btn btn-secondary btn-small" data-action="audio-pause" data-audio-control="pause" data-target="${attr(target)}" aria-label="Jeda audio" disabled><span aria-hidden="true">⏸</span>Jeda</button><button class="btn btn-secondary btn-small" data-action="audio-stop" data-audio-control="stop" data-target="${attr(target)}" aria-label="Berhenti dan kembali ke permulaan audio" disabled><span aria-hidden="true">■</span>Berhenti</button></div><small class="audio-sample-help">${help}</small></div>`;
}

export function ringPercent(value) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}
