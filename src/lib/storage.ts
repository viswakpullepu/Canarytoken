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
export type Alert = { id: string; token_id: string; attacker_ip: string; user_agent: string; location: string; triggered_at: string; token_name?: string; memo?: string };

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
      
      await redis.ltrim(`alerts:${user_id}`, 0, 49);
    }
  } catch (err) {
    console.error('Redis create alert error:', err);
  }
  
  return newAlert;
}
