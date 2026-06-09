import Redis from 'ioredis';
import crypto from 'crypto';

let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
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

export type Token = { id: string; user_id: string; token_name: string; memo: string; redirect_url: string; created_at: string };
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

export async function createToken(user_id: string, token_name: string, memo: string, redirect_url: string = ''): Promise<Token> {
  const id = crypto.randomUUID();
  const newToken: Token = { id, user_id, token_name, memo, redirect_url, created_at: new Date().toISOString() };
  
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

    // Fetch alerts for this user
    const alertsData = await redis.lrange(`alerts:${user_id}`, 0, 50);
    for (let i = 0; i < alertsData.length; i++) {
      const alert: Alert = JSON.parse(alertsData[i]);
      if (alert.id === alert_id) {
        // Update the alert
        const updatedAlert = { ...alert, ...details };
        // Replace in list (LSET is 0-indexed)
        await redis.lset(`alerts:${user_id}`, i, JSON.stringify(updatedAlert));
        break;
      }
    }
  } catch (err) {
    console.error('Redis update alert error:', err);
  }
}
