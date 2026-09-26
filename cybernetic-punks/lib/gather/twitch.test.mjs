// lib/gather/twitch.test.mjs
// Guards the external-fetch TIMEOUT contract on lib/gather/twitch.js: a hung Twitch call (token OR
// helix) must resolve to the function's normal fallback ({}) within the timeout instead of hanging a
// render, while non-OK and OK responses keep their existing behavior. Exercised through the exported
// getUserAvatars(), which calls getToken() (token fetch) then twitchFetch() (helix fetch).
// Run: node --import ./scripts/ext-resolve.register.mjs --test lib/gather/twitch.test.mjs
// (twitch.js imports the ../games directory, so the resolve hook is required.)
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Short timeout + creds so the module's AbortSignal.timeout fires fast in tests.
process.env.TWITCH_CLIENT_ID = 'test-id';
process.env.TWITCH_CLIENT_SECRET = 'test-secret';
process.env.TWITCH_FETCH_TIMEOUT_MS = '60';

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

// Fresh module per test so the module-level token cache never leaks across cases.
let _n = 0;
async function freshModule() { return import('./twitch.js?case=' + (++_n)); }

function okJson(body) { return { ok: true, status: 200, json: async () => body }; }
// A fetch that never resolves but rejects with a TimeoutError when its AbortSignal aborts (what a
// real hung fetch under AbortSignal.timeout does).
function hangUntilAbort(opts) {
  return new Promise(function (_resolve, reject) {
    if (opts && opts.signal) {
      opts.signal.addEventListener('abort', function () {
        const e = new Error('timed out'); e.name = 'TimeoutError'; reject(e);
      });
    }
  });
}

test('token fetch that never resolves -> getUserAvatars falls back to {} within the timeout', async () => {
  const { getUserAvatars } = await freshModule();
  globalThis.fetch = function (url, opts) { return hangUntilAbort(opts); }; // token call hangs
  const t0 = Date.now();
  const out = await getUserAvatars(['someone']);
  const elapsed = Date.now() - t0;
  assert.deepEqual(out, {}, 'fallback on token timeout');
  assert.ok(elapsed < 2000, 'resolved well within the timeout (took ' + elapsed + 'ms), not hung');
});

test('helix fetch that never resolves -> getUserAvatars falls back to {} within the timeout', async () => {
  const { getUserAvatars } = await freshModule();
  globalThis.fetch = function (url, opts) {
    if (url === TOKEN_URL) return Promise.resolve(okJson({ access_token: 'tok', expires_in: 3600 }));
    return hangUntilAbort(opts); // helix call hangs
  };
  const t0 = Date.now();
  const out = await getUserAvatars(['someone']);
  const elapsed = Date.now() - t0;
  assert.deepEqual(out, {}, 'fallback on helix timeout');
  assert.ok(elapsed < 2000, 'resolved within the timeout (took ' + elapsed + 'ms)');
});

test('non-OK helix response -> {} (unchanged behavior)', async () => {
  const { getUserAvatars } = await freshModule();
  globalThis.fetch = function (url) {
    if (url === TOKEN_URL) return Promise.resolve(okJson({ access_token: 'tok', expires_in: 3600 }));
    return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
  };
  assert.deepEqual(await getUserAvatars(['someone']), {});
});

test('OK responses -> avatar map (unchanged result)', async () => {
  const { getUserAvatars } = await freshModule();
  globalThis.fetch = function (url) {
    if (url === TOKEN_URL) return Promise.resolve(okJson({ access_token: 'tok', expires_in: 3600 }));
    return Promise.resolve(okJson({ data: [{ login: 'Streamer', profile_image_url: 'https://cdn/x.png' }] }));
  };
  assert.deepEqual(await getUserAvatars(['streamer']), { streamer: 'https://cdn/x.png' });
});

test('TWITCH_FETCH_TIMEOUT_MS guard: unset / invalid / zero / negative -> 5000; positive -> honored', async () => {
  const saved = process.env.TWITCH_FETCH_TIMEOUT_MS;
  const resolve = async (v) => {
    if (v === undefined) delete process.env.TWITCH_FETCH_TIMEOUT_MS; else process.env.TWITCH_FETCH_TIMEOUT_MS = v;
    const mod = await freshModule();
    return mod.TWITCH_FETCH_TIMEOUT_MS;
  };
  try {
    assert.equal(await resolve(undefined), 5000, 'unset -> 5000');
    assert.equal(await resolve(''), 5000, 'empty -> 5000');
    assert.equal(await resolve('abc'), 5000, 'non-numeric -> 5000');
    assert.equal(await resolve('0'), 5000, 'zero -> 5000');
    assert.equal(await resolve('-5'), 5000, 'negative -> 5000');
    assert.equal(await resolve('Infinity'), 5000, 'Infinity -> 5000');
    assert.equal(await resolve('60'), 60, 'positive finite -> honored');
  } finally {
    if (saved === undefined) delete process.env.TWITCH_FETCH_TIMEOUT_MS; else process.env.TWITCH_FETCH_TIMEOUT_MS = saved;
  }
});

test('a TimeoutError-named rejection from helix -> {} (catch matches the name)', async () => {
  const { getUserAvatars } = await freshModule();
  globalThis.fetch = function (url) {
    if (url === TOKEN_URL) return Promise.resolve(okJson({ access_token: 'tok', expires_in: 3600 }));
    const e = new Error('The operation timed out'); e.name = 'TimeoutError';
    return Promise.reject(e); // exactly what AbortSignal.timeout throws (verified unmocked)
  };
  assert.deepEqual(await getUserAvatars(['someone']), {}, 'TimeoutError-named rejection degrades to fallback, not a throw');
});
