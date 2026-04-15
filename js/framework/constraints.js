/**
 * Constraint runtime. Wraps a Runtime to enforce per-task limits:
 * - maxKeys: keystroke budget (format #2)
 * - timeMs: timer sprint (format #3, clock starts on first keypress)
 * - maxMistakes: reserved, not enforced in v1
 *
 * Usage:
 *   const cleanup = attachConstraints(runtime, task, {
 *     onFail: (reason) => {...},
 *     onTick: ({ keysLeft, timeLeftMs, mistakes }) => {...},
 *   });
 *   // ... later:
 *   cleanup();
 */

export function attachConstraints(runtime, task, handlers) {
  const c = (task && task.constraints) || {};
  const state = {
    startedAt: 0,
    mistakes: 0,
    timerId: null,
    failed: false,
    disposed: false,
  };

  const fail = (reason) => {
    if (state.failed || state.disposed) return;
    state.failed = true;
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    handlers.onFail(reason);
  };

  const tickInfo = () => ({
    keysLeft: c.maxKeys != null ? c.maxKeys - runtime.getKeystrokeCount() : null,
    timeLeftMs:
      c.timeMs != null && state.startedAt > 0
        ? Math.max(0, c.timeMs - (Date.now() - state.startedAt))
        : c.timeMs != null
        ? c.timeMs
        : null,
    mistakes: state.mistakes,
  });

  const onKeyPress = () => {
    if (state.disposed || state.failed) return;
    if (state.startedAt === 0) state.startedAt = Date.now();

    if (c.maxKeys != null && runtime.getKeystrokeCount() > c.maxKeys) {
      fail('over-budget');
      return;
    }
    handlers.onTick(tickInfo());
  };

  runtime.on('keypress', onKeyPress);

  if (c.timeMs != null) {
    state.timerId = setInterval(() => {
      if (state.disposed || state.failed) return;
      if (state.startedAt === 0) return;
      if (Date.now() - state.startedAt > c.timeMs) {
        fail('timeout');
      } else {
        handlers.onTick(tickInfo());
      }
    }, 100);
  }

  return function cleanup() {
    state.disposed = true;
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  };
}
