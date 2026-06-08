import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    const alerts = db.prepare(`
      SELECT 
        alerts.id, alerts.attacker_ip, alerts.user_agent, alerts.triggered_at,
        tokens.token_name, tokens.memo
      FROM alerts
      LEFT JOIN tokens ON alerts.token_id = tokens.id
      ORDER BY alerts.triggered_at DESC
      LIMIT 50
    `).all();
    return NextResponse.json(alerts);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token_name, memo } = body;
    const id = crypto.randomUUID();

    const stmt = db.prepare('INSERT INTO tokens (id, token_name, memo) VALUES (?, ?, ?)');
    stmt.run(id, token_name, memo);

    return NextResponse.json({ id, token_name, memo });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
