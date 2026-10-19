/**
 * Deterministic tokenizer for brief/file lexical matching.
 * Lowercases, splits camelCase/snake-case, applies a light stemmer,
 * and drops stopwords. No randomness, no dates — pure function.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "at", "by", "for",
  "with", "before", "after", "to", "from", "up", "down", "in",
  "out", "on", "off", "over", "under", "of", "as", "is", "are",
  "was", "be", "have", "has", "do", "will", "can", "this",
  "that", "it", "its", "you", "your", "we", "our", "they",
  "their", "not", "no", "too", "per",
]);

function splitWords(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase -> camel Case
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // ACRONYMCase -> ACRONYM Case
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Light deterministic stemmer: plurals + -ing. */
export function stem(word: string): string {
  if (word.length > 4) {
    if (word.endsWith("ies")) return word.slice(0, -3) + "y"; // retries -> retry
    if (word.endsWith("ing")) return word.slice(0, -3); // rounding -> round
    if (/(s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2); // fixes -> fix
  }
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1); // errors -> error
  }
  return word;
}

export function tokenize(text: string): string[] {
  return splitWords(text)
    .map(stem)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

/**
 * True when two stemmed tokens should count as the same word:
 * exact match, or one contains the other ("limit" vs "limiter",
 * "config" vs "configurable"). Containment needs length >= 4 on
 * the shorter side to avoid noise ("api" vs "rapid").
 */
export function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return false;
}
