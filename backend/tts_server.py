#!/usr/bin/env python3
"""PWA statik + penjanaan audio ms-MY-YasminNeural melalui edge-tts.

Audio hanya dijana apabila POST /api/tts diterima. Teks tidak ditulis ke log.
"""
from __future__ import annotations

import asyncio
import importlib.util
import json
import os
import posixpath
import threading
import time
from collections import OrderedDict, deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

VOICE = "ms-MY-YasminNeural"
RATE = "-8%"
MAX_TEXT = 1800
MAX_BODY = 24_000
PWA_ROOT = Path(__file__).resolve().parent.parent
CACHE = OrderedDict()
CACHE_LOCK = threading.Lock()
RATE_LOCK = threading.Lock()
REQUESTS = {}
SYNTHESIS_SLOTS = threading.BoundedSemaphore(2)
MAX_CACHE_ITEMS = 32


def allowed_origins():
    return {item.strip().rstrip("/") for item in os.environ.get("ALLOWED_ORIGINS", "").split(",") if item.strip()}


def origin_allowed(handler):
    origin = handler.headers.get("Origin")
    if not origin:
        return True
    if origin in allowed_origins():
        return True
    host = handler.headers.get("Host", "")
    if origin in {f"http://{host}", f"https://{host}"}:
        return True
    return origin == "null" and os.environ.get("ALLOW_NULL_ORIGIN", "false").lower() == "true"


def rate_allowed(client):
    limit = max(1, int(os.environ.get("TTS_RATE_LIMIT_PER_15_MIN", "60")))
    now = time.monotonic()
    with RATE_LOCK:
        entries = REQUESTS.setdefault(client, deque())
        while entries and now - entries[0] > 900:
            entries.popleft()
        if len(entries) >= limit:
            return False
        entries.append(now)
        return True


async def synthesize(text):
    # Import semasa permintaan supaya kandungan statik masih boleh dihantar
    # dengan mesej ralat yang jelas jika dependensi audio belum dipasang.
    import edge_tts

    audio = bytearray()
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    if not audio:
        raise RuntimeError("No audio received")
    return bytes(audio)


def cache_key(text):
    import hashlib
    return hashlib.sha256(f"{VOICE}\0{RATE}\0{text}".encode("utf-8")).hexdigest()


def cached_audio(key):
    with CACHE_LOCK:
        audio = CACHE.get(key)
        if audio is not None:
            CACHE.move_to_end(key)
        return audio


def store_audio(key, audio):
    with CACHE_LOCK:
        CACHE[key] = audio
        CACHE.move_to_end(key)
        while len(CACHE) > MAX_CACHE_ITEMS:
            CACHE.popitem(last=False)


class Handler(SimpleHTTPRequestHandler):
    server_version = "CikguYasminTTS/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PWA_ROOT), **kwargs)

    def log_message(self, fmt, *args):
        # Jangan log body atau teks yang dihantar untuk dijana.
        super().log_message(fmt, *args)

    def _cors_headers(self):
        origin = self.headers.get("Origin")
        if origin and origin_allowed(self):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _static_allowed(self):
        path = urlsplit(self.path).path
        clean = posixpath.normpath(path)
        if ".." in clean.split("/"):
            return False
        if clean in {"/", "/index.html", "/styles.css", "/manifest.webmanifest", "/sw.js"}:
            return True
        return clean.startswith("/js/") or clean.startswith("/assets/")

    def do_OPTIONS(self):
        if urlsplit(self.path).path != "/api/tts" or not origin_allowed(self):
            self._json(403, {"error": "Origin tidak dibenarkan."})
            return
        self.send_response(204)
        self._cors_headers()
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/tts/health":
            self._json(200, {
                "ok": True,
                "voice": VOICE,
                "rate": RATE,
                "libraryInstalled": importlib.util.find_spec("edge_tts") is not None,
                "note": "Status konfigurasi sahaja; ia bukan jaminan perkhidmatan Microsoft sedang aktif."
            })
            return
        if path.startswith("/api/") or not self._static_allowed():
            self._json(404, {"error": "Fail tidak tersedia."})
            return
        super().do_GET()

    def do_HEAD(self):
        path = urlsplit(self.path).path
        if path == "/api/tts/health":
            self._json(200, {"ok": True, "voice": VOICE})
            return
        if path.startswith("/api/") or not self._static_allowed():
            self._json(404, {"error": "Fail tidak tersedia."})
            return
        super().do_HEAD()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/tts":
            self._json(404, {"error": "Endpoint tidak ditemui."})
            return
        if not origin_allowed(self):
            self._json(403, {"error": "Origin tidak dibenarkan."})
            return
        if not rate_allowed(self.client_address[0]):
            self._json(429, {"error": "Had permintaan audio dicapai. Cuba lagi kemudian."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self._json(413, {"error": "Saiz permintaan audio tidak sah."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            text = str(payload.get("text", "")).strip()
            voice = str(payload.get("voice", VOICE))
        except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            self._json(400, {"error": "Permintaan audio tidak sah."})
            return
        if not text or len(text) > MAX_TEXT:
            self._json(400, {"error": f"Teks mesti antara 1 dan {MAX_TEXT} aksara."})
            return
        if voice != VOICE:
            self._json(400, {"error": f"Hanya suara {VOICE} diterima."})
            return

        key = cache_key(text)
        audio = cached_audio(key)
        cache_status = "hit"
        if audio is None:
            if not SYNTHESIS_SLOTS.acquire(timeout=1):
                self._json(429, {"error": "Pelayan audio sedang sibuk. Cuba sebentar lagi."})
                return
            try:
                audio = asyncio.run(asyncio.wait_for(synthesize(text), timeout=45))
                store_audio(key, audio)
                cache_status = "miss"
            except ImportError:
                self._json(503, {"error": "Dependensi edge-tts belum dipasang pada pelayan audio."})
                return
            except (asyncio.TimeoutError, TimeoutError):
                self._json(504, {"error": "Penjanaan audio mengambil masa terlalu lama."})
                return
            except Exception:
                self._json(503, {"error": "Perkhidmatan suara dalam talian tidak tersedia buat masa ini."})
                return
            finally:
                SYNTHESIS_SLOTS.release()

        self.send_response(200)
        self._cors_headers()
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-TTS-Voice", VOICE)
        self.send_header("X-TTS-Cache", cache_status)
        self.end_headers()
        self.wfile.write(audio)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4173"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"PWA + audio {VOICE} tersedia pada http://0.0.0.0:{port}", flush=True)
    print(f"Jumlah teks maksimum: {MAX_TEXT} aksara. Teks tidak ditulis ke log.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
