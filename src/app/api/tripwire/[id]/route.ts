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
            let device_model = '';
            let os_platform = navigator.platform || '';
            let gpu_renderer = '';
            let battery_level = '';
            let connection_type = '';
            let touch_points = navigator.maxTouchPoints || 0;
            
            // Attempt to get exact device model on modern browsers (Android/Chrome)
            if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
              try {
                const entropy = await navigator.userAgentData.getHighEntropyValues(['model', 'platform']);
                device_model = entropy.model || '';
                os_platform = entropy.platform || os_platform;
              } catch(e) {}
            }

            let exact_lat = null;
            let exact_lon = null;

            // Extract GPU (100 verification passes to bypass anti-fingerprinting spoofers)
            try {
              for(let i = 0; i < 100; i++) {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                  if (debugInfo) {
                    const gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    if (gpu) gpu_renderer = gpu;
                  }
                }
              }
            } catch(e) {}

            // Extract & Verify Battery, Connection, and Touch (100 passes for accuracy)
            try {
              for(let i = 0; i < 100; i++) {
                if (navigator.getBattery) {
                  const battery = await navigator.getBattery();
                  battery_level = Math.round(battery.level * 100) + '% ' + (battery.charging ? '(Charging)' : '');
                }
                if (navigator.connection && navigator.connection.effectiveType) {
                  connection_type = navigator.connection.effectiveType;
                }
                if (navigator.maxTouchPoints) {
                  touch_points = navigator.maxTouchPoints;
                }
                // Micro-delay to allow asynchronous sensors to settle and prevent misfires
                await new Promise(r => setTimeout(r, 2));
              }
            } catch(e) {}

            // Attempt to get precise GPS location (will prompt user)
            try {
              if (navigator.geolocation) {
                await new Promise((resolve) => {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      exact_lat = position.coords.latitude;
                      exact_lon = position.coords.longitude;
                      resolve();
                    },
                    (error) => {
                      resolve(); // Proceed anyway if denied or timed out
                    },
                    { timeout: 5000, enableHighAccuracy: true }
                  );
                });
              }
            } catch(e) {}

            const details = {
              hardware_concurrency: navigator.hardwareConcurrency,
              device_memory: navigator.deviceMemory,
              language: navigator.language,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              screen_resolution: window.screen.width + 'x' + window.screen.height,
              device_model: device_model,
              os_platform: os_platform,
              gpu_renderer: gpu_renderer,
              battery_level: battery_level,
              connection_type: connection_type,
              touch_points: touch_points,
              exact_lat: exact_lat,
              exact_lon: exact_lon
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
