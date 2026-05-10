import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from 'recharts';

const API_BASE_URL = '/api';

const FitnessAgeWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/fitness-age`)
      .then(r => setData(r.data))
      .catch(() => setError(true));
  }, []);

  if (error) return (
    <div className="h-full flex flex-col items-center justify-center gap-1 text-center">
      <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider">Fitness Age</p>
      <p className="text-xs text-tertiary">No data available</p>
    </div>
  );

  if (!data) return <div className="animate-pulse h-full bg-black/5 dark:bg-white/5 rounded-2xl" />;

  const { fitnessAge, realAge, ageDelta, currentVO2, updatedAt, history } = data;

  // Color based on how good the result is
  const deltaColor =
    ageDelta >= 8 ? 'text-emerald-500' :
    ageDelta >= 4 ? 'text-green-500' :
    ageDelta >= 0 ? 'text-blue-500' :
    'text-orange-500';

  const bgGradient =
    ageDelta >= 8 ? 'from-emerald-500/10 to-transparent' :
    ageDelta >= 4 ? 'from-green-500/10 to-transparent' :
    ageDelta >= 0 ? 'from-blue-500/10 to-transparent' :
    'from-orange-500/10 to-transparent';

  const areaColor =
    ageDelta >= 8 ? '#10b981' :
    ageDelta >= 4 ? '#22c55e' :
    ageDelta >= 0 ? '#3b82f6' :
    '#f97316';

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  return (
    <div className="h-full flex flex-col min-h-0 relative overflow-hidden">
      {/* Background gradient glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} pointer-events-none rounded-2xl`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0 relative">
        <div className="flex items-center gap-2">
          {/* Fitness person icon — SVG matching Garmin's style */}
          <div className={`p-2 rounded-xl bg-black/5 dark:bg-white/5 ${deltaColor}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="4" r="2" />
              <path d="M9 12l-2 6m10-6l2 6M9 12l3 3 3-3M7 10c0-1.5 1-3 5-3s5 1.5 5 3" />
            </svg>
          </div>
          <h3 className="text-[10px] font-black text-tertiary uppercase tracking-wider">Fitness Age</h3>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${deltaColor}`}>
          {ageDelta > 0 ? `−${ageDelta} yrs` : ageDelta < 0 ? `+${Math.abs(ageDelta)} yrs` : 'On par'}
        </span>
      </div>

      {/* Main metric */}
      <div className="flex items-end gap-3 mb-1 shrink-0 relative">
        <div>
          <div className={`text-5xl font-black leading-none ${deltaColor} drop-shadow-sm`}>
            {fitnessAge}
          </div>
          <div className="text-[9px] font-bold text-tertiary uppercase tracking-widest mt-0.5">
            Fitness Age
          </div>
        </div>
        <div className="mb-1 text-right">
          <div className="text-xl font-black text-primary leading-none">{realAge}</div>
          <div className="text-[9px] font-bold text-tertiary uppercase tracking-widest mt-0.5">
            Your Age
          </div>
        </div>
      </div>

      {/* VO2 Max sub-metric */}
      <div className="flex items-center gap-1.5 mb-2 shrink-0 relative">
        <span className="text-[9px] font-bold text-tertiary uppercase tracking-wider">VO2 Max</span>
        <span className="text-[11px] font-black text-primary">{currentVO2}</span>
      </div>

      {/* Sparkline */}
      {history && history.length > 1 && (
        <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="faGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} reversed />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px', border: 'none',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  background: 'rgba(255,255,255,0.95)',
                  fontSize: '10px', padding: '6px 10px'
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                formatter={(val: any) => [`Age ${val}`, 'Fitness Age']}
              />
              <Area
                type="monotone"
                dataKey="fitnessAge"
                stroke={areaColor}
                strokeWidth={2.5}
                fill="url(#faGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: areaColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 mt-1 relative">
        <p className="text-[9px] text-tertiary font-medium">Updated {formattedDate}</p>
      </div>
    </div>
  );
};

export default FitnessAgeWidget;
