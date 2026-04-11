import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Moon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Tooltip, Cell } from 'recharts';

const API_BASE_URL = 'http://localhost:3001/api';

const SleepWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/sleep`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching sleep:', error);
      }
    };
    fetchData();
  }, []);

  if (!data || !data.sleep[0]) return <div className="animate-pulse h-full bg-black/5 dark:bg-white/5 rounded-2xl" />;

  const sleep = data.sleep[0];
  const duration = sleep.duration || 0;
  const durationHours = Math.floor(duration / 3600);
  const durationMinutes = Math.floor((duration % 3600) / 60);

  const levelsData = [
    { name: 'Deep', value: sleep.deep_sleep_duration || 0, color: '#1e3a8a' },
    { name: 'Light', value: sleep.light_sleep_duration || 0, color: '#3b82f6' },
    { name: 'REM', value: sleep.rem_sleep_duration || 0, color: '#8b5cf6' },
    { name: 'Awake', value: sleep.awake_duration || 0, color: '#ef4444' },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-start mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Moon size={18} />
          </div>
          <div>
            <h3 className="text-tertiary text-[10px] font-bold uppercase tracking-wider">Last Night</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-primary leading-none">
                {durationHours}h {durationMinutes}m
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{sleep.sleep_score || '--'}</span>
          <span className="text-[9px] uppercase font-bold text-tertiary tracking-widest mt-0.5">Score</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={levelsData} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0].value !== undefined) {
                  return (
                    <div className="bg-white dark:bg-[#1C1C1E] p-2 rounded-xl shadow-2xl border border-black/10 dark:border-white/20 text-[10px] font-bold text-primary">
                      {payload[0].payload.name}: {Math.round(Number(payload[0].value) / 60)}m
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {levelsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 shrink-0">
        {levelsData.map((lvl) => (
          <div key={lvl.name} className="flex flex-col items-center">
            <div className="w-full h-1 rounded-full mb-1" style={{ backgroundColor: lvl.color }} />
            <span className="text-[8px] font-black text-tertiary uppercase tracking-tighter">{lvl.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SleepWidget;
