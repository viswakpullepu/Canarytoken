import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

export type Token = { id: string; user_id: string; token_name: string; memo: string; redirect_url: string; created_at: string };
export type Alert = { id: string; token_id: string; attacker_ip: string; user_agent: string; location: string; triggered_at: string; token_name?: string; memo?: string };

export async function getToken(id: string): Promise<Token | null> {
  try {
    return await redis.get<Token>(`token:${id}`);
  } catch (err) {
    console.error('Redis get token error:', err);
    return null;
  }
}

export async function getAlerts(user_id: string): Promise<Alert[]> {
  try {
    const alerts = await redis.lrange<Alert>(`alerts:${user_id}`, 0, 50);
    return alerts;
  } catch (err) {
    console.error('Redis get alerts error:', err);
    return [];
  }
}

export async function createToken(user_id: string, token_name: string, memo: string, redirect_url: string = ''): Promise<Token> {
  const id = crypto.randomUUID();
  const newToken: Token = { id, user_id, token_name, memo, redirect_url, created_at: new Date().toISOString() };
  
  try {
    await redis.set(`token:${id}`, newToken);
    await redis.set(`token_lookup:${id}`, user_id);
    await redis.lpush(`tokens:${user_id}`, newToken);
  } catch (err) {
    console.error('Redis create token error:', err);
  }
  
  return newToken;
}

export async function createAlert(token_id: string, attacker_ip: string, user_agent: string, location: string = 'Unknown Location'): Promise<Alert> {
  const id = crypto.randomUUID();
  const newAlert: Alert = { id, token_id, attacker_ip, user_agent, location, triggered_at: new Date().toISOString() };
  
  try {
    const token = await redis.get<Token>(`token:${token_id}`);
    if (token) {
      const user_id = token.user_id;
      newAlert.token_name = token.token_name;
      newAlert.memo = token.memo;
      await redis.lpush(`alerts:${user_id}`, newAlert);
      
      // Keep only the 50 most recent alerts per user to save space
      await redis.ltrim(`alerts:${user_id}`, 0, 49);
    }
  } catch (err) {
    console.error('Redis create alert error:', err);
  }
  
  return newAlert;
}
