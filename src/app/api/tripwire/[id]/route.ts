import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

const transparentPixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const token_id = resolvedParams.id;

  const forwardedFor = request.headers.get('x-forwarded-for');
  const attacker_ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'Unknown IP';
  const user_agent = request.headers.get('user-agent') || 'Unknown User-Agent';

  try {
    const { error } = await supabase
      .from('alerts')
      .insert([{ token_id, attacker_ip, user_agent }]);

    if (error) {
      console.error('Error logging alert:', error);
    }
  } catch (err) {
    console.error('Exception logging alert:', err);
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
