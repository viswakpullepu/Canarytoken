'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Copy, Check, Activity, Clock, Globe, Fingerprint, Zap, Radar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [redirectUrl, setRedirectUrl] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 5000);
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
        body: JSON.stringify({ token_name: tokenName, memo: tokenMemo, redirect_url: redirectUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const url = `${window.location.origin}/api/tripwire/${data.id}`;
      setGeneratedUrl(url);
      setTokenName('');
      setTokenMemo('');
      setRedirectUrl('');
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-200 font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Dynamic Animated Background Effects */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="max-w-7xl mx-auto p-6 lg:p-12 relative z-10 space-y-10">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 rounded-full"></div>
              <div className="bg-gradient-to-br from-cyan-400 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-cyan-500/20 relative border border-white/10">
                <Radar className={`w-8 h-8 text-white ${pulse ? 'animate-ping duration-1000' : ''}`} />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
                Active Defense
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <p className="text-emerald-500/90 text-sm font-medium uppercase tracking-widest">System Online</p>
              </div>
            </div>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full shadow-inner"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-neutral-300">
              Monitoring <span className="text-white font-bold">{alerts.length}</span> Triggers
            </span>
          </motion.div>
        </motion.header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Token Generator Section */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="xl:col-span-4 space-y-6"
          >
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                Deploy Trap
              </h2>

              <form onSubmit={handleGenerateToken} className="space-y-5 relative z-10">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Asset Target Name</label>
                  <input
                    type="text"
                    required
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., aws_production_keys.txt"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm placeholder:text-neutral-600 transition-all shadow-inner text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Deployment Location / Memo</label>
                  <input
                    type="text"
                    value={tokenMemo}
                    onChange={(e) => setTokenMemo(e.target.value)}
                    placeholder="e.g., S3 Bucket root directory"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm placeholder:text-neutral-600 transition-all shadow-inner text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Redirect URL (Optional decoy)</label>
                  <input
                    type="url"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="e.g., https://google.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm placeholder:text-neutral-600 transition-all shadow-inner text-white"
                  />
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full relative overflow-hidden bg-white/5 border border-white/10 hover:border-cyan-500/50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors duration-300 mt-4 shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <span className="animate-pulse">Generating Payload...</span>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 text-cyan-400" /> 
                        Create Canary URL
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <AnimatePresence>
                {generatedUrl && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl relative shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                      <div className="absolute top-0 right-0 p-2">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </span>
                      </div>
                      <p className="text-[10px] text-cyan-400 mb-2 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Payload Ready
                      </p>
                      <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/5">
                        <code className="text-xs text-cyan-100 px-3 py-2 flex-1 overflow-x-auto whitespace-nowrap custom-scrollbar">
                          {generatedUrl}
                        </code>
                        <button
                          onClick={copyToClipboard}
                          className={`p-2.5 rounded-lg transition-all duration-300 ${copied ? 'bg-emerald-500 text-white' : 'bg-white/5 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'}`}
                          title="Copy URL"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-cyan-500/60 mt-3 font-medium">Embed this invisible tripwire in your documents, emails, or servers.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Incident Log Section */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="xl:col-span-8"
          >
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl h-full flex flex-col relative">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="bg-red-500/20 p-2 rounded-lg text-red-400 relative">
                    <ShieldAlert className="w-5 h-5 relative z-10" />
                    <div className="absolute inset-0 bg-red-500/20 blur-md rounded-lg"></div>
                  </div>
                  Intrusion Log
                </h2>
                
                {alerts.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-xs font-medium text-neutral-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/5"
                  >
                    <Clock className="w-3.5 h-3.5" /> Auto-updating
                  </motion.div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[700px] pr-3 custom-scrollbar">
                {alerts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-4 py-20 bg-black/20 rounded-2xl border border-white/5 border-dashed"
                  >
                    <div className="relative">
                      <ShieldAlert className="w-16 h-16 opacity-10" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-6 h-6 text-emerald-500/50" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-neutral-300">No unauthorized access</p>
                      <p className="text-sm mt-1 text-neutral-600">All tripwires are currently quiet.</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    <AnimatePresence>
                      {alerts.map((alert) => (
                        <motion.div 
                          key={alert.id}
                          variants={itemVariants}
                          layout
                          className="bg-black/40 border border-white/5 hover:border-red-500/30 rounded-2xl p-5 relative overflow-hidden group transition-colors duration-300 shadow-sm"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-rose-700 opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-red-500/20 uppercase tracking-widest flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                  Breach Detected
                                </span>
                                <span className="text-sm text-neutral-400 flex items-center gap-1.5 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                                </span>
                              </div>
                              <h3 className="text-xl font-bold text-white mt-2 drop-shadow-sm">
                                {alert.token_name || 'Unknown Token'}
                              </h3>
                            </div>
                          </div>

                          {alert.memo && (
                            <div className="mb-5 bg-white/[0.02] border border-white/5 rounded-lg p-3 inline-block">
                              <p className="text-xs text-neutral-400 flex items-center gap-2">
                                <span className="w-1 h-4 bg-indigo-500/50 rounded-full"></span>
                                Target Context: <span className="text-neutral-200">{alert.memo}</span>
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-neutral-900/80 rounded-xl p-4 border border-white/5 shadow-inner flex items-start gap-3 group/item hover:bg-neutral-900 transition-colors">
                              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                                <Globe className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Source IP Address</p>
                                <p className="text-base font-mono text-rose-200 truncate">{alert.attacker_ip}</p>
                              </div>
                            </div>
                            <div className="bg-neutral-900/80 rounded-xl p-4 border border-white/5 shadow-inner flex items-start gap-3 group/item hover:bg-neutral-900 transition-colors">
                              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                <Fingerprint className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Device / User Agent</p>
                                <p className="text-xs font-mono text-neutral-300 break-words line-clamp-2 leading-relaxed" title={alert.user_agent}>
                                  {alert.user_agent}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
