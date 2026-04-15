/**
 * Generic check combinators. A check is a function that takes a snapshot
 * (any shape) and returns a boolean. Check helpers here are engine-agnostic.
 *
 * Course-specific helpers (modeIs, at, lineEq for Vim, etc.) live under
 * courses/<id>/helpers.js and are imported directly by chapter files.
 */

export const all = (...fns) => (s) => fns.every((f) => f(s));

export const any = (...fns) => (s) => fns.some((f) => f(s));

export const not = (fn) => (s) => !fn(s);

/**
 * Sequence check for exercise format #7 (sequential goals in sandbox).
 * Advances an internal index as each sub-check passes. Returns true when
 * all sub-checks have been hit in order.
 *
 * - Out-of-order satisfaction is silently ignored.
 * - `progress()` returns the number of sub-checks hit so far.
 * - `total()` returns the total sub-check count.
 * - `reset()` rewinds the index to zero (use on task restart).
 */
export function makeSeq(...fns) {
  let idx = 0;
  const check = (s) => {
    while (idx < fns.length && fns[idx](s)) idx++;
    return idx === fns.length;
  };
  check.reset = () => {
    idx = 0;
  };
  check.progress = () => idx;
  check.total = () => fns.length;
  return check;
}
