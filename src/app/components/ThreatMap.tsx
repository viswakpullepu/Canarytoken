'use client';

import React from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup, Graticule } from 'react-simple-maps';
import { Alert } from '@/lib/storage';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function ThreatMap({ alerts }: { alerts: Alert[] }) {
  const markers = alerts.map(alert => {
    let lat = alert.exact_lat;
    let lon = alert.exact_lon;
    let isExact = true;
    
    // Fallback to parsed location string if exact coords not present
    if (!lat || !lon) {
      isExact = false;
      if (alert.location) {
        const match = alert.location.match(/\(([-0-9.]+),\s*([-0-9.]+)\)/);
        if (match) {
          lat = parseFloat(match[1]);
          lon = parseFloat(match[2]);
        }
      }
    }
    
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      return { coordinates: [lon, lat] as [number, number], name: alert.location, isExact };
    }
    return null;
  }).filter(Boolean) as { coordinates: [number, number], name: string, isExact: boolean }[];

  return (
    <div className="w-full bg-black/80 border border-[#0f0]/30 rounded-none p-4 sm:p-6 mb-8 relative overflow-hidden font-mono text-[#0f0]">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#003300]/20 via-black to-black -z-10 pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-6 border-b border-[#0f0]/30 pb-3">
        <div className="p-2 bg-[#0f0]/10 border border-[#0f0]/50 text-[#0f0]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0f0] uppercase tracking-wider glitch-hover">GEO-TRACKING INTERFACE</h3>
          <p className="text-[11px] text-[#0f0]/60">Real-time origin tracing of hostile actors</p>
        </div>
      </div>

      <div className="w-full h-[250px] sm:h-[400px] flex items-center justify-center border border-[#0f0]/20 bg-[#000500] relative">
        {/* Radar Scanning Line Effect Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,255,0,0.1)_50%,transparent_100%)] w-full h-full pointer-events-none animate-[scan_3s_linear_infinite] opacity-50 z-10" style={{ backgroundSize: '100% 20%' }}></div>
        
        {markers.length === 0 ? (
          <div className="text-[#0f0]/70 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0f0] animate-pulse"></span>
            AWAITING SATELLITE UPLINK...
          </div>
        ) : (
          <ComposableMap projectionConfig={{ scale: 150 }} className="w-full h-full">
            <ZoomableGroup center={[0, 0]} zoom={1} maxZoom={10}>
              <Graticule stroke="#003300" strokeWidth={0.5} />
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#000"
                      stroke="#00ff00"
                      strokeWidth={0.3}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: '#002200', outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>
              {markers.map((marker, idx) => (
                <Marker key={idx} coordinates={marker.coordinates}>
                  {marker.isExact ? (
                    // Exact GPS Location: High Precision Green Crosshair
                    <g>
                      <circle r={1.5} fill="#0f0" />
                      <circle r={6} fill="none" stroke="#0f0" strokeWidth={0.5} className="animate-ping" />
                      <path d="M-4,0 L-1.5,0 M4,0 L1.5,0 M0,-4 L0,-1.5 M0,4 L0,1.5" stroke="#0f0" strokeWidth={0.5} />
                      <text textAnchor="middle" y={10} style={{ fontFamily: 'monospace', fill: '#0f0', fontSize: '3px', textTransform: 'uppercase' }}>GPS_LOCK</text>
                    </g>
                  ) : (
                    // Approximate IP Location: ~4km Green Radius Zone
                    <g>
                      <circle r={8} fill="#0f0" fillOpacity={0.1} stroke="#0f0" strokeWidth={0.5} strokeDasharray="1 1" className="animate-[spin_6s_linear_infinite]" />
                      <circle r={1.5} fill="#0f0" />
                      <text textAnchor="middle" y={-10} style={{ fontFamily: 'monospace', fill: '#0f0', fontSize: '3px', textTransform: 'uppercase' }}>± 4km Zone</text>
                    </g>
                  )}
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        )}
      </div>
    </div>
  );
}
