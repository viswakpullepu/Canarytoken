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

  let alertId = '';
  try {
    const alert = await createAlert(token_id, attacker_ip, user_agent, location);
    alertId = alert.id;
  } catch (err) {
    console.error('Exception logging alert:', err);
  }

  const token = await getToken(token_id);
  
  const accept = request.headers.get('accept') || '';
  const isHtmlRequest = accept.includes('text/html');
  
  let finalUrl = token?.redirect_url || '';
  if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = 'https://' + finalUrl;
  }

  if (isHtmlRequest) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="background: #000;">
      <script>
        (async function() {
          try {
            const details = {
              hardware_concurrency: navigator.hardwareConcurrency,
              device_memory: navigator.deviceMemory,
              language: navigator.language,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              screen_resolution: window.screen.width + 'x' + window.screen.height
            };
            
            await fetch('/api/tripwire/fingerprint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ alert_id: '${alertId}', details })
            });
          } catch(e) {}
          
          ${finalUrl ? `window.location.replace('${finalUrl}');` : ''}
        })();
      </script>
    </body>
    </html>
    `;
    
    return new Response(html, { 
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  }

  if (finalUrl) {
    try {
      // Validate URL parse
      new URL(finalUrl);
      return NextResponse.redirect(finalUrl, 302);
    } catch (e) {
      console.error('Invalid redirect URL:', finalUrl);
      // Fallback to transparent pixel if URL is completely invalid
    }
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
