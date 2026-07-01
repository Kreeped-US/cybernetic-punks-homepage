// lib/viewTracking.js
// Pure, dependency-free helpers for session-debounced page-view counting.
// No React, no browser globals -> unit-testable in bare node (see the verifier).

// sessionStorage key for a given page path.
export function viewKey(path) {
  return 'viewed:' + (path || '');
}

// Returns TRUE at most once per key per storage: the first call sets the key and
// returns true (=> count this view); subsequent calls with the same key return
// false (=> already counted this tab-session). If storage is unavailable (private
// mode / SSR), returns true (best-effort count, no dedupe) rather than throwing.
export function markViewedOnce(storage, key) {
  try {
    if (!storage) return true;
    if (storage.getItem(key)) return false;
    storage.setItem(key, '1');
    return true;
  } catch (e) {
    return true;
  }
}
