import { NextRequest, NextResponse } from 'next/server';
import { updateAlertDetails } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { alert_id, new_name } = body;

    if (!alert_id || !new_name) {
      return NextResponse.json({ error: 'Missing alert_id or new_name' }, { status: 400 });
    }

    // In a real application, we would verify the alert belongs to the user
    await updateAlertDetails(alert_id, { token_name: new_name });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to rename log' }, { status: 500 });
  }
}
