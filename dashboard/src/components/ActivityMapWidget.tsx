import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  Map as MapIcon, 
  ChevronRight, 
  Activity, 
  Mountain, 
  Wind, 
  Snowflake, 
  Globe, 
  Map as MapTypeIcon, 
  BarChart3, 
  Heart, 
  Flame, 
  Timer, 
  Navigation,
  Trophy,
  Zap,
  TrendingUp,
  Droplets,
  Maximize,
  Minimize
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001/api';

interface ActivityMapWidgetProps {
  token: string;
}

const ActivityMapWidget: React.FC<ActivityMapWidgetProps> = ({ token }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [loadingPath, setLoadingPath] = useState(false);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'satellite'>('outdoors');
  const [viewMode, setMapViewMode] = useState<'map' | 'stats'>('map');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Force a resize when entering/exiting full screen to fix map dimensions
    if (mapInstance.current) {
      const resizeMap = () => {
        if (mapInstance.current) {
          mapInstance.current.resize();
        }
      };
      
      // Delay slightly to allow the DOM to update classes/dimensions
      const timer = setTimeout(resizeMap, 300);
      window.addEventListener('resize', resizeMap);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeMap);
      };
    }
  }, [isFullScreen, viewMode]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/activities`);
        setActivities(response.data);
        if (response.data.length > 0) {
          const first = response.data[0];
          setSelectedActivity(first);
          if (!isOutdoor(first.activity_type)) {
            setMapViewMode('stats');
          }
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };
    fetchActivities();
  }, []);

  const isOutdoor = (type: string) => {
    return ['running', 'cycling', 'hiking', 'snowboarding', 'skiing', 'resort_snowboarding', 'backcountry_skiing_snowboarding', 'walking', 'open_water_swimming'].includes(type);
  };

  const setupMapExtras = (m: mapboxgl.Map) => {
    if (!m.getSource('mapbox-dem')) {
      m.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
    }
    m.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

    if (!m.getLayer('sky')) {
      m.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
          'sky-type': 'gradient',
          'sky-gradient': ['interpolate', ['linear'], ['sky-radial-progress'], 0.8, 'rgba(135, 206, 235, 1.0)', 1, 'rgba(0, 0, 0, 0.1)'],
          'sky-gradient-center': [0, 0],
          'sky-gradient-radius': 90,
          'sky-opacity': ['interpolate', ['exponential', 0.1], ['zoom'], 5, 0, 22, 1]
        }
      });
    }
  };

  useEffect(() => {
    if (!token || !mapContainer.current || viewMode !== 'map') return;

    mapboxgl.accessToken = token;
    
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/outdoors-v12', 
      center: [0, 0],
      zoom: 1,
      pitch: 45,
      bearing: 0,
      antialias: true,
      attributionControl: false,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    m.on('load', () => {
      setupMapExtras(m);
      mapInstance.current = m;
      if (selectedActivity && isOutdoor(selectedActivity.activity_type)) {
        updateMapPath(selectedActivity.activity_id);
      }
    });

    m.on('style.load', () => {
      setupMapExtras(m);
      if (selectedActivity && isOutdoor(selectedActivity.activity_type)) {
        updateMapPath(selectedActivity.activity_id);
      }
    });

    return () => {
      m.remove();
      mapInstance.current = null;
    };
  }, [token, viewMode, isFullScreen]); // Re-init on isFullScreen to ensure container ref is fresh

  useEffect(() => {
    const m = mapInstance.current;
    if (!m || viewMode !== 'map') return;
    
    const styleUrl = mapStyle === 'satellite' 
      ? 'mapbox://styles/mapbox/satellite-streets-v12' 
      : 'mapbox://styles/mapbox/outdoors-v12';
    
    m.setStyle(styleUrl);
  }, [mapStyle]);

  const updateMapPath = async (activityId: number) => {
    const m = mapInstance.current;
    if (!m) return;
    
    setLoadingPath(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/activity/${activityId}/path`);
      const coordinates = response.data;

      if (!coordinates || coordinates.length === 0) return;

      const sourceId = 'route';

      if (m.getSource(sourceId)) {
        (m.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        });
      } else {
        m.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        });

        m.addLayer({
          id: sourceId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': mapStyle === 'satellite' ? '#ffffff' : '#3b82f6',
            'line-width': 5,
            'line-opacity': 1,
          },
        });
      }

      const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
      for (const coord of coordinates) {
        bounds.extend(coord);
      }
      m.fitBounds(bounds, { padding: 100, duration: 2000, pitch: 60 });

    } catch (error) {
      console.error('Error fetching activity path:', error);
    } finally {
      setLoadingPath(false);
    }
  };

  useEffect(() => {
    const m = mapInstance.current;
    if (selectedActivity && m && m.isStyleLoaded() && viewMode === 'map' && isOutdoor(selectedActivity.activity_type)) {
      updateMapPath(selectedActivity.activity_id);
    }
  }, [selectedActivity]);

  const getActivityIcon = (type: string) => {
    if (type.includes('snowboarding') || type.includes('skiing')) return <Snowflake size={18} />;
    if (type.includes('swimming')) return <Droplets size={18} />;
    if (type.includes('treadmill')) return <Activity size={18} />;
    switch (type) {
      case 'running': return <Activity size={18} />;
      case 'hiking': return <Mountain size={18} />;
      case 'cycling': return <Zap size={18} />;
      default: return <MapIcon size={18} />;
    }
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatPace = (speedMps: number) => {
    if (!speedMps || speedMps === 0) return '--:--';
    const paceMinPerKm = 1000 / (speedMps * 60);
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.floor((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStats = () => {
    if (!selectedActivity) return null;
    const a = selectedActivity;

    return (
      <div className="p-8 pt-24 h-full overflow-y-auto bg-[var(--apple-bg)] transition-colors duration-300">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-blue-500 rounded-[2rem] text-white shadow-2xl hidden lg:block">
              {getActivityIcon(a.activity_type)}
            </div>
            <div>
              <h2 className="text-4xl font-black text-primary mb-2 tracking-tight">{a.activity_name || a.activity_type.replace(/_/g, ' ')}</h2>
              <p className="text-tertiary font-bold uppercase tracking-widest text-xs">
                {new Date(a.start_ts).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bento-card p-8 flex flex-col justify-between bg-[var(--apple-card)] min-h-[160px]">
              <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Navigation size={12} className="text-blue-500" /> Distance
              </div>
              <div className="text-4xl font-black text-primary tracking-tighter">{(a.distance / 1000).toFixed(2)} <span className="text-sm font-bold text-tertiary">km</span></div>
            </div>
            <div className="bento-card p-8 flex flex-col justify-between bg-[var(--apple-card)] min-h-[160px]">
              <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Timer size={12} className="text-orange-500" /> Time
              </div>
              <div className="text-4xl font-black text-primary tracking-tighter">{formatDuration(a.duration)}</div>
            </div>
            <div className="bento-card p-8 flex flex-col justify-between bg-[var(--apple-card)] min-h-[160px]">
              <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Heart size={12} className="text-red-500" /> Avg HR
              </div>
              <div className="text-4xl font-black text-primary tracking-tighter">{Math.round(a.average_hr) || '--'} <span className="text-sm font-bold text-tertiary">bpm</span></div>
            </div>
            <div className="bento-card p-8 flex flex-col justify-between bg-[var(--apple-card)] min-h-[160px]">
              <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Flame size={12} className="text-yellow-500" /> Calories
              </div>
              <div className="text-4xl font-black text-primary tracking-tighter">{Math.round(a.calories)} <span className="text-sm font-bold text-tertiary">kcal</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-16">
            <div className="bento-card p-10 bg-[var(--apple-card)]">
              <h4 className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-10 flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-5">
                <Trophy size={14} className="text-yellow-500" /> Performance Metrics
              </h4>
              <div className="space-y-10">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-secondary">Avg Speed / Pace</span>
                  <span className="text-2xl font-black text-primary">
                    {a.activity_type.includes('run') ? `${formatPace(a.average_speed)} min/km` : `${(a.average_speed * 3.6).toFixed(1)} km/h`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-secondary">Max Speed</span>
                  <span className="text-2xl font-black text-primary">{(a.max_speed * 3.6).toFixed(1)} <span className="text-sm text-tertiary font-medium">km/h</span></span>
                </div>
                {(a.avg_running_cadence || a.avg_biking_cadence) && (
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-secondary">Avg Cadence</span>
                    <span className="text-2xl font-black text-primary">{Math.round(a.avg_running_cadence || a.avg_biking_cadence)} <span className="text-sm text-tertiary font-medium">rpm</span></span>
                  </div>
                )}
                {a.avg_power > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-secondary">Avg Power</span>
                    <span className="text-2xl font-black text-primary">{Math.round(a.avg_power)} <span className="text-sm text-tertiary font-medium">W</span></span>
                  </div>
                )}
              </div>
            </div>

            <div className="bento-card p-10 bg-[var(--apple-card)] flex flex-col">
              <h4 className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-10 flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-5">
                <TrendingUp size={14} className="text-green-500" /> Training & Elevation
              </h4>
              <div className="space-y-10 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-secondary">Aerobic TE</span>
                  <div className="flex items-center gap-5">
                    <span className="text-2xl font-black text-primary">{(a.aerobic_training_effect || 0).toFixed(1)}</span>
                    <div className="w-28 bg-black/5 dark:bg-white/10 h-3 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" style={{ width: `${(a.aerobic_training_effect / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-secondary">Anaerobic TE</span>
                  <div className="flex items-center gap-5">
                    <span className="text-2xl font-black text-primary">{(a.anaerobic_training_effect || 0).toFixed(1)}</span>
                    <div className="w-28 bg-black/5 dark:bg-white/10 h-3 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full shadow-[0_0_12px_rgba(168,85,247,0.6)]" style={{ width: `${(a.anaerobic_training_effect / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
                {(a.running_elevation_gain > 0 || a.cycling_elevation_gain > 0) && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-base font-bold text-secondary">Elevation Gain</span>
                    <span className="text-2xl font-black text-primary">{Math.round(a.running_elevation_gain || a.cycling_elevation_gain)} <span className="text-sm text-tertiary font-medium">m</span></span>
                  </div>
                )}
              </div>
              {a.training_effect_label && (
                <div className="mt-10 p-5 bg-blue-500/10 dark:bg-blue-500/20 rounded-[2rem] text-blue-600 dark:text-blue-400 text-center font-black text-sm uppercase tracking-widest border border-blue-500/20 shadow-inner">
                  {a.training_effect_label.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const widgetContent = (
    <div className={`h-full w-full flex flex-col md:flex-row min-h-0 ${isFullScreen ? 'fixed inset-0 z-[100] bg-[var(--apple-bg)] p-4 md:p-10' : ''}`}>
      {/* Sidebar */}
      <div className={`border-black/5 dark:border-white/10 flex flex-col bg-white/50 dark:bg-black/20 backdrop-blur-sm min-h-0 ${
        isFullScreen ? 'w-full md:w-96 rounded-3xl border mr-6 shadow-2xl' : 'w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r h-1/3 md:h-full'
      }`}>
        <div className="p-3 border-b border-black/5 dark:border-white/10 shrink-0">
          <h3 className="text-base font-black flex items-center gap-2 text-primary">
            <MapIcon size={16} className="text-blue-500" />
            Activities
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {activities.length === 0 && <div className="text-xs text-tertiary p-4">No activities found</div>}
          {activities.map((activity) => (
            <button
              key={activity.activity_id}
              onClick={() => {
                setSelectedActivity(activity);
                if (!isOutdoor(activity.activity_type)) {
                  setMapViewMode('stats');
                }
              }}
              className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between group min-h-0 ${
                selectedActivity?.activity_id === activity.activity_id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-primary'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  selectedActivity?.activity_id === activity.activity_id
                    ? 'bg-white/20'
                    : 'bg-black/5 dark:bg-white/5'
                }`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="min-w-0">
                  <div className={`text-[11px] font-black truncate ${selectedActivity?.activity_id === activity.activity_id ? 'text-white' : 'text-primary'}`}>
                    {activity.activity_name || activity.activity_type.replace(/_/g, ' ')}
                  </div>
                  <div className={`text-[9px] font-bold ${selectedActivity?.activity_id === activity.activity_id ? 'text-white/80' : 'text-tertiary'}`}>
                    {new Date(activity.start_ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {(activity.distance / 1000).toFixed(1)}km
                  </div>
                </div>
              </div>
              <ChevronRight size={10} className={`shrink-0 transition-opacity ${
                selectedActivity?.activity_id === activity.activity_id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 relative min-h-0 overflow-hidden flex flex-col ${isFullScreen ? 'bento-card shadow-2xl' : ''}`}>
        <div className="absolute top-6 right-24 z-20 flex bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md p-1 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10">
          {selectedActivity && isOutdoor(selectedActivity.activity_type) && (
            <button 
              onClick={() => setMapViewMode('map')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'map' ? 'bg-blue-500 text-white shadow-lg' : 'text-tertiary hover:text-primary'
              }`}
            >
              <MapTypeIcon size={14} /> Map
            </button>
          )}
          <button 
            onClick={() => setMapViewMode('stats')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'stats' ? 'bg-blue-500 text-white shadow-lg' : 'text-tertiary hover:text-primary'
            }`}
          >
            <BarChart3 size={14} /> Stats
          </button>
        </div>

        {/* Full Screen Toggle */}
        <button 
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="absolute top-6 right-6 z-20 p-2.5 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:scale-110 transition-all"
        >
          {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

        {viewMode === 'map' && selectedActivity && isOutdoor(selectedActivity.activity_type) ? (
          <div className="h-full w-full relative">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
            
            <div className="absolute top-6 left-6 flex gap-2 z-20">
              <button 
                onClick={() => setMapStyle('outdoors')}
                className={`p-3 rounded-2xl shadow-xl border border-black/5 dark:border-white/10 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest backdrop-blur-md ${
                  mapStyle === 'outdoors' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/90 dark:bg-[#1C1C1E]/90 text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-white dark:hover:bg-[#1C1C1E]'
                }`}
              >
                <MapTypeIcon size={16} /> Outdoors
              </button>
              <button 
                onClick={() => setMapStyle('satellite')}
                className={`p-3 rounded-2xl shadow-xl border border-black/5 dark:border-white/10 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest backdrop-blur-md ${
                  mapStyle === 'satellite' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/90 dark:bg-[#1C1C1E]/90 text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-white dark:hover:bg-[#1C1C1E]'
                }`}
              >
                <Globe size={16} /> Satellite
              </button>
            </div>

            <div className="absolute bottom-6 left-6 right-6 pointer-events-none z-20">
              <div className="bento-card bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-lg p-5 flex justify-between items-center pointer-events-auto border border-black/10 dark:border-white/20 shadow-2xl">
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-1">Distance</div>
                    <div className="text-2xl font-black text-primary">{(selectedActivity.distance / 1000).toFixed(2)} <span className="text-xs font-bold text-tertiary">km</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-1">Duration</div>
                    <div className="text-2xl font-black text-primary">{formatDuration(selectedActivity.duration)}</div>
                  </div>
                  {(selectedActivity.running_elevation_gain > 0 || selectedActivity.cycling_elevation_gain > 0) && (
                    <div>
                      <div className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-1">Ascent</div>
                      <div className="text-2xl font-black text-primary">{Math.round(selectedActivity.running_elevation_gain || selectedActivity.cycling_elevation_gain)} <span className="text-xs font-bold text-tertiary">m</span></div>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg">
                  <Activity size={24} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          renderStats()
        )}

        {loadingPath && viewMode === 'map' && (
          <div className="absolute inset-0 bg-black/5 backdrop-blur-sm flex items-center justify-center pointer-events-none z-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg" />
          </div>
        )}
      </div>
    </div>
  );

  return isFullScreen ? createPortal(widgetContent, document.body) : widgetContent;
};

export default ActivityMapWidget;
