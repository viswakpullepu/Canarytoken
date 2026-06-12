import { NextRequest, NextResponse } from 'next/server';
import { getRedis, Alert } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const alertId = resolvedParams.id;
    
    const body = await request.json();
    const { status, notes } = body;

    const redis = getRedis();
    if (!redis) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

    const alertsData = await redis.lrange(`alerts:${userId}`, 0, 50);
    const alerts: Alert[] = alertsData.map(a => JSON.parse(a));
    
    const alertIndex = alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Atomic update of the list item isn't perfectly supported by Redis without Lua,
    // but since we only keep 50 alerts and this is a low-concurrency admin action,
    // we can rewrite the list item at that index via LSET.
    if (status) alerts[alertIndex].status = status;
    if (notes !== undefined) alerts[alertIndex].notes = notes;

    await redis.lset(`alerts:${userId}`, alertIndex, JSON.stringify(alerts[alertIndex]));

    return NextResponse.json(alerts[alertIndex]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
