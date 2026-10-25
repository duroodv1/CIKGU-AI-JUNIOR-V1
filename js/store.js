const DB_NAME = 'cikgu-ai-junior-ppki';
const DB_VERSION = 1;
const STORE = 'app';
const STATE_KEY = 'state-v1';
const BACKUP_KEY = 'cikgu-ppki-backup-v1';

export const DEFAULT_STATE = {
  schema: 1,
  settings: {
    sound: true,
    voice: true,
    ttsEndpoint: '',
    calm: false,
    reduceMotion: false,
    font: 'normal',
    contrast: 'normal'
  },
  progress: {
    attempts: 0,
    correct: 0,
    wrong: 0,
    hints: 0,
    examples: 0,
    games: 0,
    topics: {},
    activity: [],
    gameStats: {},
    activityStats: {},
    last: null
  },
  parent: {
    pinSet: false,
    salt: '',
    hash: ''
  },
  ai: {
    provider: 'none',
    baseUrl: '',
    dailyLimit: 10,
    usage: { date: '', count: 0 },
    consent: false,
    tests: {}
  },
  meta: {
    createdAt: '',
    updatedAt: ''
  }
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function mergeState(saved) {
  const base = cloneDefault();
  if (!saved || typeof saved !== 'object') return base;
  return {
    ...base,
    ...saved,
    settings: { ...base.settings, ...(saved.settings || {}) },
    progress: {
      ...base.progress,
      ...(saved.progress || {}),
      topics: { ...base.progress.topics, ...(saved.progress?.topics || {}) },
      gameStats: { ...base.progress.gameStats, ...(saved.progress?.gameStats || {}) },
      activityStats: { ...base.progress.activityStats, ...(saved.progress?.activityStats || {}) },
      activity: Array.isArray(saved.progress?.activity) ? saved.progress.activity.slice(0, 100) : []
    },
    parent: { ...base.parent, ...(saved.parent || {}) },
    ai: {
      ...base.ai,
      ...(saved.ai || {}),
      usage: { ...base.ai.usage, ...(saved.ai?.usage || {}) },
      tests: { ...base.ai.tests, ...(saved.ai?.tests || {}) }
    },
    meta: { ...base.meta, ...(saved.meta || {}) }
  };
}

let dbPromise;
function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB tidak disokong'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Pangkalan data disekat oleh tab lain'));
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function loadState() {
  let saved;
  try {
    saved = await idbGet(STATE_KEY);
  } catch (error) {
    console.warn('IndexedDB tidak tersedia; menggunakan storan sandaran.', error);
    try { saved = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); } catch { saved = null; }
  }
  const state = mergeState(saved);
  if (!state.meta.createdAt) state.meta.createdAt = new Date().toISOString();
  return state;
}

export async function saveState(state) {
  state.meta.updatedAt = new Date().toISOString();
  let savedToIdb = false;
  try {
    await idbSet(STATE_KEY, state);
    savedToIdb = true;
  } catch (error) {
    console.warn('Gagal menyimpan ke IndexedDB.', error);
  }
  // Salinan sandaran membantu jika IndexedDB disekat. Ia masih berada pada peranti ini sahaja.
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(state)); } catch { /* storan mungkin penuh */ }
  return savedToIdb;
}

export async function clearState() {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch { /* tetap bersihkan sandaran */ }
  try { localStorage.removeItem(BACKUP_KEY); } catch { /* abaikan */ }
  return cloneDefault();
}

export async function storageEstimate() {
  if (navigator.storage?.estimate) return navigator.storage.estimate();
  return { usage: 0, quota: 0 };
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function derivePin(pin, saltBytes) {
  if (!globalThis.crypto?.subtle) throw new Error('Penyimpanan PIN selamat memerlukan pelayar moden dan HTTPS atau localhost.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 150000 }, material, 256);
  return new Uint8Array(bits);
}

export async function createPin(pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN mesti terdiri daripada 6 digit.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePin(pin, salt);
  return { pinSet: true, salt: bytesToBase64(salt), hash: bytesToBase64(hash) };
}

export async function verifyPin(pin, parent) {
  if (!parent?.pinSet || !parent.salt || !parent.hash) return false;
  const actual = await derivePin(pin, base64ToBytes(parent.salt));
  const expected = base64ToBytes(parent.hash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i += 1) difference |= actual[i] ^ expected[i];
  return difference === 0;
}
