import { NextRequest, NextResponse } from 'next/server';
import { updateAlertDetails, getAlerts } from '@/lib/storage';

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

    await updateAlertDetails(alertId, { status, notes });

    const alerts = await getAlerts(userId);
    const updatedAlert = alerts.find(a => a.id === alertId);

    if (!updatedAlert) {
      return NextResponse.json({ success: true, id: alertId, status, notes });
    }

    return NextResponse.json(updatedAlert);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
