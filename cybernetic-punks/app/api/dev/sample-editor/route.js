// app/api/dev/sample-editor/route.js
// ============================================================
// DEV-ONLY voice-sampling harness (editor rework Step 5a / 5b).
// ============================================================
// Runs the REAL generation path for ONE editor on a FIXED topic so we can
// compare current-voice vs. new-voice BEFORE committing any prompt change.
//
// WRITE-FREE BY CONSTRUCTION:
//   - article  = callEditor(editor, fixedPrompt, null)  -> no keyword read, and
//                callEditor itself never writes (persistence lives in the cron).
//   - comment  = sampleEditorComment(editor, article)   -> write-free helper, no
//                DB client, no insert.
//   No feed_items write, no article_comments write, no cron trigger.
//
// DEPLOY SAFETY: allowed ONLY when NODE_ENV === 'development' (local `next dev`).
// This 404s in production AND in Vercel preview/branch deploys (which build as
// NODE_ENV='production') -- so it is never reachable on any deployment, only on
// a local dev server. Intended to be removed (or kept dev-gated) after Step 5b.

import { callEditor, sampleEditorComment } from '@/lib/editorCore';

export const dynamic = 'force-dynamic';

var VALID_EDITORS = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];

export async function GET(req) {
  // Local-dev ONLY. Blocks production + preview/branch deploys + any non-dev runtime.
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 });
  }

  var url = new URL(req.url);
  var editor = (url.searchParams.get('editor') || '').toUpperCase();
  var topic = url.searchParams.get('topic') || 'The current state of the Marathon ranked meta this week.';

  if (!VALID_EDITORS.includes(editor)) {
    return Response.json({ error: 'editor must be one of: ' + VALID_EDITORS.join(', ') }, { status: 400 });
  }

  // FIXED user prompt -> the SAME input for every editor, so voice (EDITOR_PROMPTS)
  // is the only variable. Deliberately NOT gatherAll() (that would vary the data
  // per editor and mix data-fetching into a voice test). fetchGameContext still
  // runs inside callEditor (same read-only DB context for all editors).
  var fixedPrompt =
    'TOPIC / CONTEXT FOR THIS ARTICLE:\n' + topic +
    '\n\nWrite a single article on this topic, in your editorial lane and voice.';

  var out = { editor: editor, topic: topic, model_article: 'claude-sonnet-4', model_comment: 'claude-haiku-4-5' };

  // ARTICLE (real path, null client -> no writes)
  try {
    out.article = await callEditor(editor, fixedPrompt, null);
  } catch (e) {
    out.article = { _error: 'callEditor threw', _message: e.message };
  }

  // COMMENT (write-free per-editor sampler; reacts to the just-generated article)
  var reactTo = (out.article && out.article.headline)
    ? { headline: out.article.headline, body: out.article.body || '' }
    : { headline: topic, body: '' };
  try {
    out.comment = await sampleEditorComment(editor, reactTo);
  } catch (e) {
    out.comment = '[comment sample error: ' + e.message + ']';
  }

  out._note = 'DEV SAMPLE — generated, NOT persisted. No feed_items / article_comments write, no cron.';
  return Response.json(out);
}
