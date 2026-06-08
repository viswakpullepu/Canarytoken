import { NextRequest } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

const transparentPixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token_id = params.id;

  const forwardedFor = request.headers.get('x-forwarded-for');
  const attacker_ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'Unknown IP';
  const user_agent = request.headers.get('user-agent') || 'Unknown User-Agent';
  const alert_id = crypto.randomUUID();

  try {
    const stmt = db.prepare('INSERT INTO alerts (id, token_id, attacker_ip, user_agent) VALUES (?, ?, ?, ?)');
    stmt.run(alert_id, token_id, attacker_ip, user_agent);
  } catch (err) {
    console.error('Error logging alert:', err);
  }

  return new Response(transparentPixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
