import { runTask } from '@/lib/orchestrator';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.ORCHESTRATOR_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${expectedKey}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskType, payload } = body;

    if (!taskType) {
      return Response.json({ error: 'taskType is required' }, { status: 400 });
    }

    const result = await runTask(taskType, payload);
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    status: 'GRID ORCHESTRATOR ONLINE',
    editors: ['CIPHER', 'NEXUS', 'GHOST', 'DEXTER', 'MIRANDA'],
    tasks: ['CIPHER_GRADE_PLAY', 'NEXUS_GENERATE_FEED', 'GHOST_COMMUNITY_PULSE', 'DEXTER_GRADE_BUILD']
  });
}