import { NextRequest, NextResponse } from 'next/server';
import { createAlert, getToken } from '@/lib/storage';

const transparentPixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const token_id = resolvedParams.id;

  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const attacker_ip = (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || realIp || 'Unknown IP';
  const user_agent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  const city = request.headers.get('x-vercel-ip-city') || '';
  const country = request.headers.get('x-vercel-ip-country') || '';
  const lat = request.headers.get('x-vercel-ip-latitude') || '';
  const lon = request.headers.get('x-vercel-ip-longitude') || '';
  
  let location = city && country ? `${city}, ${country}` : (country || 'Unknown Location');
  if (lat && lon) {
    location += ` (${lat}, ${lon})`;
  }

  try {
    await createAlert(token_id, attacker_ip, user_agent, location);
  } catch (err) {
    console.error('Exception logging alert:', err);
  }

  const token = await getToken(token_id);
  if (token && token.redirect_url) {
    // If the token has a redirect URL, redirect the user
    return NextResponse.redirect(token.redirect_url);
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
