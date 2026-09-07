import Redis from 'ioredis';
import crypto from 'crypto';
import path from 'path';
// @ts-ignore
import { DatabaseSync } from 'node:sqlite';

let redisInstance: Redis | null = null;
let sqliteDbInstance: any = null;

export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;
  
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL || '';
  
  if (!redisUrl) {
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

function getSQLiteDb(): any {
  if (sqliteDbInstance) return sqliteDbInstance;
  try {
    const dbPath = path.join(process.cwd(), 'canary.db');
    sqliteDbInstance = new DatabaseSync(dbPath);

    sqliteDbInstance.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        token_name TEXT,
        memo TEXT,
        redirect_url TEXT,
        payload_type TEXT,
        created_at TEXT,
        expires_at TEXT,
        max_triggers INTEGER,
        trigger_count INTEGER,
        is_paused INTEGER,
        tags TEXT
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        token_id TEXT,
        user_id TEXT,
        attacker_ip TEXT,
        user_agent TEXT,
        location TEXT,
        triggered_at TEXT,
        token_name TEXT,
        memo TEXT,
        status TEXT,
        notes TEXT,
        details_json TEXT
      );
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password_hash TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        settings_json TEXT
      );
    `);

    // Ensure columns exist on legacy canary.db
    const addCol = (table: string, col: string, type: string) => {
      try { sqliteDbInstance.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (e) {}
    };
    addCol('tokens', 'user_id', 'TEXT');
    addCol('tokens', 'redirect_url', 'TEXT');
    addCol('tokens', 'payload_type', 'TEXT');
    addCol('tokens', 'expires_at', 'TEXT');
    addCol('tokens', 'max_triggers', 'INTEGER');
    addCol('tokens', 'trigger_count', 'INTEGER');
    addCol('tokens', 'is_paused', 'INTEGER');
    addCol('tokens', 'tags', 'TEXT');

    addCol('alerts', 'user_id', 'TEXT');
    addCol('alerts', 'location', 'TEXT');
    addCol('alerts', 'token_name', 'TEXT');
    addCol('alerts', 'memo', 'TEXT');
    addCol('alerts', 'status', 'TEXT');
    addCol('alerts', 'notes', 'TEXT');
    addCol('alerts', 'details_json', 'TEXT');

    return sqliteDbInstance;
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err);
    return null;
  }
}

const inMemoryRateLimits = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'Unknown IP') {
    return true;
  }
  const now = Date.now();
  const entry = inMemoryRateLimits.get(ip);
  if (!entry || now > entry.expiresAt) {
    inMemoryRateLimits.set(ip, { count: 1, expiresAt: now + 60000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 20;
}

export type Token = { 
  id: string; 
  user_id: string; 
  token_name: string; 
  memo: string; 
  redirect_url: string; 
  payload_type?: 'invisible' | 'redirect' | 'fake_login'; 
  created_at: string;
  expires_at?: string;
  max_triggers?: number;
  trigger_count?: number;
  is_paused?: boolean;
  tags?: string[];
};

export type Alert = { 
  id: string; 
  token_id: string; 
  attacker_ip: string; 
  user_agent: string; 
  location: string; 
  triggered_at: string; 
  token_name?: string; 
  memo?: string;
  status?: 'new' | 'investigating' | 'resolved';
  notes?: string;
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
  if (redis) {
    try {
      const data = await redis.get(`token:${id}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Redis get token error:', err);
    }
  }

  const db = getSQLiteDb();
  if (!db) return null;

  try {
    const stmt = db.prepare('SELECT * FROM tokens WHERE id = ?');
    const row: any = stmt.get(id);
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      token_name: row.token_name,
      memo: row.memo,
      redirect_url: row.redirect_url,
      payload_type: row.payload_type as any,
      created_at: row.created_at,
      expires_at: row.expires_at || undefined,
      max_triggers: row.max_triggers != null ? Number(row.max_triggers) : undefined,
      trigger_count: row.trigger_count != null ? Number(row.trigger_count) : 0,
      is_paused: Boolean(row.is_paused),
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  } catch (err) {
    console.error('SQLite get token error:', err);
    return null;
  }
}

export async function getTokens(user_id: string): Promise<Token[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const tokenIds = await redis.smembers(`user_tokens:${user_id}`);
      const tokens: Token[] = [];
      for (const id of tokenIds) {
        const data = await redis.get(`token:${id}`);
        if (data) tokens.push(JSON.parse(data));
      }
      return tokens.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.error('Redis get tokens error:', err);
    }
  }

  const db = getSQLiteDb();
  if (!db) return [];

  try {
    const stmt = db.prepare('SELECT * FROM tokens WHERE user_id = ? ORDER BY created_at DESC');
    const rows: any[] = stmt.all(user_id);
    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      token_name: row.token_name,
      memo: row.memo,
      redirect_url: row.redirect_url,
      payload_type: row.payload_type as any,
      created_at: row.created_at,
      expires_at: row.expires_at || undefined,
      max_triggers: row.max_triggers != null ? Number(row.max_triggers) : undefined,
      trigger_count: row.trigger_count != null ? Number(row.trigger_count) : 0,
      is_paused: Boolean(row.is_paused),
      tags: row.tags ? JSON.parse(row.tags) : []
    }));
  } catch (err) {
    console.error('SQLite get tokens error:', err);
    return [];
  }
}

export async function getAlerts(user_id: string): Promise<Alert[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const alertsData = await redis.lrange(`alerts:${user_id}`, 0, 50);
      return alertsData.map(a => JSON.parse(a));
    } catch (err) {
      console.error('Redis get alerts error:', err);
    }
  }

  const db = getSQLiteDb();
  if (!db) return [];

  try {
    const stmt = db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY triggered_at DESC LIMIT 51');
    const rows: any[] = stmt.all(user_id);
    return rows.map(row => {
      const details = row.details_json ? JSON.parse(row.details_json) : {};
      return {
        id: row.id,
        token_id: row.token_id,
        attacker_ip: row.attacker_ip,
        user_agent: row.user_agent,
        location: row.location,
        triggered_at: row.triggered_at,
        token_name: row.token_name,
        memo: row.memo,
        status: row.status || 'new',
        notes: row.notes || undefined,
        ...details
      };
    });
  } catch (err) {
    console.error('SQLite get alerts error:', err);
    return [];
  }
}

export async function createToken(
  user_id: string,
  token_name: string,
  memo: string,
  redirect_url: string = '',
  payload_type: 'invisible' | 'redirect' | 'fake_login' = 'invisible',
  max_triggers?: number,
  expires_at?: string,
  tags?: string[]
): Promise<Token> {
  const id = crypto.randomUUID();
  const newToken: Token = {
    id,
    user_id,
    token_name,
    memo,
    redirect_url,
    payload_type,
    created_at: new Date().toISOString(),
    tags: tags || [],
    trigger_count: 0
  };
  if (max_triggers) newToken.max_triggers = Number(max_triggers);
  if (expires_at) newToken.expires_at = expires_at;
  
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`token:${id}`, JSON.stringify(newToken));
      await redis.set(`token_lookup:${id}`, user_id);
      await redis.sadd(`user_tokens:${user_id}`, id);
      await redis.lpush(`tokens:${user_id}`, JSON.stringify(newToken));
    } catch (err) {
      console.error('Redis create token error:', err);
    }
  }

  const db = getSQLiteDb();
  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO tokens (id, user_id, token_name, memo, redirect_url, payload_type, created_at, expires_at, max_triggers, trigger_count, is_paused, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        newToken.id,
        newToken.user_id,
        newToken.token_name,
        newToken.memo,
        newToken.redirect_url,
        newToken.payload_type || 'invisible',
        newToken.created_at,
        newToken.expires_at || null,
        newToken.max_triggers != null ? newToken.max_triggers : null,
        0,
        0,
        JSON.stringify(newToken.tags || [])
      );
    } catch (err) {
      console.error('SQLite create token error:', err);
    }
  }
  
  return newToken;
}

async function sendNtfyNotification(alert: Alert, userId: string, isTelemetry: boolean = false) {
  const redis = getRedis();
  let settings: any = null;
  if (redis) {
    try {
      const settingsStr = await redis.get(`settings:${userId}`);
      if (settingsStr) settings = JSON.parse(settingsStr);
    } catch (err) {}
  } else {
    settings = await getSettings(userId);
  }

  if (!settings || !settings.ntfy_topic) return;

  try {
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
  } else {
    const settings = await getSettings(user_id);
    if (settings && settings.discord_webhook) webhookUrl = settings.discord_webhook;
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
  const newAlert: Alert = { id, token_id, attacker_ip, user_agent, location, triggered_at: new Date().toISOString(), status: 'new' };

  const redis = getRedis();
  if (redis) {
    try {
      const rateLimitKey = `rate_limit:${attacker_ip}`;
      const hits = await redis.incr(rateLimitKey);
      if (hits === 1) await redis.expire(rateLimitKey, 60);
      if (hits > 10) {
        console.warn(`Rate limit exceeded for IP ${attacker_ip}`);
        return newAlert;
      }

      const tokenStr = await redis.get(`token:${token_id}`);
      if (tokenStr) {
        const token: Token = JSON.parse(tokenStr);

        if (token.is_paused) return newAlert;
        if (token.expires_at && new Date() > new Date(token.expires_at)) return newAlert;
        if (token.max_triggers !== undefined && (token.trigger_count || 0) >= token.max_triggers) return newAlert;

        token.trigger_count = (token.trigger_count || 0) + 1;
        await redis.set(`token:${token_id}`, JSON.stringify(token));

        const user_id = token.user_id;
        newAlert.token_name = token.token_name;
        newAlert.memo = token.memo;
        await redis.lpush(`alerts:${user_id}`, JSON.stringify(newAlert));
        await redis.set(`alert_lookup:${id}`, user_id);
        await redis.ltrim(`alerts:${user_id}`, 0, 49);

        await sendDiscordWebhook(newAlert, user_id, false);
        await sendNtfyNotification(newAlert, user_id, false);
      }
      return newAlert;
    } catch (err) {
      console.error('Redis create alert error:', err);
    }
  }

  // SQLite Fallback
  if (!checkRateLimit(attacker_ip)) {
    console.warn(`Rate limit exceeded for IP ${attacker_ip}`);
    return newAlert;
  }

  const token = await getToken(token_id);
  if (token) {
    if (token.is_paused) return newAlert;
    if (token.expires_at && new Date() > new Date(token.expires_at)) return newAlert;
    if (token.max_triggers !== undefined && (token.trigger_count || 0) >= token.max_triggers) return newAlert;

    const db = getSQLiteDb();
    if (db) {
      try {
        const newCount = (token.trigger_count || 0) + 1;
        db.prepare('UPDATE tokens SET trigger_count = ? WHERE id = ?').run(newCount, token_id);

        const user_id = token.user_id;
        newAlert.token_name = token.token_name;
        newAlert.memo = token.memo;

        const stmt = db.prepare(`
          INSERT INTO alerts (id, token_id, user_id, attacker_ip, user_agent, location, triggered_at, token_name, memo, status, notes, details_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          newAlert.id,
          newAlert.token_id,
          user_id,
          newAlert.attacker_ip,
          newAlert.user_agent,
          newAlert.location,
          newAlert.triggered_at,
          newAlert.token_name || null,
          newAlert.memo || null,
          newAlert.status || 'new',
          null,
          JSON.stringify({})
        );

        await sendDiscordWebhook(newAlert, user_id, false);
        await sendNtfyNotification(newAlert, user_id, false);
      } catch (err) {
        console.error('SQLite create alert error:', err);
      }
    }
  }
  
  return newAlert;
}

export async function updateAlertDetails(alert_id: string, details: Partial<Alert>): Promise<void> {
  const redis = getRedis();
  if (redis) {
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
        await sendDiscordWebhook(updatedAlert, user_id, true);
        await sendNtfyNotification(updatedAlert, user_id, true);
      }
      return;
    } catch (err) {
      console.error('Redis update alert error:', err);
    }
  }

  // SQLite Fallback
  const db = getSQLiteDb();
  if (!db) return;

  try {
    const stmt = db.prepare('SELECT * FROM alerts WHERE id = ?');
    const row: any = stmt.get(alert_id);
    if (!row) return;

    const existingDetails = row.details_json ? JSON.parse(row.details_json) : {};
    const updatedDetails = { ...existingDetails, ...details };

    let tokenName = row.token_name;
    let status = row.status;
    let notes = row.notes;

    if (details.token_name !== undefined) tokenName = details.token_name;
    if (details.status !== undefined) status = details.status;
    if (details.notes !== undefined) notes = details.notes;

    db.prepare(`
      UPDATE alerts
      SET token_name = ?, status = ?, notes = ?, details_json = ?
      WHERE id = ?
    `).run(tokenName, status, notes, JSON.stringify(updatedDetails), alert_id);

    const updatedAlert: Alert = {
      id: row.id,
      token_id: row.token_id,
      attacker_ip: row.attacker_ip,
      user_agent: row.user_agent,
      location: row.location,
      triggered_at: row.triggered_at,
      token_name: tokenName,
      memo: row.memo,
      status: status,
      notes: notes,
      ...updatedDetails
    };

    await sendDiscordWebhook(updatedAlert, row.user_id, true);
    await sendNtfyNotification(updatedAlert, row.user_id, true);
  } catch (err) {
    console.error('SQLite update alert error:', err);
  }
}

export async function getUserPasswordHash(username: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const userStr = await redis.get(`auth:user:${username.toLowerCase().trim()}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.passwordHash || null;
      }
      return null;
    } catch (err) {
      console.error('Redis get user error:', err);
    }
  }

  const db = getSQLiteDb();
  if (!db) return null;

  try {
    const stmt = db.prepare('SELECT password_hash FROM users WHERE username = ?');
    const row: any = stmt.get(username.toLowerCase().trim());
    return row ? row.password_hash : null;
  } catch (err) {
    console.error('SQLite get user error:', err);
    return null;
  }
}

export async function setUserPasswordHash(username: string, passwordHash: string): Promise<void> {
  const normalizedUsername = username.toLowerCase().trim();
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`auth:user:${normalizedUsername}`, JSON.stringify({ passwordHash, created_at: new Date().toISOString() }));
    } catch (err) {
      console.error('Redis set user error:', err);
    }
  }

  const db = getSQLiteDb();
  if (db) {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO users (username, password_hash, created_at) VALUES (?, ?, ?)');
      stmt.run(normalizedUsername, passwordHash, new Date().toISOString());
    } catch (err) {
      console.error('SQLite set user error:', err);
    }
  }
}

export async function getSettings(user_id: string): Promise<any> {
  const redis = getRedis();
  if (redis) {
    try {
      const settingsStr = await redis.get(`settings:${user_id}`);
      return settingsStr ? JSON.parse(settingsStr) : {};
    } catch (err) {
      console.error('Redis get settings error:', err);
    }
  }

  const db = getSQLiteDb();
  if (!db) return {};

  try {
    const stmt = db.prepare('SELECT settings_json FROM settings WHERE user_id = ?');
    const row: any = stmt.get(user_id);
    return row ? JSON.parse(row.settings_json) : {};
  } catch (err) {
    console.error('SQLite get settings error:', err);
    return {};
  }
}

export async function setSettings(user_id: string, newSettings: any): Promise<any> {
  const existing = await getSettings(user_id);
  const updated = { ...existing, ...newSettings };

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`settings:${user_id}`, JSON.stringify(updated));
    } catch (err) {
      console.error('Redis set settings error:', err);
    }
  }

  const db = getSQLiteDb();
  if (db) {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (user_id, settings_json) VALUES (?, ?)');
      stmt.run(user_id, JSON.stringify(updated));
    } catch (err) {
      console.error('SQLite set settings error:', err);
    }
  }

  return updated;
}
