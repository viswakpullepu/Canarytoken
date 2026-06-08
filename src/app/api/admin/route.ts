import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, createToken } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const alerts = await getAlerts(userId);
    return NextResponse.json(alerts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { token_name, memo, redirect_url } = body;

    const newToken = await createToken(userId, token_name, memo, redirect_url);
    return NextResponse.json(newToken);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
