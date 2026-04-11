import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from 'recharts';

const API_BASE_URL = 'http://localhost:3001/api';

const BiometricsWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/biometrics`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching biometrics:', error);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="animate-pulse h-full bg-black/5 dark:bg-white/5 rounded-2xl" />;

  const currentVO2 = data.vo2[0]?.vo2_max || '--';
  const currentWeight = data.weight[0]?.weight ? data.weight[0].weight.toFixed(1) : '--';

  const vo2ChartData = data.vo2.slice(0, 15).reverse().map((item: any) => ({
    day: new Date(item.day).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.vo2_max
  }));

  const weightChartData = data.weight.slice(0, 15).reverse().map((item: any) => ({
    day: new Date(item.day).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.weight
  }));

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-start mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-tertiary text-[10px] font-bold uppercase tracking-wider">Metrics Trend</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col min-h-0">
          <div className="flex justify-between items-end mb-1 shrink-0">
            <div>
              <span className="text-[9px] font-black text-tertiary uppercase tracking-widest">VO2 Max</span>
              <div className="text-2xl font-black text-primary leading-none">{currentVO2}</div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vo2ChartData}>
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', fontSize: '10px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex justify-between items-end mb-1 shrink-0">
            <div>
              <span className="text-[9px] font-black text-tertiary uppercase tracking-widest">Weight (kg)</span>
              <div className="text-2xl font-black text-primary leading-none">{currentWeight}</div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', fontSize: '10px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiometricsWidget;
