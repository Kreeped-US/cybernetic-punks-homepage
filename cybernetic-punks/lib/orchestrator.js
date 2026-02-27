import { createClient } from '@supabase/supabase-js';
import { callEditor } from './editorCore';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function logEditorAction(editor, action, summary, entityType = null, entityId = null, metadata = {}) {
  await supabase.from('editor_logs').insert({
    editor,
    action,
    summary,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

async function queuePost(editor, platform, content, metadata = {}) {
  await supabase.from('post_queue').insert({
    editor,
    platform,
    content,
    status: 'QUEUED',
    metadata,
  });
}

export async function runTask(taskType, payload = {}) {
  const task = await supabase.from('tasks').insert({
    task_type: taskType,
    editor: payload.editor || 'SYSTEM',
    status: 'RUNNING',
    payload,
  }).select().single();

  const taskId = task.data?.id;

  try {
    let result;

    switch (taskType) {
      case 'CIPHER_GRADE_PLAY':
        result = await cipherGradePlay(payload);
        break;
      case 'NEXUS_GENERATE_FEED':
        result = await nexusGenerateFeed(payload);
        break;
      case 'GHOST_COMMUNITY_PULSE':
        result = await ghostCommunityPulse(payload);
        break;
      case 'DEXTER_GRADE_BUILD':
        result = await dexterGradeBuild(payload);
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    if (taskId) {
      await supabase.from('tasks').update({
        status: 'DONE',
        completed_at: new Date().toISOString(),
      }).eq('id', taskId);
    }

    return { success: true, result };

  } catch (error) {
    if (taskId) {
      await supabase.from('tasks').update({
        status: 'FAILED',
        error: error.message,
        completed_at: new Date().toISOString(),
      }).eq('id', taskId);
    }
    return { success: false, error: error.message };
  }
}

async function cipherGradePlay(payload) {
  const { title, creatorHandle, description } = payload;

  const result = await callEditor('CIPHER', `
    Grade this Marathon play for the Cybernetic Punks feed.
    
    Title: ${title}
    Creator: ${creatorHandle}
    Description: ${description || 'No description provided'}
    
    Respond with JSON:
    {
      "runner_grade": "S+|S|A|B|C|D",
      "headline": "punchy editorial headline under 80 chars",
      "body": "2-3 sentence CIPHER analysis of why this play earned this grade",
      "ce_score": 0.0-10.0,
      "tags": ["TAG1", "TAG2"]
    }
  `);

  const feedItem = await supabase.from('feed_items').insert({
    headline: result.headline,
    body: result.body,
    editor: 'CIPHER',
    source: creatorHandle,
    tags: result.tags,
    ce_score: result.ce_score,
    viral_score: payload.viral_score || 0,
    is_published: true,
  }).select().single();

  await logEditorAction('CIPHER', 'GRADE_PLAY', `Graded ${title} — Runner Grade ${result.runner_grade}`, 'feed_item', feedItem.data?.id, result);

  return result;
}

async function nexusGenerateFeed(payload) {
  const { topic, source, urgency } = payload;

  const result = await callEditor('NEXUS', `
    Generate a NEXUS meta intelligence feed item for Cybernetic Punks.
    
    Topic: ${topic}
    Source: ${source || 'Community'}
    Urgency level: ${urgency || 'medium'}
    
    Respond with JSON:
    {
      "headline": "urgent intel headline under 80 chars",
      "body": "2-3 sentences of NEXUS meta analysis",
      "grid_pulse": 0.0-10.0,
      "tags": ["TAG1", "TAG2"]
    }
  `);

  const feedItem = await supabase.from('feed_items').insert({
    headline: result.headline,
    body: result.body,
    editor: 'NEXUS',
    source: source || 'COMMUNITY',
    tags: result.tags,
    ce_score: result.grid_pulse,
    viral_score: 0,
    is_published: true,
  }).select().single();

  await logEditorAction('NEXUS', 'GENERATE_FEED', `Generated meta intel — Grid Pulse ${result.grid_pulse}`, 'feed_item', feedItem.data?.id, result);

  return result;
}

async function ghostCommunityPulse(payload) {
  const { topic, sentiment, source } = payload;

  const result = await callEditor('GHOST', `
    Generate a GHOST community pulse report for Cybernetic Punks.
    
    Topic: ${topic}
    Community sentiment: ${sentiment || 'mixed'}
    Source: ${source || 'Discord/Reddit'}
    
    Respond with JSON:
    {
      "headline": "community pulse headline under 80 chars",
      "body": "2-3 sentences capturing what the community actually thinks",
      "tags": ["TAG1", "TAG2"]
    }
  `);

  const feedItem = await supabase.from('feed_items').insert({
    headline: result.headline,
    body: result.body,
    editor: 'GHOST',
    source: source || 'COMMUNITY',
    tags: result.tags,
    ce_score: 0,
    viral_score: 0,
    is_published: true,
  }).select().single();

  await logEditorAction('GHOST', 'COMMUNITY_PULSE', `Published community pulse on: ${topic}`, 'feed_item', feedItem.data?.id, result);

  return result;
}

async function dexterGradeBuild(payload) {
  const { buildName, shell, weapons, abilities, description } = payload;

  const result = await callEditor('DEXTER', `
    Grade this Marathon build for the Cybernetic Punks feed.
    
    Build name: ${buildName}
    Runner shell: ${shell || 'Unknown'}
    Weapons: ${weapons || 'Not specified'}
    Abilities: ${abilities || 'Not specified'}
    Description: ${description || 'No description'}
    
    Respond with JSON:
    {
      "loadout_grade": "S|A|B|C|D|F",
      "headline": "build grade headline under 80 chars",
      "body": "2-3 sentences of DEXTER build analysis",
      "ce_score": 0.0-10.0,
      "tags": ["TAG1", "TAG2"]
    }
  `);

  const feedItem = await supabase.from('feed_items').insert({
    headline: result.headline,
    body: result.body,
    editor: 'DEXTER',
    source: 'BUILD SUBMISSION',
    tags: result.tags,
    ce_score: result.ce_score,
    viral_score: 0,
    is_published: true,
  }).select().single();

  await logEditorAction('DEXTER', 'GRADE_BUILD', `Graded ${buildName} — Loadout Grade ${result.loadout_grade}`, 'feed_item', feedItem.data?.id, result);

  return result;
}