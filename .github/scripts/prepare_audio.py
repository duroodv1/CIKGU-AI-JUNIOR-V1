#!/usr/bin/env python3
"""Sahkan satu atau beberapa ZIP audio Release dan ekstrak ke struktur PWA."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import zipfile

PART_COUNT = 4
PART_PATTERN = "cikgu-yasmin-offline-part-{index:02d}.zip"


def manifest(root: Path) -> dict:
    source = (root / "js/offline-audio-manifest.js").read_text(encoding="utf-8")
    match = re.search(r"Object\.freeze\((\{.*?\})\)", source, re.S)
    if not match:
        raise SystemExit("Manifest audio tidak dapat dibaca")
    data = json.loads(match.group(1))
    if data.get("total") != len(data.get("clips", [])) or not data["clips"]:
        raise SystemExit("Manifest audio tidak lengkap")
    return data


def valid_header(path: Path) -> bool:
    with path.open("rb") as handle:
        header = handle.read(3)
    return header == b"ID3" or (len(header) == 3 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0)


def archive_paths(inputs: list[Path]) -> list[Path]:
    if len(inputs) == 1 and inputs[0].is_dir():
        directory = inputs[0]
        full = directory / "cikgu-yasmin-offline.zip"
        if full.is_file():
            # Sokong Release sedia ada yang telah berjaya memuat naik ZIP penuh.
            return [full]
        return [directory / PART_PATTERN.format(index=index) for index in range(1, PART_COUNT + 1)]
    return inputs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archives", nargs="+", type=Path, help="Direktori 4 bahagian atau senarai ZIP")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    paths = [path.resolve() for path in archive_paths(args.archives)]
    root = args.root.resolve()
    for path in paths:
        if not path.is_file():
            raise SystemExit(f"ZIP audio tidak ditemui: {path.name}. Pastikan semua {PART_COUNT} bahagian dilampirkan dalam Release.")

    data = manifest(root)
    expected = {f"assets/audio/offline/{key}.mp3" for key in data["clips"]}
    seen: set[str] = set()
    for path in paths:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            local_names = [info.filename for info in infos]
            if len(local_names) != len(set(local_names)):
                raise SystemExit(f"Nama pendua dalam {path.name}")
            for name in local_names:
                if name in seen:
                    raise SystemExit(f"Klip pendua antara bahagian: {name}")
            if any(info.is_dir() or info.file_size <= 500 for info in infos):
                raise SystemExit(f"ZIP mempunyai direktori atau MP3 terlalu kecil: {path.name}")
            bad = archive.testzip()
            if bad:
                raise SystemExit(f"Entri ZIP rosak dalam {path.name}: {bad}")
            for info in infos:
                with archive.open(info) as handle:
                    header = handle.read(3)
                if not (header == b"ID3" or (len(header) == 3 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0)):
                    raise SystemExit(f"Bukan MP3 yang sah: {info.filename}")
            seen.update(local_names)

    if seen != expected:
        raise SystemExit(f"Gabungan ZIP tidak lengkap: {len(expected-seen)} hilang, {len(seen-expected)} tambahan")
    for path in paths:
        with zipfile.ZipFile(path) as archive:
            # Nama telah dibatasi kepada hash manifest; tiada path luar/traversal.
            archive.extractall(root)

    output = root / "assets/audio/offline"
    files = {path.name for path in output.glob("*.mp3")}
    expected_files = {f"{key}.mp3" for key in data["clips"]}
    if files != expected_files:
        raise SystemExit("Folder output mempunyai klip hilang atau yatim")
    total_bytes = 0
    for key in data["clips"]:
        path = output / f"{key}.mp3"
        if not valid_header(path):
            raise SystemExit(f"MP3 output rosak: {key}")
        total_bytes += path.stat().st_size
    if total_bytes != data["bytes"]:
        raise SystemExit(f"Jumlah bait tidak sepadan: {total_bytes} != {data['bytes']}")

    voices = data.get("voices") or {"lalai": data.get("voice", "tidak dinyatakan")}
    voice_label = ", ".join(f"{language}: {voice}" for language, voice in voices.items())
    message = f"Audio disahkan daripada {len(paths)} ZIP: {len(files)} klip, {total_bytes:,} bait, {voice_label}"
    print(message)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a", encoding="utf-8") as handle:
            voice_lines = "\n".join(f"- `{language}`: `{voice}`" for language, voice in voices.items())
            handle.write(f"### Audio BM/English\n\n- {len(paths)} bahagian ZIP disahkan\n- {len(files)} klip lengkap\n- {total_bytes:,} bait\n{voice_lines}\n")


if __name__ == "__main__":
    main()
