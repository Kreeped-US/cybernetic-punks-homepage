import { GET as cronHandler } from '@/app/api/orchestrate/cron/route';

export async function GET(request) {
  return cronHandler(request);
}