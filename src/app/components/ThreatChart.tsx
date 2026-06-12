'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Alert } from '@/lib/storage';

export default function ThreatChart({ alerts }: { alerts: Alert[] }) {
  // Group alerts by day
  const dataMap = new Map<string, number>();
  
  // Initialize last 7 days with 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dataMap.set(d.toISOString().split('T')[0], 0);
  }

  alerts.forEach(alert => {
    const date = new Date(alert.triggered_at).toISOString().split('T')[0];
    if (dataMap.has(date)) {
      dataMap.set(date, dataMap.get(date)! + 1);
    }
  });

  const data = Array.from(dataMap.entries()).map(([date, count]) => ({
    date: date.substring(5), // MM-DD
    count
  }));

  return (
    <div className="w-full bg-black/80 border border-[#0f0]/30 rounded-none p-4 sm:p-6 mb-8 relative overflow-hidden font-mono text-[#0f0]">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#003300]/20 via-black to-black -z-10 pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-6 border-b border-[#0f0]/30 pb-3">
        <div className="p-2 bg-[#0f0]/10 border border-[#0f0]/50 text-[#0f0]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0f0] uppercase tracking-wider glitch-hover">THREAT ACTIVITY TIMELINE</h3>
          <p className="text-[11px] text-[#0f0]/60">7-Day Incident Frequency</p>
        </div>
      </div>

      <div className="w-full h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f0" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#0f0" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#003300" vertical={false} />
            <XAxis dataKey="date" stroke="#0f0" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#0f0" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #0f0', borderRadius: '0px' }}
              itemStyle={{ color: '#0f0' }}
              labelStyle={{ color: '#0f0', marginBottom: '5px' }}
            />
            <Area type="monotone" dataKey="count" name="Triggers" stroke="#0f0" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
