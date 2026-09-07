import { NextRequest, NextResponse } from 'next/server';
import { updateAlertDetails } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (!text) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    let body: any;
    try {
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { alert_id, details } = body || {};

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
