import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Footprints, Flame, Zap } from 'lucide-react';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001/api`;

const DailySummaryWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/summary`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="animate-pulse h-full bg-black/5 dark:bg-white/5 rounded-2xl" />;

  const latestSteps = data.steps[0]?.total_steps || 0;
  const latestCalories = Math.round(data.calories[0]?.active_calories || 0);

  return (
    <div className="h-full flex flex-col justify-between min-h-0">
      <div className="flex justify-between items-start">
        <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
          <Footprints size={20} />
        </div>
        <span className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg">
          +12%
        </span>
      </div>
      <div className="mt-2">
        <h3 className="text-tertiary text-[10px] font-bold uppercase tracking-wider mb-0.5">Daily Steps</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black tracking-tight text-primary">
            {latestSteps.toLocaleString()}
          </span>
          <span className="text-tertiary text-[9px] font-bold uppercase tracking-widest ml-0.5">steps</span>
        </div>
        <div className="mt-2 w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-orange-500 h-full transition-all duration-1000" 
            style={{ width: `${Math.min((latestSteps / 10000) * 100, 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-[10px] font-bold text-tertiary">
        <div className="flex items-center gap-1">
          <Flame size={12} className="text-red-500" />
          {latestCalories} kcal
        </div>
        <div className="flex items-center gap-1">
          <Zap size={12} className="text-yellow-500" />
          45 min
        </div>
      </div>
    </div>
  );
};

export default DailySummaryWidget;
