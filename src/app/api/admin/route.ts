import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, createToken } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alerts = getAlerts();
    return NextResponse.json(alerts.slice(0, 50));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token_name, memo } = body;

    const newToken = createToken(token_name, memo);
    return NextResponse.json(newToken);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
