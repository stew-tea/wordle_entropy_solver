#!/usr/bin/env python3
"""
build_word_freq.py
Generates src/data/en_freq.json and es_freq.json as { word: frequency } maps
using the wordfreq library.  Replaces the old letter-frequency files.

Install: pip install wordfreq
Run:     python3 scripts/build_word_freq.py
"""

import json
from pathlib import Path

try:
    from wordfreq import word_frequency
except ImportError:
    raise SystemExit("wordfreq not installed — run: pip install wordfreq")

ROOT    = Path(__file__).resolve().parent.parent
SRC     = ROOT / "src" / "data"

def build(lang_code, wf_lang, word_files):
    """Write one *_freq.json per word-length file (e.g. en5_freq.json).
    Each file covers only its 8 000-word slice so the lazy-loaded bundle
    stays small (~250 KB each instead of one 850 KB combined file).
    """
    print(f"\n── {lang_code.upper()} ({wf_lang}) ───────────────────────────────")

    for fname in word_files:
        path = SRC / fname
        if not path.exists():
            print(f"  WARN: {fname} not found, skipping")
            continue
        words = json.loads(path.read_text(encoding="utf-8"))
        zero_count = 0
        freq = {}
        for word in words:
            f = word_frequency(word, wf_lang)
            freq[word] = f
            if f == 0:
                zero_count += 1

        sorted_freq = dict(sorted(freq.items(), key=lambda x: x[1], reverse=True))

        # Output file: e.g. en5_freq.json  (loaded alongside en5.json)
        stem = fname.replace(".json", "")          # "en5"
        out  = SRC / f"{stem}_freq.json"
        out.write_text(json.dumps(sorted_freq, ensure_ascii=False), encoding="utf-8")
        top5 = list(sorted_freq.items())[:5]
        print(f"  {out.name}: {len(words)} words, {zero_count} zero-freq | top: {top5}")


if __name__ == "__main__":
    build("en", "en", ["en5.json", "en6.json", "en7.json"])
    build("es", "es", ["es5.json", "es6.json", "es7.json"])
    print("\nDone.")
