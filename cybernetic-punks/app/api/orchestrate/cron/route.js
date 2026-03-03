import { callEditor } from '@/lib/editorCore';
import { createClient } from '@supabase/supabase-js';
import { gatherAll } from '@/lib/gather/index';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function generateSlug(headline) {
  const base = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 70);
  const hash = Date.now().toString(36).slice(-4);
  return base + '-' + hash;
}

async function processEditor(editorName, prompt) {
  if (!prompt) {
    return { editor: editorName, success: false, error: 'No data gathered' };
  }

  try {
    const result = await callEditor(editorName, prompt);

    if (!result || !result.headline || result._parseError) {
      console.error('[CRON] ' + editorName + ' returned bad data');
      return { editor: editorName, success: false, error: 'Parse error or missing headline' };
    }

    const insertData = {
      headline: result.headline,
      body: result.body,
      editor: editorName,
      source: 'YOUTUBE',
      tags: result.tags || [],
      ce_score: 0,
      viral_score: 0,
      is_published: true,
      slug: generateSlug(result.headline),
    };

    if (editorName === 'CIPHER') insertData.ce_score = result.ce_score || 0;
    if (editorName === 'NEXUS') insertData.ce_score = result.grid_pulse || 0;
    if (editorName === 'DEXTER') insertData.ce_score = result.ce_score || 0;
    if (editorName === 'GHOST') insertData.source = 'REDDIT';

    const { error } = await supabase
      .from('feed_items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[CRON] ' + editorName + ' insert failed:', error.message);
      return { editor: editorName, success: false, error: error.message };
    }

    console.log('[CRON] ' + editorName + ' published: ' + result.headline);
    return { editor: editorName, success: true, headline: result.headline };

  } catch (err) {
    console.error('[CRON] ' + editorName + ' error:', err.message);
    return { editor: editorName, success: false, error: err.message };
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.ORCHESTRATOR_SECRET || 'dev-secret';

    if (authHeader !== 'Bearer ' + expectedKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Starting intake cycle...');

    // STEP 1: Gather real data from YouTube
    const prompts = await gatherAll();

    // STEP 2: Feed to all editors in parallel
    const results = await Promise.all([
      processEditor('CIPHER', prompts.CIPHER),
      processEditor('NEXUS', prompts.NEXUS),
      processEditor('DEXTER', prompts.DEXTER),
      processEditor('GHOST', prompts.GHOST),
    ]);

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: succeeded + ' published, ' + failed + ' skipped',
      results,
    });

  } catch (error) {
    console.error('[CRON] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
