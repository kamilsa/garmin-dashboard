import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Moon,
  Sun,
  User,
  Bell,
  RefreshCw
} from 'lucide-react';
import DailySummaryWidget from './components/DailySummaryWidget';
import SleepWidget from './components/SleepWidget';
import WellnessWidget from './components/WellnessWidget';
import BiometricsWidget from './components/BiometricsWidget';
import ActivityMapWidget from './components/ActivityMapWidget';
import ChatAssistant from './components/ChatAssistant';
import FitnessAgeWidget from './components/FitnessAgeWidget';
import FoodTrackerWidget from './components/FoodTrackerWidget';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001/api`;

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [config, setConfig] = useState<{ mapboxToken: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await axios.post(`${API_BASE_URL}/refresh`);
      setLastSyncTime(new Date());
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to sync data from Garmin. Check server logs.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 transition-colors duration-300">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 shrink-0">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-primary mb-0.5">
            Health Dashboard
          </h1>
          <p className="text-sm text-tertiary font-bold">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex w-full md:w-auto gap-3 justify-end">
          <button 
            onClick={handleRefresh}
            disabled={isSyncing}
            className={`p-2.5 rounded-full bg-white dark:bg-[#1C1C1E] shadow-apple border border-black/5 dark:border-white/10 hover:scale-110 transition-transform text-[#1D1D1F] dark:text-[#F5F5F7] ${isSyncing ? 'opacity-50' : ''}`}
            title="Sync with Garmin Connect"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
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
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 md:h-[calc(100vh-12rem)] auto-rows-[minmax(160px,auto)] md:auto-rows-auto">

        {/* Large Widget - Activities (Map + List) */}
        <div className="md:col-span-3 md:row-span-2 bento-card p-0 overflow-hidden relative min-h-[420px] md:min-h-0">
          <ActivityMapWidget key={`map-${refreshKey}`} token={config?.mapboxToken || ''} />
        </div>

        {/* Small Widgets */}
        <div className="md:col-span-1 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden min-h-[180px] md:min-h-[160px]">
          <DailySummaryWidget key={`summary-${refreshKey}`} />
        </div>

        <div className="md:col-span-1 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden text-primary min-h-[180px] md:min-h-[160px]">
          <WellnessWidget key={`wellness-${refreshKey}`} />
        </div>

        {/* Medium Widgets (Bottom Row) */}
        <div className="md:col-span-2 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden text-primary min-h-[220px] md:min-h-[160px]">
          <SleepWidget key={`sleep-${refreshKey}`} />
        </div>

        <div className="md:col-span-1 md:row-span-1 bento-card p-4 flex flex-col justify-between overflow-hidden text-primary min-h-[220px] md:min-h-[160px]">
          <BiometricsWidget key={`biometrics-${refreshKey}`} />
        </div>

        <div className="md:col-span-1 md:row-span-1 bento-card p-4 flex flex-col overflow-hidden text-primary min-h-[180px] md:min-h-[160px]">
          <FitnessAgeWidget key={`fitnessage-${refreshKey}`} />
        </div>

      </main>

      {/* Food Tracker Widget */}
      <section className="max-w-7xl w-full mx-auto mt-4">
        <FoodTrackerWidget key={`food-${refreshKey}`} />
      </section>

      {/* AI Assistant */}
      <ChatAssistant />

      {/* Footer / Status */}
      <footer className="max-w-7xl w-full mx-auto mt-4 py-3 border-t border-black/5 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-tertiary font-medium shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
          Sync successful: Today at {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div>
          Powered by Garmin Health Data & Mapbox
        </div>
      </footer>
    </div>
  );
};

export default App;
