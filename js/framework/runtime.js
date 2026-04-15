/**
 * Runtime is the contract every tool engine implements. The framework
 * never reaches into engine internals. It only uses the methods below.
 *
 * Each engine defines its own snapshot shape. Check predicates receive
 * the snapshot (plain object, JSON-serializable), not the live engine.
 *
 * @typedef {Object} Runtime
 * @property {string} id                       Tool identifier, e.g. "vim".
 * @property {(el: HTMLElement, initialState: unknown) => void} mount
 *   Render into the given container, apply initialState, attach input listeners.
 * @property {() => unknown} getState
 *   Return a JSON-serializable snapshot. Check predicates receive this.
 * @property {() => void} reset
 *   Restore the initialState that was passed to mount(). No DOM remount.
 * @property {() => void} dispose
 *   Detach listeners, clear DOM. Called when leaving the view.
 * @property {(event: 'change'|'keypress', cb: (snapshot: unknown) => void) => void} on
 *   Subscribe. 'change' fires after any state mutation; 'keypress' after any key event.
 * @property {() => string[]} getKeyLog
 *   Uniform history across all engines. Framework uses this for keystroke-budget
 *   and "used-key" checks without knowing the engine's internals.
 * @property {() => number} getKeystrokeCount
 *   Number of keys pressed since mount (or since the last reset()).
 */

// Pure type file. No runtime exports.
export {};
