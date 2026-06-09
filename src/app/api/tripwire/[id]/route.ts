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

  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  const attacker_ip = (vercelForwarded ? vercelForwarded.split(',')[0].trim() : null) || 
                      (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || 
                      realIp || 
                      'Unknown IP';
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
            
            // Attempt to get exact device model and true OS version on modern browsers (Android/Chrome)
            if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
              try {
                const entropy = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
                device_model = entropy.model || '';
                if (entropy.platform) {
                  os_platform = entropy.platform;
                  if (entropy.platformVersion) {
                    // On Android, platformVersion maps to the real Android version (e.g. 14.0.0)
                    os_platform += ' ' + entropy.platformVersion;
                  }
                }
              } catch(e) {}
            }

            let exact_lat = null;
            let exact_lon = null;
            let threat_id = 'Unknown';

            // Cryptographic Fingerprinting (Canvas + Audio + Fonts)
            try {
              // 1. Canvas Hash
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              ctx.textBaseline = 'top';
              ctx.font = '14px "Arial"';
              ctx.textBaseline = 'alphabetic';
              ctx.fillStyle = '#f60';
              ctx.fillRect(125,1,62,20);
              ctx.fillStyle = '#069';
              ctx.fillText('canary,token', 2, 15);
              ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
              ctx.fillText('canary,token', 4, 17);
              const canvasData = canvas.toDataURL();

              // 2. Audio Hash
              let audioData = '';
              try {
                const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
                const oscillator = audioCtx.createOscillator();
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);
                const compressor = audioCtx.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
                compressor.knee.setValueAtTime(40, audioCtx.currentTime);
                compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
                compressor.attack.setValueAtTime(0, audioCtx.currentTime);
                compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
                oscillator.connect(compressor);
                compressor.connect(audioCtx.destination);
                oscillator.start(0);
                audioCtx.oncomplete = (e) => {
                  const buffer = e.renderedBuffer.getChannelData(0);
                  audioData = buffer.slice(4500, 5000).reduce((acc, val) => acc + Math.abs(val), 0).toString();
                };
                audioCtx.startRendering();
              } catch(e) {}

              // Simple hash function
              const cyrb53 = function(str, seed = 0) {
                let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
                for (let i = 0, ch; i < str.length; i++) {
                  ch = str.charCodeAt(i);
                  h1 = Math.imul(h1 ^ ch, 2654435761);
                  h2 = Math.imul(h2 ^ ch, 1597334677);
                }
                h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
                h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
                return 4294967296 * (2097151 & h2) + (h1>>>0);
              };

              // Combine to generate unique threat ID
              threat_id = 'T-' + cyrb53(canvasData + audioData).toString(16).toUpperCase();
            } catch(e) {}

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
              exact_lon: exact_lon,
              threat_id: threat_id
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
