import { MALAY_VOICE, ENGLISH_VOICE, speechVoiceForText } from './speech-language.js';

export const YASMIN_VOICE = MALAY_VOICE;
export { ENGLISH_VOICE, speechVoiceForText };
export const YASMIN_RATE = '-8%';
export const RINGGIT_AUDIO_REVISION = 'user-rm-sen-20261025-v2';
const RINGGIT_PATTERN = /\bringgit\b/i;
const AUDIO_CACHE = 'cikgu-yasmin-dynamic-v1';
const DEFAULT_MESSAGE = 'Audio sedia untuk didengar.';

export function audioStatusText(status) {
  if (status === 'playing') return 'Sedang dimainkan';
  if (status === 'paused') return 'Dijeda';
  if (status === 'loading') return 'Menjana audio';
  return 'Sedia';
}

// Sandaran SHA-256 untuk pelayar/Electron yang tidak menyediakan crypto.subtle.
// Nama fail mesti kekal sama dengan cache dinamik dan manifest yang dijana.
export function sha256Fallback(source) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const bytes = new TextEncoder().encode(source);
  const length = (((bytes.length + 9) + 63) >> 6) << 6;
  const data = new Uint8Array(length);
  data.set(bytes); data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  const bits = bytes.length * 8;
  view.setUint32(length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(length - 4, bits >>> 0);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  const rotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  for (let offset = 0; offset < length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + K[i] + w[i]) >>> 0;
      const s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, index) => { H[index] = (H[index] + value) >>> 0; });
  }
  return H.map(value => value.toString(16).padStart(8, '0')).join('');
}

export async function cacheKey(text) {
  const revision = RINGGIT_PATTERN.test(String(text || '')) ? `${RINGGIT_AUDIO_REVISION}\0` : '';
  const source = `${speechVoiceForText(text)}\0${YASMIN_RATE}\0${revision}${text}`;
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return sha256Fallback(source);
}

let manifestReference = null;
let manifestClips = new Set();

export async function offlineAudioUrls(segments, manifest = globalThis.CIKGU_OFFLINE_AUDIO) {
  if (!manifest?.clips?.length) return null;
  if (manifestReference !== manifest) {
    manifestReference = manifest;
    manifestClips = new Set(manifest.clips);
  }
  const urls = [];
  for (const segment of segments || []) {
    const clean = String(segment || '').replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    const key = await cacheKey(clean);
    if (!manifestClips.has(key)) return null;
    urls.push(new URL(`../assets/audio/offline/${key}.mp3`, import.meta.url).href);
  }
  return urls.length ? urls : null;
}

export class SpeechAudioCache {
  constructor() {
    this.memory = new Map();
  }

  async get(text) {
    const key = await cacheKey(text);
    if (this.memory.has(key)) return this.memory.get(key);
    if (typeof caches === 'undefined') return null;
    try {
      const store = await caches.open(AUDIO_CACHE);
      const response = await store.match(`https://audio.cikgu.local/${key}.mp3`);
      if (!response) return null;
      const blob = await response.blob();
      this._remember(key, blob);
      return blob;
    } catch {
      return null;
    }
  }

  async put(text, blob) {
    const key = await cacheKey(text);
    this._remember(key, blob);
    if (typeof caches === 'undefined') return;
    try {
      const store = await caches.open(AUDIO_CACHE);
      await store.put(`https://audio.cikgu.local/${key}.mp3`, new Response(blob, {
        headers: { 'Content-Type': 'audio/mpeg', 'X-TTS-Voice': speechVoiceForText(text) }
      }));
    } catch {
      // Salinan memori masih membolehkan audio digunakan dalam sesi ini.
    }
  }

  _remember(key, blob) {
    this.memory.delete(key);
    this.memory.set(key, blob);
    while (this.memory.size > 20) this.memory.delete(this.memory.keys().next().value);
  }
}

function playbackError(error) {
  if (error?.name === 'AbortError') return 'Penjanaan audio diberhentikan.';
  if (globalThis.navigator?.onLine === false) return 'Audio untuk teks baharu memerlukan internet. Audio prasedia dalam peket luar talian dan audio yang pernah dijana masih boleh dimainkan.';
  if (error?.status === 404) return 'Pelayan suara belum tersedia pada alamat ini. Semak tetapan audio atau mulakan pelayan audio.';
  if (error?.status === 429) return 'Had permintaan audio dicapai. Tunggu sebentar dan cuba lagi.';
  return 'Audio tidak dapat dijana buat masa ini. Teks masih boleh dibaca pada skrin.';
}

export class SampleAudioPlayer {
  constructor({ src, audioFactory, onChange = () => {}, fetchImpl, cache, endpoint = '/api/tts' } = {}) {
    this.src = src;
    this.status = 'idle';
    this.message = DEFAULT_MESSAGE;
    this.onChange = onChange;
    this.audio = null;
    this.mode = 'sample';
    this.currentText = '';
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.cache = cache || new SpeechAudioCache();
    this.objectURLs = [];
    this.abortController = null;
    this.requestId = 0;
    this.playlist = [];
    this.playlistIndex = 0;
    this._stopping = false;

    const factory = audioFactory === undefined
      ? (typeof Audio === 'undefined' ? null : source => new Audio(source))
      : audioFactory;
    if (!factory) return;

    try {
      this.audio = factory(src);
      this.audio.preload = 'auto';
      this.audio.addEventListener('play', () => {
        this._setState('playing', this.mode === 'text' ? 'Teks sedang dibaca dengan suara yang sepadan dengan bahasa.' : 'Sampel suara Yasmin sedang dimainkan.');
      });
      this.audio.addEventListener('pause', () => {
        if (this._stopping || this.status === 'idle' || this.status === 'loading' || this.audio.ended) return;
        this._setState('paused', 'Audio dijeda. Tekan Dengar untuk menyambung.');
      });
      this.audio.addEventListener('ended', () => {
        if (this.mode === 'text' && this.playlistIndex < this.playlist.length - 1 && !this._stopping) {
          this.playlistIndex += 1;
          this.audio.src = this.playlist[this.playlistIndex];
          try { this.audio.load?.(); } catch { /* pemain ujian mungkin tidak mempunyai load() */ }
          const transitionRequest = this.requestId;
          this._playCurrent().then(() => {
            if (transitionRequest !== this.requestId) this.stop();
          }).catch(() => {
            if (transitionRequest === this.requestId) this._setState('idle', 'Klip audio seterusnya tidak dapat dimainkan. Semak peket audio luar talian.');
          });
          return;
        }
        try { this.audio.currentTime = 0; } catch { /* media mungkin belum sedia */ }
        this._setState('idle', 'Audio selesai. Tekan Dengar untuk mendengarnya semula.');
      });
      this.audio.addEventListener('error', () => {
        if (this._stopping) return;
        this._setState('idle', 'Audio tidak dapat dimainkan. Sila cuba lagi.');
      });
    } catch {
      this.audio = null;
    }
  }

  get supported() {
    return Boolean(this.audio);
  }

  _setState(status, message) {
    const changed = this.status !== status || this.message !== message;
    this.status = status;
    this.message = message;
    if (changed) this.onChange({ status, message });
  }

  _revokeObjectURL() {
    if (typeof URL !== 'undefined') {
      for (const url of this.objectURLs) {
        try { URL.revokeObjectURL(url); } catch { /* URL mungkin sudah dilepaskan */ }
      }
    }
    this.objectURLs = [];
  }

  async _playCurrent() {
    if (!this.audio) throw new Error('Pemain audio tidak disokong pada peranti ini.');
    try {
      if (this.audio.ended) this.audio.currentTime = 0;
      await this.audio.play();
      this._setState('playing', this.mode === 'text' ? 'Teks sedang dibaca dengan suara yang sepadan dengan bahasa.' : 'Sampel suara Yasmin sedang dimainkan.');
    } catch (error) {
      this._setState('idle', 'Audio tidak dapat dimainkan. Sila cuba lagi.');
      throw new Error('Audio tidak dapat dimainkan. Sila cuba lagi.', { cause: error });
    }
  }

  async play() {
    if (!this.audio) throw new Error('Pemain audio tidak disokong pada peranti ini.');
    if (this.status === 'playing' && this.mode === 'sample') return;
    if (this.status === 'paused' && this.mode === 'sample') return this._playCurrent();
    this.stop();
    this.mode = 'sample';
    this.currentText = '';
    this.playlist = [];
    this.playlistIndex = 0;
    this._revokeObjectURL();
    this.audio.src = this.src;
    return this._playCurrent();
  }

  async playText(text, { endpoint = this.endpoint, segments = null } = {}) {
    if (!this.audio) throw new Error('Pemain audio tidak disokong pada peranti ini.');
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) throw new Error('Tiada teks untuk dibaca.');
    if (clean.length > 1800) throw new Error('Teks terlalu panjang untuk satu bacaan. Baca satu kad pada satu masa.');
    if (this.status === 'playing' && this.mode === 'text' && this.currentText === clean) return;
    if (this.status === 'paused' && this.mode === 'text' && this.currentText === clean) return this._playCurrent();

    this.stop();
    const requestId = ++this.requestId;
    this.mode = 'text';
    this.currentText = clean;
    this._setState('loading', 'Suara yang sepadan dengan bahasa sedang disediakan untuk teks ini.');

    try {
      const requestedSegments = (segments || [clean]).map(segment => String(segment || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (!requestedSegments.length) requestedSegments.push(clean);
      const offlineUrls = await offlineAudioUrls(requestedSegments);
      if (requestId !== this.requestId) return;
      if (offlineUrls) {
        this._revokeObjectURL();
        this.playlist = offlineUrls;
        this.playlistIndex = 0;
        this.audio.src = offlineUrls[0];
        try { this.audio.load?.(); } catch { /* sebahagian pemain tidak memerlukan load() */ }
        await this._playCurrent();
        return;
      }

      this.playlist = [];
      this.playlistIndex = 0;
      const dynamicURLs = [];
      try {
        for (const segment of requestedSegments) {
          let blob = await this.cache.get(segment);
          if (!blob) {
            if (!this.fetchImpl) throw new Error('Fetch tidak disokong');
            this.abortController = new AbortController();
            const response = await this.fetchImpl(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: segment, voice: speechVoiceForText(segment) }),
              signal: this.abortController.signal
            });
            if (!response.ok) {
              const error = new Error(`HTTP ${response.status}`);
              error.status = response.status;
              throw error;
            }
            blob = await response.blob();
            if (!blob.size) throw new Error('Audio kosong diterima');
            await this.cache.put(segment, blob);
          }
          if (requestId !== this.requestId) {
            dynamicURLs.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* abaikan */ } });
            return;
          }
          dynamicURLs.push(URL.createObjectURL(blob));
        }
      } catch (error) {
        dynamicURLs.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* abaikan */ } });
        throw error;
      }
      if (requestId !== this.requestId) {
        dynamicURLs.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* abaikan */ } });
        return;
      }
      this._revokeObjectURL();
      this.objectURLs = dynamicURLs;
      this.playlist = dynamicURLs;
      this.audio.src = dynamicURLs[0];
      try { this.audio.load?.(); } catch { /* sebahagian pemain tidak memerlukan load() */ }
      await this._playCurrent();
    } catch (error) {
      if (requestId !== this.requestId) return;
      const message = playbackError(error);
      this._setState('idle', message);
      throw new Error(message, { cause: error });
    } finally {
      if (requestId === this.requestId) this.abortController = null;
    }
  }

  pause() {
    if (!this.audio || this.status !== 'playing') return;
    this.audio.pause();
    this._setState('paused', 'Audio dijeda. Tekan Dengar untuk menyambung.');
  }

  stop() {
    this.requestId += 1;
    this.abortController?.abort();
    this.abortController = null;
    if (!this.audio) return;
    this._stopping = true;
    try {
      this.audio.pause();
      try { this.audio.currentTime = 0; } catch { /* media mungkin belum sedia */ }
      if (this.status !== 'idle') this._setState('idle', 'Audio diberhentikan.');
    } finally {
      this._stopping = false;
    }
  }
}

export const samplePlayer = new SampleAudioPlayer({
  src: new URL('../assets/audio/contoh-suara.mp3', import.meta.url).href
});
