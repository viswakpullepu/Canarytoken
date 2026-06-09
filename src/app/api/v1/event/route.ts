import { NextRequest, NextResponse } from 'next/server';
import { updateAlertDetails } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_id, details } = body;

    if (!alert_id || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await updateAlertDetails(alert_id, details);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to update alert details:', err);
    return NextResponse.json({ error: 'Failed to update alert details' }, { status: 500 });
  }
}
