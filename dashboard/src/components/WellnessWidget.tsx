import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Heart, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

const API_BASE_URL = '/api';

const WellnessWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/wellness`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching wellness:', error);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="animate-pulse h-full bg-black/5 dark:bg-white/5 rounded-2xl" />;

  const currentBodyBattery = data.bodyBattery[0]?.value || 0;
  const currentStress = data.stress[0]?.value || 0;
  const currentHR = data.heartRate[0]?.value || 0;

  // Chart data (reversed to show chronological order)
  const chartData = data.bodyBattery.slice(0, 50).reverse().map((item: any) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: item.value
  }));

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-start shrink-0 mb-2">
        <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 rounded-xl text-teal-600 dark:text-teal-400">
          <Zap size={20} />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black text-primary leading-none">{currentBodyBattery}</span>
          <span className="text-[9px] font-bold text-tertiary uppercase tracking-widest mt-0.5">Energy</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white dark:bg-[#1C1C1E] p-2 rounded-xl shadow-2xl border border-black/10 dark:border-white/20 text-[10px] font-bold text-primary">
                      {payload[0].value}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#14b8a6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex justify-between gap-4 border-t border-black/5 dark:border-white/10 pt-2 shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-tertiary text-[8px] font-black uppercase tracking-widest mb-0.5">
            <Activity size={10} /> Stress
          </div>
          <span className="text-lg font-black text-primary leading-none">{currentStress}</span>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-tertiary text-[8px] font-black uppercase tracking-widest mb-0.5">
            <Heart size={10} /> RHR
          </div>
          <span className="text-lg font-black text-primary leading-none">{currentHR} <span className="text-[10px]">bpm</span></span>
        </div>
      </div>
    </div>
  );
};

export default WellnessWidget;
