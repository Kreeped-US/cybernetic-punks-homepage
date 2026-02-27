import { runTask } from '@/lib/orchestrator';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.ORCHESTRATOR_SECRET || 'dev-secret';

    if (authHeader !== `Bearer ${expectedKey}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    const nexusResult = await runTask('NEXUS_GENERATE_FEED', {
      editor: 'NEXUS',
      topic: 'Current Marathon meta developments, patch changes, and competitive shifts happening in the community right now',
      source: 'NEXUS SCAN',
      urgency: 'medium',
    });
    results.push({ editor: 'NEXUS', ...nexusResult });

    const ghostResult = await runTask('GHOST_COMMUNITY_PULSE', {
      editor: 'GHOST',
      topic: 'Current community sentiment and discussion trends in Marathon Discord and Reddit',
      sentiment: 'mixed',
      source: 'Discord/Reddit',
    });
    results.push({ editor: 'GHOST', ...ghostResult });

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}