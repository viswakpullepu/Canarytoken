import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // We import getRedis dynamically to avoid top-level issues
    const { getRedis } = require('@/lib/storage');
    const redis = getRedis();
    if (!redis) return NextResponse.json({ error: 'Redis disabled' }, { status: 500 });
    
    const settingsStr = await redis.get(`settings:${userId}`);
    return NextResponse.json(settingsStr ? JSON.parse(settingsStr) : {});
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { getRedis } = require('@/lib/storage');
    const redis = getRedis();
    if (!redis) return NextResponse.json({ error: 'Redis disabled' }, { status: 500 });
    
    // Merge existing settings
    const existingStr = await redis.get(`settings:${userId}`);
    const existing = existingStr ? JSON.parse(existingStr) : {};
    
    const newSettings = { ...existing, ...body };
    await redis.set(`settings:${userId}`, JSON.stringify(newSettings));
    
    return NextResponse.json({ success: true, settings: newSettings });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
