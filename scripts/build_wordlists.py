#!/usr/bin/env python3
"""
build_wordlists.py
Generates src/data/{en,es}{5,6,7}.json  +  src/data/{en,es}_freq.json
from raw source data files.

English source : data/english_words.txt   (one word per line, plain ASCII dict)
Spanish source : data/spanish_corpus/     (Latin-1 XML/prose, many files)
"""

import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

ROOT     = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT_DIR  = ROOT / "src" / "data"
CAP      = 8_000   # max words per length

# ── Spanish valid character set ──────────────────────────────────────────────
# All lowercase letters allowed in Spanish words
ES_ALPHA = set("abcdefghijklmnopqrstuvwxyzáéíóúüñ")

# Normalisation map for accent-stripping (used only for dedup, not storage)
ACCENT_MAP = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")

def strip_accents(word: str) -> str:
    return word.translate(ACCENT_MAP)


# ────────────────────────────────────────────────────────────────────────────
# ENGLISH
# ────────────────────────────────────────────────────────────────────────────

def build_english():
    print("\n── English ──────────────────────────────────────────────────")
    src = DATA_DIR / "english_words.txt"
    if not src.exists():
        sys.exit(f"ERROR: {src} not found")

    raw = src.read_text(encoding="utf-8", errors="ignore").splitlines()

    # Filter: exactly N letters, all alpha, no uppercase (proper nouns), no
    # embedded digits or punctuation. The dict is already lowercase-first but
    # some entries start with capital letters (Aaron, etc.).
    by_length: dict[int, list[str]] = {5: [], 6: [], 7: []}
    for word in raw:
        word = word.strip()
        if not word:
            continue
        # Reject proper nouns (capital first letter in source file)
        if word[0].isupper():
            continue
        w = word.lower()
        if not w.isalpha():
            continue
        if len(w) in by_length:
            by_length[len(w)].append(w)

    freq_all: Counter[str] = Counter()
    results = {}

    for length, words in by_length.items():
        words = list(dict.fromkeys(words))  # deduplicate, preserve order
        print(f"  en{length}: {len(words):,} unique words before ranking")

        # Letter frequency across this length group
        lf: Counter[str] = Counter()
        for w in words:
            lf.update(set(w))   # unique letters per word so common words don't skew

        # Score each word: sum of freq of its unique letters; tiebreak no-repeat
        def word_score(w):
            unique = set(w)
            freq_score = sum(lf[c] for c in unique)
            no_repeat  = 1 if len(unique) == len(w) else 0
            return (freq_score, no_repeat)

        words.sort(key=word_score, reverse=True)
        capped = words[:CAP]

        freq_all.update(lf)   # accumulate for global en_freq
        results[length] = capped

    # Write word lists
    for length, words in results.items():
        out = OUT_DIR / f"en{length}.json"
        out.write_text(json.dumps(words, ensure_ascii=True), encoding="utf-8")
        print(f"  Written en{length}.json  ({len(words):,} words)")

    # Write letter frequency file (normalised to 0–1 relative to max)
    total = sum(freq_all.values())
    freq_norm = {k: round(v / total, 6) for k, v in freq_all.most_common()}
    (OUT_DIR / "en_freq.json").write_text(
        json.dumps(freq_norm, ensure_ascii=True), encoding="utf-8"
    )
    print(f"  Written en_freq.json  ({len(freq_norm)} letters)")


# ────────────────────────────────────────────────────────────────────────────
# SPANISH
# ────────────────────────────────────────────────────────────────────────────

# Regex to tokenise: split on anything that's not a Spanish letter
_NON_ES_RE = re.compile(r"[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+")
# XML tag stripper
_TAG_RE    = re.compile(r"<[^>]+>")


def extract_spanish_words(text: str) -> list[str]:
    """Strip XML tags, tokenise, lowercase, return Spanish-char-only words."""
    text = _TAG_RE.sub(" ", text)
    tokens = _NON_ES_RE.split(text)
    words = []
    for tok in tokens:
        if not tok:
            continue
        w = tok.lower()
        # Keep only words whose every character is in the Spanish alpha set
        if all(c in ES_ALPHA for c in w):
            words.append(w)
    return words


def build_spanish():
    print("\n── Spanish ──────────────────────────────────────────────────")
    corpus_dir = DATA_DIR / "spanish_corpus"
    if not corpus_dir.exists():
        sys.exit(f"ERROR: {corpus_dir} not found")

    files = sorted(corpus_dir.iterdir())
    print(f"  Processing {len(files)} corpus files …")

    word_freq: Counter[str] = Counter()
    total_tokens = 0

    for i, fpath in enumerate(files):
        if fpath.is_dir():
            continue
        try:
            text = fpath.read_text(encoding="latin-1", errors="replace")
        except Exception as e:
            print(f"  WARN: could not read {fpath.name}: {e}")
            continue

        words = extract_spanish_words(text)
        total_tokens += len(words)
        word_freq.update(words)

        if (i + 1) % 10 == 0 or (i + 1) == len(files):
            print(f"  [{i+1}/{len(files)}] {total_tokens:,} tokens so far, "
                  f"{len(word_freq):,} unique words")

    print(f"  Total tokens: {total_tokens:,}  |  Unique words: {len(word_freq):,}")

    # Build length-specific lists, ranked by frequency
    # Deduplicate by accent-stripped form (keep the most frequent accented form)
    by_length: dict[int, list[str]] = {5: [], 6: [], 7: []}

    # Sort by frequency descending so the first occurrence of any normalised
    # form is the most frequent / most canonical spelling
    seen_normalised: set[str] = set()
    for word, _count in word_freq.most_common():
        n = len(word)
        if n not in by_length:
            continue
        norm = strip_accents(word)
        if norm in seen_normalised:
            continue
        seen_normalised.add(norm)
        by_length[n].append(word)

    # Letter frequency for es_freq.json (from the full corpus)
    lf: Counter[str] = Counter()
    for word, cnt in word_freq.items():
        lf.update({c: cnt for c in set(word)})

    # Write word lists
    for length, words in by_length.items():
        capped = words[:CAP]
        out = OUT_DIR / f"es{length}.json"
        out.write_text(json.dumps(capped, ensure_ascii=False), encoding="utf-8")
        print(f"  Written es{length}.json  ({len(capped):,} words, "
              f"pool was {len(words):,})")

    # Write letter frequency file
    total_lf = sum(lf.values())
    freq_norm = {k: round(v / total_lf, 6) for k, v in lf.most_common()}
    (OUT_DIR / "es_freq.json").write_text(
        json.dumps(freq_norm, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Written es_freq.json  ({len(freq_norm)} letters)")


# ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    build_english()
    build_spanish()
    print("\nDone.")
