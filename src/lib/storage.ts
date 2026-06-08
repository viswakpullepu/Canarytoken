import fs from 'fs';
import path from 'path';
import os from 'os';

const dataFile = path.join(os.tmpdir(), 'canary-data.json');

type Token = { id: string; user_id: string; token_name: string; memo: string; redirect_url: string; created_at: string };
type Alert = { id: string; token_id: string; attacker_ip: string; user_agent: string; location: string; triggered_at: string };

type Data = {
  tokens: Token[];
  alerts: Alert[];
};

function readData(): Data {
  if (!fs.existsSync(dataFile)) {
    return { tokens: [], alerts: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  } catch {
    return { tokens: [], alerts: [] };
  }
}

function writeData(data: Data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

export function getToken(id: string) {
  const data = readData();
  return data.tokens.find(t => t.id === id);
}

export function getAlerts(user_id: string) {
  const data = readData();
  // Find all tokens owned by this user
  const userTokens = data.tokens.filter(t => t.user_id === user_id);
  const userTokenIds = new Set(userTokens.map(t => t.id));

  // Filter alerts for only those tokens
  return data.alerts
    .filter(alert => userTokenIds.has(alert.token_id))
    .map(alert => {
      const token = userTokens.find(t => t.id === alert.token_id);
      return {
        id: alert.id,
        attacker_ip: alert.attacker_ip,
        user_agent: alert.user_agent,
        location: alert.location || 'Unknown Location',
        triggered_at: alert.triggered_at,
        token_name: token?.token_name,
        memo: token?.memo,
      };
    })
    .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
}

export function createToken(user_id: string, token_name: string, memo: string, redirect_url: string = '') {
  const data = readData();
  const id = crypto.randomUUID();
  const newToken = { id, user_id, token_name, memo, redirect_url, created_at: new Date().toISOString() };
  data.tokens.push(newToken);
  writeData(data);
  return newToken;
}

export function createAlert(token_id: string, attacker_ip: string, user_agent: string, location: string = 'Unknown Location') {
  const data = readData();
  const id = crypto.randomUUID();
  const newAlert = { id, token_id, attacker_ip, user_agent, location, triggered_at: new Date().toISOString() };
  data.alerts.push(newAlert);
  writeData(data);
  return newAlert;
}
