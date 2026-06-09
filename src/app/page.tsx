'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Copy, Check, Activity, Clock, Globe, Fingerprint, Zap, Radar, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type Alert = {
  id: string;
  triggered_at: string;
  attacker_ip: string;
  user_agent: string;
  location: string;
  token_name: string;
  memo: string;
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

export default function CanaryDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tempUsername, setTempUsername] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenMemo, setTokenMemo] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem('canary_user_id');
    if (savedUserId) {
      setUserId(savedUserId);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUsername.trim()) return;
    // Simple temporary user ID generation based on username + random string
    const newUserId = tempUsername.trim().toLowerCase() + '-' + Math.random().toString(36).substring(7);
    localStorage.setItem('canary_user_id', newUserId);
    setUserId(newUserId);
  };

  const handleLogout = () => {
    localStorage.removeItem('canary_user_id');
    setUserId(null);
    setAlerts([]);
  };

  const fetchAlerts = async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-user-id': userId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    setGeneratedUrl('');

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
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

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#030712] text-neutral-200 flex items-center justify-center p-6 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl max-w-md w-full relative z-10"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-cyan-400 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-cyan-500/20">
              <Radar className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Private Workspace</h2>
          <p className="text-neutral-400 text-sm text-center mb-8">Enter a temporary username to create a private ephemeral session.</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <input
                type="text"
                required
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Enter a username..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white transition-all shadow-inner group-hover:border-white/20"
              />
              <div className="absolute inset-0 border border-cyan-500/0 rounded-xl pointer-events-none group-focus-within:border-cyan-500/50 transition-colors duration-300"></div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full relative overflow-hidden bg-white/5 border border-white/10 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center justify-center gap-2 tracking-wide">
                Initialize Secure Session
              </span>
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12 relative z-10 flex flex-col min-h-screen">
        <div className="space-y-8 lg:space-y-10 flex-grow">
          {/* Header */}
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative self-start sm:self-auto">
                <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 rounded-full"></div>
                <div className="bg-gradient-to-br from-cyan-400 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-cyan-500/20 relative border border-white/10">
                  <Radar className={`w-8 h-8 text-white ${pulse ? 'animate-ping duration-1000' : ''}`} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
                  Active Defense
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <p className="text-emerald-500/90 text-xs sm:text-sm font-medium uppercase tracking-widest flex items-center">
                    System Online <span className="mx-1.5 text-neutral-600">&bull;</span> <span className="text-neutral-400 truncate max-w-[150px] inline-block align-bottom">{userId.split('-')[0]}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 self-start md:self-auto w-full md:w-auto">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full shadow-inner flex-1 md:flex-none justify-center"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-neutral-300">
                  <span className="hidden sm:inline">Monitoring </span><span className="text-white font-bold">{alerts.length}</span> <span className="sm:hidden">Alerts</span><span className="hidden sm:inline">Triggers</span>
                </span>
              </motion.div>
              <button onClick={handleLogout} className="text-sm text-neutral-500 hover:text-white transition-colors">Logout</button>
            </div>
          </motion.header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 pb-12">
            
            {/* Token Generator Section */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="xl:col-span-4 space-y-6"
            >
              <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-3">
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
                      <div className="p-4 sm:p-5 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl relative shadow-[0_0_15px_rgba(6,182,212,0.15)]">
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
                          <code className="text-[10px] sm:text-xs text-cyan-100 px-3 py-2 flex-1 overflow-x-auto whitespace-nowrap custom-scrollbar">
                            {generatedUrl}
                          </code>
                          <button
                            onClick={copyToClipboard}
                            className={`p-2 sm:p-2.5 rounded-lg transition-all duration-300 ${copied ? 'bg-emerald-500 text-white' : 'bg-white/5 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'}`}
                            title="Copy URL"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-cyan-500/60 mt-3 font-medium">Embed this invisible tripwire in your documents, emails, or servers.</p>
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
              <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl h-full flex flex-col relative min-h-[500px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
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
                      className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-neutral-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 self-start sm:self-auto"
                    >
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Auto-updating
                    </motion.div>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto max-h-[700px] pr-2 sm:pr-3 custom-scrollbar">
                  {alerts.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-4 py-20 bg-black/20 rounded-2xl border border-white/5 border-dashed"
                    >
                      <div className="relative">
                        <ShieldAlert className="w-12 h-12 sm:w-16 sm:h-16 opacity-10" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500/50" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-neutral-300">No unauthorized access</p>
                        <p className="text-xs sm:text-sm mt-1 text-neutral-600">All tripwires are currently quiet.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {alerts.map((alert, index) => (
                          <motion.div 
                            key={alert.id || index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-black/40 border border-white/5 hover:border-red-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-colors duration-300 shadow-sm"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-rose-700 opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3 pl-2 sm:pl-0">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                  <span className="bg-red-500/10 text-red-400 text-[9px] sm:text-[10px] font-bold px-2 py-1 sm:px-2.5 sm:py-1 rounded-md border border-red-500/20 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    Breach Detected
                                  </span>
                                  <span className="text-xs sm:text-sm text-neutral-400 flex items-center gap-1.5 font-medium">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white mt-2 drop-shadow-sm truncate max-w-[250px] sm:max-w-md">
                                  {alert.token_name || 'Unknown Token'}
                                </h3>
                              </div>
                            </div>

                            {alert.memo && (
                              <div className="mb-4 sm:mb-5 bg-white/[0.02] border border-white/5 rounded-lg p-3 inline-block max-w-full">
                                <p className="text-[11px] sm:text-xs text-neutral-400 flex items-start sm:items-center gap-2">
                                  <span className="w-1 h-4 bg-indigo-500/50 rounded-full mt-0.5 sm:mt-0 flex-shrink-0"></span>
                                  <span className="break-words">Target Context: <span className="text-neutral-200">{alert.memo}</span></span>
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                              <div className="bg-neutral-900/80 rounded-xl p-3 sm:p-4 border border-white/5 shadow-inner flex items-start gap-3 group/item hover:bg-neutral-900 transition-colors">
                                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 flex-shrink-0">
                                  <Globe className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] sm:text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Source IP Address</p>
                                  <p className="text-sm sm:text-base font-mono text-rose-200 truncate">{alert.attacker_ip}</p>
                                </div>
                              </div>
                              <div className="bg-neutral-900/80 rounded-xl p-3 sm:p-4 border border-white/5 shadow-inner flex flex-col gap-2 group/item hover:bg-neutral-900 transition-colors">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 flex-shrink-0">
                                    <MapPin className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] sm:text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Location</p>
                                    <p className="text-[11px] sm:text-xs font-medium text-amber-200 break-words leading-relaxed" title={alert.location}>
                                      {alert.location}
                                    </p>
                                  </div>
                                </div>
                                {(alert.location.includes('(') || (alert.exact_lat && alert.exact_lon)) && (
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${(alert.exact_lat && alert.exact_lon) ? `${alert.exact_lat},${alert.exact_lon}` : encodeURIComponent(alert.location.match(/\(([^)]+)\)/)?.[1] || alert.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`mt-1 flex items-center justify-center gap-1.5 w-full text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors border ${(alert.exact_lat && alert.exact_lon) ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'}`}
                                  >
                                    <MapPin className="w-3 h-3" /> {(alert.exact_lat && alert.exact_lon) ? 'Precise GPS Map' : 'Approximate IP Map'}
                                  </a>
                                )}
                              </div>
                              <div className="bg-neutral-900/80 rounded-xl p-3 sm:p-4 border border-white/5 shadow-inner flex items-start gap-3 group/item hover:bg-neutral-900 transition-colors sm:col-span-2 md:col-span-1">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 flex-shrink-0">
                                  <Fingerprint className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 w-full">
                                  <p className="text-[9px] sm:text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Device / User Agent</p>
                                  <p className="text-[10px] sm:text-xs font-mono text-neutral-300 break-words line-clamp-2 leading-relaxed" title={alert.user_agent}>
                                    {alert.user_agent}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {(alert.screen_resolution || alert.hardware_concurrency || alert.language) && (
                              <div className="mt-3 bg-neutral-900/40 rounded-xl p-3 border border-white/5 shadow-inner">
                                <p className="text-[9px] sm:text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Deep Hardware Scan
                                </p>
                                <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs">
                                  {alert.screen_resolution && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">Screen:</span> <span className="font-mono text-emerald-200">{alert.screen_resolution}</span></div>
                                  )}
                                  {alert.os_platform && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">OS:</span> <span className="font-mono text-emerald-200">{alert.os_platform}</span></div>
                                  )}
                                  {alert.device_model && alert.device_model !== 'Unknown' && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">Device:</span> <span className="font-mono text-emerald-200">{alert.device_model}</span></div>
                                  )}
                                  {alert.gpu_renderer && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">GPU:</span> <span className="font-mono text-emerald-200" title={alert.gpu_renderer}>{alert.gpu_renderer.split('Direct3D')[0].split('vs_')[0].substring(0, 20)}{alert.gpu_renderer.length > 20 ? '...' : ''}</span></div>
                                  )}
                                  {alert.hardware_concurrency && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">CPU Cores:</span> <span className="font-mono text-emerald-200">{alert.hardware_concurrency}</span></div>
                                  )}
                                  {alert.device_memory && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">RAM:</span> <span className="font-mono text-emerald-200">{alert.device_memory}GB+</span></div>
                                  )}
                                  {alert.battery_level && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">Battery:</span> <span className="font-mono text-emerald-200">{alert.battery_level}</span></div>
                                  )}
                                  {alert.connection_type && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">Network:</span> <span className="font-mono text-emerald-200 uppercase">{alert.connection_type}</span></div>
                                  )}
                                  {alert.touch_points !== undefined && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">Touch:</span> <span className="font-mono text-emerald-200">{alert.touch_points > 0 ? `${alert.touch_points} Points` : 'No'}</span></div>
                                  )}
                                  {alert.timezone && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">Timezone:</span> <span className="font-mono text-emerald-200">{alert.timezone}</span></div>
                                  )}
                                  {alert.language && (
                                    <div className="bg-black/30 px-2 py-1 rounded border border-white/5"><span className="text-neutral-500">Lang:</span> <span className="font-mono text-emerald-200">{alert.language}</span></div>
                                  )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center py-6 mt-auto">
          <p className="text-xs sm:text-sm text-neutral-500 font-medium tracking-wide">
            Made with <span className="text-rose-500 animate-pulse inline-block mx-0.5">❤️</span> by <a href="https://vishwak-naidu.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors underline decoration-cyan-500/30 underline-offset-4 hover:decoration-cyan-400">Vishwak Naidu</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
