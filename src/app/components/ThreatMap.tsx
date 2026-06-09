'use client';

import React from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Alert } from '@/lib/storage';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function ThreatMap({ alerts }: { alerts: Alert[] }) {
  // Extract coordinates from alerts
  const markers = alerts.map(alert => {
    let lat = alert.exact_lat;
    let lon = alert.exact_lon;
    
    // Fallback to parsed location string if exact coords not present
    if (!lat || !lon) {
      if (alert.location) {
        const match = alert.location.match(/\(([-0-9.]+),\s*([-0-9.]+)\)/);
        if (match) {
          lat = parseFloat(match[1]);
          lon = parseFloat(match[2]);
        }
      }
    }
    
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      return { coordinates: [lon, lat] as [number, number], name: alert.location };
    }
    return null;
  }).filter(Boolean) as { coordinates: [number, number], name: string }[];

  return (
    <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-6 mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black -z-10 pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Global Threat Map</h3>
          <p className="text-[11px] text-neutral-400">Real-time origin tracing of hostile actors</p>
        </div>
      </div>

      <div className="w-full h-[200px] sm:h-[300px] flex items-center justify-center">
        {markers.length === 0 ? (
          <div className="text-neutral-500 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-600 animate-pulse"></span>
            Waiting for coordinates...
          </div>
        ) : (
          <ComposableMap projectionConfig={{ scale: 140 }}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#111"
                    stroke="#333"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#222', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
            {markers.map((marker, idx) => (
              <Marker key={idx} coordinates={marker.coordinates}>
                <circle r={4} fill="#f43f5e" className="animate-pulse" />
                <circle r={12} fill="#f43f5e" opacity={0.2} className="animate-ping" />
              </Marker>
            ))}
          </ComposableMap>
        )}
      </div>
    </div>
  );
}
