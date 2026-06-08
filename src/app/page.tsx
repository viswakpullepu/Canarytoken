'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Copy, Check, Activity, Clock, Globe, Fingerprint } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Alert = {
  id: string;
  triggered_at: string;
  attacker_ip: string;
  user_agent: string;
  token_name: string;
  memo: string;
};

export default function CanaryDashboard() {
  const [tokenName, setTokenName] = useState('');
  const [tokenMemo, setTokenMemo] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedUrl('');

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_name: tokenName, memo: tokenMemo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const url = `${window.location.origin}/api/tripwire/${data.id}`;
      setGeneratedUrl(url);
      setTokenName('');
      setTokenMemo('');
    } catch (err) {
      console.error('Error generating token:', err);
      alert('Failed to generate token.');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center gap-3 pb-6 border-b border-neutral-800">
          <ShieldAlert className="w-10 h-10 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Active Defense (Local)</h1>
            <p className="text-neutral-500 text-sm">Canary Token Generator & Incident Response</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Deploy New Trap
              </h2>
              <form onSubmit={handleGenerateToken} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Token Name</label>
                  <input
                    type="text"
                    required
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., prod_db_credentials"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Memo / Location</label>
                  <input
                    type="text"
                    value={tokenMemo}
                    onChange={(e) => setTokenMemo(e.target.value)}
                    placeholder="e.g., Hidden in AWS S3 bucket root"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Generating...' : 'Generate Token URL'}
                </button>
              </form>

              {generatedUrl && (
                <div className="mt-6 p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-lg">
                  <p className="text-xs text-emerald-400 mb-2 font-medium uppercase tracking-wider">Trap Deployed</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-emerald-200 bg-neutral-950 px-2 py-1.5 rounded flex-1 overflow-x-auto whitespace-nowrap border border-neutral-800">
                      {generatedUrl}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 hover:bg-emerald-900/50 rounded-md transition-colors text-emerald-400"
                      title="Copy URL"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl h-full flex flex-col">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Incident Log
              </h2>
              
              <div className="flex-1 overflow-auto max-h-[600px] pr-2 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-3 py-12">
                    <ShieldAlert className="w-12 h-12 opacity-20" />
                    <p>No incidents detected yet. All clear.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="bg-neutral-950 border border-red-900/30 rounded-lg p-4 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-80"></div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded border border-red-500/20 uppercase">
                              Alert Triggered
                            </span>
                            <span className="text-white font-medium">
                              {alert.token_name || 'Unknown Token'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                          </div>
                        </div>

                        {alert.memo && (
                          <p className="text-xs text-neutral-400 mb-4 border-l-2 border-neutral-800 pl-2">
                            Memo: {alert.memo}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 bg-neutral-900/50 rounded p-3 border border-neutral-800">
                          <div>
                            <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5" /> Source IP
                            </p>
                            <p className="text-sm font-mono text-red-200 break-all">{alert.attacker_ip}</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1.5">
                              <Fingerprint className="w-3.5 h-3.5" /> User Agent
                            </p>
                            <p className="text-xs font-mono text-neutral-300 break-words line-clamp-2" title={alert.user_agent}>
                              {alert.user_agent}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
