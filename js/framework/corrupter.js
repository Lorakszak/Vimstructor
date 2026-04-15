/**
 * Framework-level text corrupters for "find-the-bug" exercise format (#6).
 * Each function returns { corrupted, original } so checks can compare.
 *
 * All functions take an Rng as first argument and are deterministic under
 * a fixed seed.
 */

const TYPO_REPLACEMENTS = ['a', 'e', 'i', 'o', 'u', 't', 'n', 's', 'r', 'l'];

export function typos(rng, text, { count = 3 } = {}) {
  const chars = [...text];
  const writable = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== ' ' && chars[i] !== '\n' && chars[i] !== '\t') {
      writable.push(i);
    }
  }
  if (writable.length === 0) {
    return { corrupted: text, original: text };
  }
  const touched = new Set();
  const target = Math.min(count, writable.length);
  while (touched.size < target) {
    touched.add(writable[rng.int(0, writable.length - 1)]);
  }
  for (const pos of touched) {
    let replacement = rng.pick(TYPO_REPLACEMENTS);
    if (replacement === chars[pos]) {
      const idx = (TYPO_REPLACEMENTS.indexOf(replacement) + 1) % TYPO_REPLACEMENTS.length;
      replacement = TYPO_REPLACEMENTS[idx];
    }
    chars[pos] = replacement;
  }
  return { corrupted: chars.join(''), original: text };
}

export function swapWords(rng, text) {
  const words = text.split(' ');
  if (words.length < 2) {
    return { corrupted: text, original: text };
  }
  const i = rng.int(0, words.length - 2);
  [words[i], words[i + 1]] = [words[i + 1], words[i]];
  return { corrupted: words.join(' '), original: text };
}

export function shuffleLines(rng, text) {
  const lines = text.split('\n');
  const shuffled = rng.shuffle(lines);
  return { corrupted: shuffled.join('\n'), original: text };
}
