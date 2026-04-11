import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Moon, 
  Sun, 
  User,
  Bell
} from 'lucide-react';
import DailySummaryWidget from './components/DailySummaryWidget';
import SleepWidget from './components/SleepWidget';
import WellnessWidget from './components/WellnessWidget';
import BiometricsWidget from './components/BiometricsWidget';
import ActivityMapWidget from './components/ActivityMapWidget';

const API_BASE_URL = 'http://localhost:3001/api';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [config, setConfig] = useState<{ mapboxToken: string } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/config`);
        setConfig(response.data);
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="h-screen flex flex-col p-4 md:p-6 transition-colors duration-300 overflow-hidden">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-2 shrink-0">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-primary mb-0.5">
            Health Dashboard
          </h1>
          <p className="text-sm text-tertiary font-bold">
            Saturday, April 11, 2026
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-white dark:bg-[#1C1C1E] shadow-apple border border-black/5 dark:border-white/10 hover:scale-110 transition-transform text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="p-2.5 rounded-full bg-white dark:bg-[#1C1C1E] shadow-apple border border-black/5 dark:border-white/10 hover:scale-110 transition-transform text-[#1D1D1F] dark:text-[#F5F5F7]">
            <Bell size={20} />
          </button>
          <button className="p-2.5 rounded-full bg-white dark:bg-[#1C1C1E] shadow-apple border border-black/5 dark:border-white/10 hover:scale-110 transition-transform text-[#1D1D1F] dark:text-[#F5F5F7]">
            <User size={20} />
          </button>
        </div>
      </header>

      {/* Bento Grid */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-4 grid-rows-3 gap-4 flex-1 min-h-0">
        
        {/* Large Widget - Activities (Map + List) */}
        <div className="md:col-span-3 md:row-span-2 bento-card p-0 overflow-hidden relative">
          <ActivityMapWidget token={config?.mapboxToken || ''} />
        </div>

        {/* Small Widgets */}
        <div className="md:col-span-1 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden">
          <DailySummaryWidget />
        </div>

        <div className="md:col-span-1 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden text-primary">
          <WellnessWidget />
        </div>

        {/* Medium Widgets (Bottom Row) */}
        <div className="md:col-span-2 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden text-primary">
          <SleepWidget />
        </div>

        <div className="md:col-span-2 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden text-primary">
          <BiometricsWidget />
        </div>

      </main>

      {/* Footer / Status */}
      <footer className="max-w-7xl w-full mx-auto mt-4 py-3 border-t border-black/5 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-tertiary font-medium shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
          Sync successful: 2 mins ago
        </div>
        <div>
          Powered by Garmin Health Data & Mapbox
        </div>
      </footer>
    </div>
  );
};

export default App;
