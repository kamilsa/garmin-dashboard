import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { 
  Map as MapIcon, 
  ChevronRight, 
  Activity, 
  Mountain, 
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

const API_BASE_URL = '/api';

interface ActivityMapWidgetProps {
  token: string;
}

const ActivityMapWidget: React.FC<ActivityMapWidgetProps> = ({ token }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [loadingPath, setLoadingPath] = useState(false);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'satellite'>('outdoors');
  const [viewMode, setMapViewMode] = useState<'map' | 'stats' | 'charts'>('map');
  const [tsData, setTsData] = useState<any[]>([]);
  const [loadingTs, setLoadingTs] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const selectedActivityRef = useRef<any>(selectedActivity);

  useEffect(() => {
    selectedActivityRef.current = selectedActivity;
  }, [selectedActivity]);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsFullScreen(false);
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

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
    if (isMobile && selectedActivity && isOutdoor(selectedActivity.activity_type) && viewMode === 'map') {
      setMapViewMode('stats');
    }
  }, [isMobile, selectedActivity, viewMode]);

  useEffect(() => {
    if (isMobile && isFullScreen) {
      setIsFullScreen(false);
    }
  }, [isMobile, isFullScreen]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/activities`);
        setActivities(response.data);
        if (response.data.length > 0) {
          const first = response.data[0];
          setSelectedActivity(first);
          if (!isOutdoor(first.activity_type) || window.innerWidth < 768) {
            setMapViewMode('stats');
          }
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };
    fetchActivities();
  }, []);

  useEffect(() => {
    if (viewMode === 'charts' && selectedActivity) {
      setLoadingTs(true);
      axios.get(`${API_BASE_URL}/activity/${selectedActivity.activity_id}/ts`)
        .then(res => {
          let firstTs: number | null = null;
          const data = res.data.map((d: any) => {
            const currentTs = new Date(d.timestamp.replace(' ', 'T') + 'Z').getTime();
            if (!firstTs) firstTs = currentTs;
            const elapsedSecs = Math.floor((currentTs - firstTs) / 1000);
            const h = Math.floor(elapsedSecs / 3600);
            const m = Math.floor((elapsedSecs % 3600) / 60);
            const s = elapsedSecs % 60;
            return { 
              ...d, 
              elapsedStr: h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}` 
            };
          });
          setTsData(data);
        })
        .catch(err => console.error('Error fetching TS data', err))
        .finally(() => setLoadingTs(false));
    }
  }, [selectedActivity?.activity_id, viewMode]);

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
      const latestActivity = selectedActivityRef.current;
      if (latestActivity && isOutdoor(latestActivity.activity_type)) {
        updateMapPath(latestActivity.activity_id);
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
      m.fitBounds(bounds, {
        padding: isMobile ? 40 : 100,
        duration: 2000,
        pitch: isMobile ? 0 : 60,
      });

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
      <div className="p-4 md:p-8 h-full overflow-y-auto bg-[var(--apple-bg)] transition-colors duration-300 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-5">
          <div className="flex items-start gap-3 md:gap-4 pr-14 md:pr-0">
            <div className="p-4 bg-blue-500 rounded-[1.5rem] text-white shadow-xl hidden lg:block">
              {getActivityIcon(a.activity_type)}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-primary mb-1 tracking-tight">{a.activity_name || a.activity_type.replace(/_/g, ' ')}</h2>
              <p className="text-tertiary font-bold uppercase tracking-widest text-[10px]">
                {new Date(a.start_ts.replace(' ', 'T') + 'Z').toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bento-card p-4 md:p-5 flex flex-col justify-between bg-[var(--apple-card)] min-h-[112px]">
              <div className="text-tertiary font-black text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Navigation size={10} className="text-blue-500" /> Distance
              </div>
              <div className="text-3xl font-black text-primary tracking-tighter">{(a.distance / 1000).toFixed(2)} <span className="text-xs font-bold text-tertiary">km</span></div>
            </div>
            <div className="bento-card p-4 md:p-5 flex flex-col justify-between bg-[var(--apple-card)] min-h-[112px]">
              <div className="text-tertiary font-black text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Timer size={10} className="text-orange-500" /> Time
              </div>
              <div className="text-2xl md:text-3xl font-black text-primary tracking-tighter break-words">
                {formatDuration(a.duration)} <span className="text-xs font-bold text-tertiary">{a.duration >= 3600 ? 'h:m:s' : 'm:s'}</span>
              </div>
            </div>
            <div className="bento-card p-4 md:p-5 flex flex-col justify-between bg-[var(--apple-card)] min-h-[112px]">
              <div className="text-tertiary font-black text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Heart size={10} className="text-red-500" /> Avg HR
              </div>
              <div className="text-2xl md:text-3xl font-black text-primary tracking-tighter">{Math.round(a.average_hr) || '--'} <span className="text-xs font-bold text-tertiary">bpm</span></div>
            </div>
            <div className="bento-card p-4 md:p-5 flex flex-col justify-between bg-[var(--apple-card)] min-h-[112px]">
              <div className="text-tertiary font-black text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Flame size={10} className="text-yellow-500" /> Calories
              </div>
              <div className="text-2xl md:text-3xl font-black text-primary tracking-tighter">{Math.round(a.calories)} <span className="text-xs font-bold text-tertiary">kcal</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="bento-card p-4 md:p-6 bg-[var(--apple-card)]">
              <h4 className="text-tertiary font-black text-[9px] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                <Trophy size={12} className="text-yellow-500" /> Performance Metrics
              </h4>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-sm font-bold text-secondary truncate">
                    {a.activity_type.includes('run') ? 'Avg Pace' : 'Avg Speed'}
                  </span>
                  <span className="text-lg font-black text-primary shrink-0 text-right">
                    {a.activity_type.includes('run') ? formatPace(a.average_speed) : (a.average_speed * 3.6).toFixed(1)} <span className="text-xs text-tertiary font-medium">{a.activity_type.includes('run') ? 'min/km' : 'km/h'}</span>
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-sm font-bold text-secondary">Max Speed</span>
                  <span className="text-lg font-black text-primary sm:text-right">{(a.max_speed * 3.6).toFixed(1)} <span className="text-xs text-tertiary font-medium">km/h</span></span>
                </div>
                {(a.avg_running_cadence || a.avg_biking_cadence) && (
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <span className="text-sm font-bold text-secondary">Avg Cadence</span>
                    <span className="text-lg font-black text-primary sm:text-right">{Math.round(a.avg_running_cadence || a.avg_biking_cadence)} <span className="text-xs text-tertiary font-medium">rpm</span></span>
                  </div>
                )}
                {a.avg_power > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <span className="text-sm font-bold text-secondary">Avg Power</span>
                    <span className="text-lg font-black text-primary sm:text-right">{Math.round(a.avg_power)} <span className="text-xs text-tertiary font-medium">W</span></span>
                  </div>
                )}
              </div>
            </div>

            <div className="bento-card p-6 bg-[var(--apple-card)] flex flex-col">
              <h4 className="text-tertiary font-black text-[9px] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                <TrendingUp size={12} className="text-green-500" /> 
                {a.running_elevation_gain > 0 || a.cycling_elevation_gain > 0 ? "Training & Elevation" : "Training Effect"}
              </h4>
              <div className="space-y-4 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-sm font-bold text-secondary">Aerobic TE</span>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="text-lg font-black text-primary">{(a.aerobic_training_effect || 0).toFixed(1)}</span>
                    <div className="w-16 sm:w-20 bg-black/5 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${(a.aerobic_training_effect / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-sm font-bold text-secondary">Anaerobic TE</span>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="text-lg font-black text-primary">{(a.anaerobic_training_effect || 0).toFixed(1)}</span>
                    <div className="w-16 sm:w-20 bg-black/5 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" style={{ width: `${(a.anaerobic_training_effect / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
                {(a.running_elevation_gain > 0 || a.cycling_elevation_gain > 0) && (
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <span className="text-sm font-bold text-secondary">Elevation Gain</span>
                    <span className="text-lg font-black text-primary sm:text-right">{Math.round(a.running_elevation_gain || a.cycling_elevation_gain)} <span className="text-xs text-tertiary font-medium">m</span></span>
                  </div>
                )}
              </div>
              {a.training_effect_label && (
                <div className="mt-4 p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 text-center font-black text-[10px] uppercase tracking-widest border border-blue-500/20">
                  {a.training_effect_label.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    if (!selectedActivity) return null;
    if (loadingTs) {
      return (
        <div className="p-6 md:p-8 h-full flex flex-col items-center justify-center bg-[var(--apple-bg)]">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg" />
        </div>
      );
    }
    if (tsData.length === 0) {
      return (
        <div className="p-6 md:p-8 h-full flex flex-col items-center justify-center bg-[var(--apple-bg)] text-tertiary font-bold text-sm text-center">
          No time-series data available for this activity.
        </div>
      );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md p-3 rounded-xl border border-black/10 dark:border-white/10 shadow-xl min-w-32">
            <div className="text-[10px] font-black text-tertiary mb-2 uppercase tracking-widest">{label}</div>
            {payload.map((p: any, i: number) => (
              <div key={i} className="text-sm font-black flex justify-between gap-4" style={{ color: p.color }}>
                <span>{p.name}</span>
                <span>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value} {p.unit}</span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="p-4 md:p-8 h-full overflow-y-auto bg-[var(--apple-bg)] transition-colors duration-300 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-5 md:space-y-6 pb-6 md:pb-8">
          <div className="flex items-start gap-3 md:gap-4 mb-6 md:mb-8 pr-14 md:pr-0">
            <div className="p-4 bg-purple-500 rounded-[1.5rem] text-white shadow-xl hidden lg:block">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-primary mb-1 tracking-tight">Performance Charts</h2>
              <p className="text-tertiary font-bold uppercase tracking-widest text-[10px]">
                {selectedActivity.activity_name || selectedActivity.activity_type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bento-card p-4 md:p-6 bg-[var(--apple-card)]">
              <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Timer size={12} className="text-blue-500" /> Pace (min/km)
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tsData} syncId="activityCharts" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="elapsedStr" hide />
                    <YAxis reversed domain={['dataMin', 'dataMax']} hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="pace" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Pace" unit="min/km" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bento-card p-4 md:p-6 bg-[var(--apple-card)]">
              <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Heart size={12} className="text-red-500" /> Heart Rate (bpm)
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tsData} syncId="activityCharts" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="elapsedStr" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={false} name="HR" unit="bpm" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {tsData.some(d => d.power) && (
              <div className="bento-card p-4 md:p-6 bg-[var(--apple-card)]">
                <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap size={12} className="text-purple-500" /> Power (W)
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tsData} syncId="activityCharts" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="elapsedStr" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="power" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} name="Power" unit="W" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tsData.some(d => d.step_length) && (
              <div className="bento-card p-4 md:p-6 bg-[var(--apple-card)]">
                <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={12} className="text-blue-400" /> Stride Length (m)
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tsData} syncId="activityCharts" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="elapsedStr" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
                      <Line type="step" dataKey="step_length" stroke="#60a5fa" strokeWidth={0} dot={{ r: 2, fill: '#60a5fa' }} name="Stride Length" unit="m" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tsData.some(d => d.vr) && (
              <div className="bento-card p-4 md:p-6 bg-[var(--apple-card)]">
                <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={12} className="text-orange-500" /> Vertical Ratio (%)
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tsData} syncId="activityCharts" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="elapsedStr" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
                      <Line type="step" dataKey="vr" stroke="#f97316" strokeWidth={0} dot={{ r: 2, fill: '#f97316' }} name="Vertical Ratio" unit="%" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tsData.some(d => d.gct) && (
              <div className="bento-card p-4 md:p-6 bg-[var(--apple-card)]">
                <div className="text-tertiary font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={12} className="text-yellow-500" /> Ground Contact Time (ms)
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tsData} syncId="activityCharts" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="elapsedStr" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
                      <Line type="step" dataKey="gct" stroke="#eab308" strokeWidth={0} dot={{ r: 2, fill: '#eab308' }} name="GCT" unit="ms" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const widgetContent = (
    <div className={`h-full w-full flex flex-col md:flex-row min-h-0 ${isFullScreen ? 'fixed inset-0 z-[100] bg-[var(--apple-bg)] p-4 md:p-10' : ''}`}>
      {/* Sidebar */}
      <div className={`border-black/5 dark:border-white/10 flex flex-col bg-white/50 dark:bg-black/20 backdrop-blur-sm min-h-0 ${
        isFullScreen ? 'w-full md:w-96 rounded-3xl border md:mr-6 shadow-2xl' : 'w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r min-h-[180px] md:h-full max-h-[38vh] md:max-h-none'
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
                if (!isOutdoor(activity.activity_type) || isMobile) {
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
                    {new Date(activity.start_ts.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} • {(activity.distance / 1000).toFixed(1)}km
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
      <div className={`flex-1 relative min-h-[320px] md:min-h-0 overflow-hidden flex flex-col ${isFullScreen ? 'bento-card shadow-2xl' : ''}`}>
        <div className="absolute top-4 md:top-8 left-4 right-4 md:left-auto md:right-24 z-20 flex flex-wrap justify-center md:justify-start bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md p-1 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10">
          {selectedActivity && isOutdoor(selectedActivity.activity_type) && (
            <button
              onClick={() => setMapViewMode('map')}
              className={`px-3 md:px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'map' ? 'bg-blue-500 text-white shadow-lg' : 'text-tertiary hover:text-primary'
              }`}
            >
              <MapTypeIcon size={14} /> Map
            </button>
          )}
          <button
            onClick={() => setMapViewMode('stats')}
            className={`px-3 md:px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'stats' ? 'bg-blue-500 text-white shadow-lg' : 'text-tertiary hover:text-primary'
            }`}
          >
            <BarChart3 size={14} /> Stats
          </button>
          <button
            onClick={() => setMapViewMode('charts')}
            className={`px-3 md:px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'charts' ? 'bg-blue-500 text-white shadow-lg' : 'text-tertiary hover:text-primary'
            }`}
          >
            <Activity size={14} /> Charts
          </button>
        </div>

        {/* Full Screen Toggle */}
        {!isMobile && (
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="absolute top-6 md:top-8 right-6 z-20 p-2.5 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:scale-110 transition-all mt-1 md:mt-2"
          >
            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        )}

        {viewMode === 'map' && selectedActivity && isOutdoor(selectedActivity.activity_type) ? (
          <div className="h-full w-full relative">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
            
            <div className="absolute top-[4.5rem] md:top-8 left-4 md:left-6 z-20">
              <button
                onClick={() => setMapStyle(mapStyle === 'outdoors' ? 'satellite' : 'outdoors')}
                className="px-3 md:px-4 py-2 md:py-2.5 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest backdrop-blur-md bg-white/90 dark:bg-[#1C1C1E]/90 text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-white dark:hover:bg-[#1C1C1E]"
              >
                {mapStyle === 'outdoors' ? (
                  <><Globe size={16} className="text-blue-500" /> Satellite</>
                ) : (
                  <><MapTypeIcon size={16} className="text-blue-500" /> Outdoors</>
                )}
              </button>
            </div>

            <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 pointer-events-none z-20">
              <div className="bento-card bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-lg p-4 md:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pointer-events-auto border border-black/10 dark:border-white/20 shadow-2xl">
                <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-8">
                  <div>
                    <div className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-1">Distance</div>
                    <div className="text-xl md:text-2xl font-black text-primary">{(selectedActivity.distance / 1000).toFixed(2)} <span className="text-xs font-bold text-tertiary">km</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-1">Duration</div>
                    <div className="text-xl md:text-2xl font-black text-primary break-words">
                      {formatDuration(selectedActivity.duration)} <span className="text-xs font-bold text-tertiary">{selectedActivity.duration >= 3600 ? 'h:m:s' : 'm:s'}</span>
                    </div>
                  </div>
                  {(selectedActivity.running_elevation_gain > 0 || selectedActivity.cycling_elevation_gain > 0) && (
                    <div>
                      <div className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-1">Ascent</div>
                      <div className="text-xl md:text-2xl font-black text-primary">{Math.round(selectedActivity.running_elevation_gain || selectedActivity.cycling_elevation_gain)} <span className="text-xs font-bold text-tertiary">m</span></div>
                    </div>
                  )}
                </div>
                <div className="hidden sm:flex p-3 bg-blue-500 rounded-2xl text-white shadow-lg self-end sm:self-auto">
                  <Activity size={24} />
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'stats' ? (
          renderStats()
        ) : (
          renderCharts()
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
