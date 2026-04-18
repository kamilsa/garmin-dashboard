import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Upload, X, Loader2, ChevronDown, Trash2, UtensilsCrossed, Eye, Flame, Beef, Wheat, Droplets, Leaf, Pencil, Check } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001/api';

// Known vision-capable model families / name fragments
const VISION_HINTS = ['gemma', 'llava', 'vision', 'minicpm', 'bakllava', 'moondream', 'llama3.2', 'qwen2-vl', 'pixtral', 'cogvlm'];

interface FoodEntry {
  id: number;
  food_name: string;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  serving_description: string | null;
  confidence: string | null;
  raw_analysis: string | null;
  image_thumbnail: string | null;
  created_at: string;
}

interface DailyTotal {
  day: string;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  entry_count: number;
}

interface OllamaModel {
  name: string;
  size: number;
  parameterSize: string | null;
  family: string | null;
}

interface FoodEditDraft {
  food_name: string;
  description: string;
  serving_description: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
}

function toDraft(entry: FoodEntry): FoodEditDraft {
  const toStr = (v: number | null) => (v == null ? '' : String(v));
  return {
    food_name: entry.food_name || '',
    description: entry.description || '',
    serving_description: entry.serving_description || '',
    calories: toStr(entry.calories),
    protein_g: toStr(entry.protein_g),
    carbs_g: toStr(entry.carbs_g),
    fat_g: toStr(entry.fat_g),
    fiber_g: toStr(entry.fiber_g),
  };
}

function isVisionModel(model: OllamaModel): boolean {
  const nameLower = model.name.toLowerCase();
  const familyLower = (model.family || '').toLowerCase();
  return VISION_HINTS.some(hint => nameLower.includes(hint) || familyLower.includes(hint));
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function confidenceBadgeClass(confidence: string | null): string {
  switch (confidence) {
    case 'high': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    default: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
  }
}

const FoodTrackerWidget: React.FC = () => {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [todayTotals, setTodayTotals] = useState<DailyTotal | null>(null);
  const [isLoadingLog, setIsLoadingLog] = useState(true);

  // Image state
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageThumbnail, setImageThumbnail] = useState<string | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Model selection
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingResult, setEditingResult] = useState(false);
  const [resultDraft, setResultDraft] = useState<FoodEditDraft | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [entryDraft, setEntryDraft] = useState<FoodEditDraft | null>(null);
  const [savingId, setSavingId] = useState<number | 'result' | null>(null);

  const modelPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch food log
  const fetchFoodLog = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/food?days=7`);
      setEntries(response.data.entries || []);
      const today = new Date().toISOString().split('T')[0];
      const todayRow = (response.data.totals || []).find((t: DailyTotal) => t.day === today);
      setTodayTotals(todayRow || null);
    } catch (err) {
      console.error('Error fetching food log:', err);
    } finally {
      setIsLoadingLog(false);
    }
  }, []);

  useEffect(() => {
    fetchFoodLog();
  }, [fetchFoodLog]);

  // Fetch Ollama models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const resp = await axios.get(`${API_BASE_URL}/models`);
        const allModels: OllamaModel[] = resp.data.models || [];
        setModels(allModels);
        // Prefer a known vision model as default
        const visionModel = allModels.find(isVisionModel);
        setSelectedModel(visionModel?.name || allModels[0]?.name || '');
      } catch {
        // Ollama offline — model picker will be empty
      }
    };
    fetchModels();
  }, []);

  // Close model picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    if (showModelPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelPicker]);

  // Generate a small JPEG thumbnail from a data URL
  const generateThumbnail = (dataUrl: string, maxSize = 200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = dataUrl;
    });
  };

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please provide an image file (JPEG, PNG, WebP, etc.)');
      return;
    }
    setError(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);

      // Strip data URL prefix for Ollama
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);

      // Generate small thumbnail for DB storage
      const thumb = await generateThumbnail(dataUrl);
      setImageThumbnail(thumb);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageThumbnail(null);
    setAnalysisResult(null);
    setEditingResult(false);
    setResultDraft(null);
    setError(null);
  };

  const parseNullableNumber = (value: string, field: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field} must be a valid number`);
    }
    return parsed;
  };

  const buildPatchPayload = (draft: FoodEditDraft) => {
    const foodName = draft.food_name.trim();
    if (!foodName) {
      throw new Error('Food name is required');
    }

    return {
      food_name: foodName,
      description: draft.description.trim() || null,
      serving_description: draft.serving_description.trim() || null,
      calories: parseNullableNumber(draft.calories, 'Calories'),
      protein_g: parseNullableNumber(draft.protein_g, 'Protein'),
      carbs_g: parseNullableNumber(draft.carbs_g, 'Carbs'),
      fat_g: parseNullableNumber(draft.fat_g, 'Fat'),
      fiber_g: parseNullableNumber(draft.fiber_g, 'Fiber'),
    };
  };

  const getErrorMessage = (err: unknown, fallback: string) => {
    const axiosErr = err as { response?: { data?: { error?: string } | string } };
    const data = axiosErr.response?.data;
    if (typeof data === 'string') return data;
    return data?.error || fallback;
  };

  const handleAnalyze = async () => {
    if (!imageBase64 || !selectedModel) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setEditingResult(false);
    setResultDraft(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/food/analyze`, {
        image: imageBase64,
        model: selectedModel,
        thumbnail: imageThumbnail,
      });
      const entry: FoodEntry = response.data;
      setAnalysisResult(entry);
      setEntries(prev => [entry, ...prev]);
      fetchFoodLog();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } | string } };
      const status = axiosErr.response?.status;
      if (status === 413) {
        setError('Image payload is too large for the backend parser. Restart the backend to apply the latest 50MB limit, then try again.');
      } else if (status === 400) {
        setError('Invalid image payload. Try dropping the image again.');
      } else {
        const data = axiosErr.response?.data;
        const msg = typeof data === 'string' ? null : data?.error;
        setError(msg || 'Failed to analyze image. Check that the model supports vision.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startEditingResult = () => {
    if (!analysisResult) return;
    setEditingEntryId(null);
    setEntryDraft(null);
    setEditingResult(true);
    setResultDraft(toDraft(analysisResult));
  };

  const cancelEditingResult = () => {
    setEditingResult(false);
    setResultDraft(null);
  };

  const saveResultEdit = async () => {
    if (!analysisResult || !resultDraft) return;

    try {
      const payload = buildPatchPayload(resultDraft);
      setSavingId('result');
      setError(null);
      const response = await axios.patch(`${API_BASE_URL}/food/${analysisResult.id}`, payload);
      const updated: FoodEntry = response.data;
      setAnalysisResult(updated);
      setEntries(prev => prev.map(entry => (entry.id === updated.id ? updated : entry)));
      setEditingResult(false);
      setResultDraft(null);
      fetchFoodLog();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save edits.'));
    } finally {
      setSavingId(null);
    }
  };

  const startEditingEntry = (entry: FoodEntry) => {
    setEditingResult(false);
    setResultDraft(null);
    setEditingEntryId(entry.id);
    setEntryDraft(toDraft(entry));
  };

  const cancelEditingEntry = () => {
    setEditingEntryId(null);
    setEntryDraft(null);
  };

  const saveEntryEdit = async (id: number) => {
    if (!entryDraft) return;

    try {
      const payload = buildPatchPayload(entryDraft);
      setSavingId(id);
      setError(null);
      const response = await axios.patch(`${API_BASE_URL}/food/${id}`, payload);
      const updated: FoodEntry = response.data;
      setEntries(prev => prev.map(entry => (entry.id === updated.id ? updated : entry)));
      if (analysisResult?.id === id) {
        setAnalysisResult(updated);
      }
      setEditingEntryId(null);
      setEntryDraft(null);
      fetchFoodLog();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save edits.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API_BASE_URL}/food/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (analysisResult?.id === id) setAnalysisResult(null);
      if (editingEntryId === id) {
        setEditingEntryId(null);
        setEntryDraft(null);
      }
      fetchFoodLog();
    } catch (err) {
      console.error('Error deleting food entry:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatNum = (v: number | null, decimals = 0) =>
    v != null ? v.toFixed(decimals) : '—';

  const inputClassName = 'w-full px-2.5 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

  const macroInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    unit: string
  ) => (
    <label className="bg-black/5 dark:bg-white/5 rounded-xl p-2 flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-widest text-tertiary">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} py-1.5`}
        />
        <span className="text-[10px] text-tertiary">{unit}</span>
      </div>
    </label>
  );

  const renderEditor = (
    draft: FoodEditDraft,
    setDraft: React.Dispatch<React.SetStateAction<FoodEditDraft | null>>,
    onSave: () => void,
    onCancel: () => void,
    isSaving: boolean
  ) => (
    <div className="flex flex-col gap-2.5">
      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-tertiary">Title</span>
        <input
          type="text"
          value={draft.food_name}
          onChange={(e) => setDraft(prev => (prev ? { ...prev, food_name: e.target.value } : prev))}
          className={inputClassName}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-tertiary">Serving</span>
        <input
          type="text"
          value={draft.serving_description}
          onChange={(e) => setDraft(prev => (prev ? { ...prev, serving_description: e.target.value } : prev))}
          className={inputClassName}
        />
      </label>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {macroInput('Calories', draft.calories, (v) => setDraft(prev => (prev ? { ...prev, calories: v } : prev)), 'kcal')}
        {macroInput('Protein', draft.protein_g, (v) => setDraft(prev => (prev ? { ...prev, protein_g: v } : prev)), 'g')}
        {macroInput('Carbs', draft.carbs_g, (v) => setDraft(prev => (prev ? { ...prev, carbs_g: v } : prev)), 'g')}
        {macroInput('Fat', draft.fat_g, (v) => setDraft(prev => (prev ? { ...prev, fat_g: v } : prev)), 'g')}
        {macroInput('Fiber', draft.fiber_g, (v) => setDraft(prev => (prev ? { ...prev, fiber_g: v } : prev)), 'g')}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-tertiary">Description</span>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft(prev => (prev ? { ...prev, description: e.target.value } : prev))}
          rows={2}
          className={inputClassName}
        />
      </label>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          type="button"
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-tertiary bg-black/5 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          type="button"
          disabled={isSaving}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 transition-colors flex items-center gap-1"
        >
          {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Save
        </button>
      </div>
    </div>
  );

  return (
    <div className="bento-card p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
          <UtensilsCrossed size={20} />
        </div>
        <div>
          <h3 className="text-tertiary text-[10px] font-bold uppercase tracking-wider">Food Tracker</h3>
          <p className="text-primary text-sm font-bold">AI-powered nutrition logging</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ---- Left: Drop Zone + Analysis ---- */}
        <div className="flex flex-col gap-4">
          {/* Drop Zone */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl cursor-pointer
                border-2 border-dashed transition-all duration-200
                ${isDragging
                  ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 scale-[1.01]'
                  : 'border-[var(--apple-text-tertiary)]/30 hover:border-[var(--apple-text-tertiary)]/50 hover:bg-black/2 dark:hover:bg-white/2'
                }
              `}
            >
              <div className={`p-3 rounded-full transition-colors ${isDragging ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-500' : 'bg-black/5 dark:bg-white/5 text-tertiary'}`}>
                <Upload size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-primary">Drop a food photo here</p>
                <p className="text-xs text-tertiary mt-0.5">or click to browse</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          ) : (
            /* Image Preview */
            <div className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5">
              <img
                src={imagePreview}
                alt="Food preview"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X size={14} />
              </button>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={28} className="animate-spin text-white" />
                  <p className="text-white text-xs font-semibold">Analyzing with {selectedModel}…</p>
                </div>
              )}
            </div>
          )}

          {/* Model Picker + Analyze Button */}
          <div className="flex gap-2">
            {/* Model selector */}
            <div className="relative flex-1" ref={modelPickerRef}>
              <button
                onClick={() => setShowModelPicker(p => !p)}
                disabled={models.length === 0}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs font-semibold text-primary hover:bg-black/8 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
              >
                <span className="truncate">{selectedModel || (models.length === 0 ? 'No models' : 'Select model')}</span>
                {selectedModel && isVisionModel(models.find(m => m.name === selectedModel) || { name: selectedModel, size: 0, parameterSize: null, family: null }) && (
                  <Eye size={12} className="text-blue-500 shrink-0" />
                )}
                <ChevronDown size={12} className="text-tertiary shrink-0" />
              </button>

              {showModelPicker && models.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--apple-card)] border border-black/5 dark:border-white/10 rounded-xl shadow-apple overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    {models.map(m => (
                      <button
                        key={m.name}
                        onClick={() => { setSelectedModel(m.name); setShowModelPicker(false); }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left ${selectedModel === m.name ? 'font-bold text-primary' : 'font-medium text-secondary'}`}
                      >
                        <span className="truncate">{m.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isVisionModel(m) && <Eye size={10} className="text-blue-500" />}
                          {m.parameterSize && <span className="text-[9px] text-tertiary">{m.parameterSize}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!imageBase64 || !selectedModel || isAnalyzing}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-white text-xs font-bold transition-colors flex items-center gap-2 shrink-0"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
              Analyze
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Analysis Result */}
          {analysisResult && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/10">
              {editingResult && resultDraft ? (
                renderEditor(
                  resultDraft,
                  setResultDraft,
                  saveResultEdit,
                  cancelEditingResult,
                  savingId === 'result'
                )
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-primary leading-tight">{analysisResult.food_name}</p>
                      {analysisResult.serving_description && (
                        <p className="text-xs text-tertiary mt-0.5">{analysisResult.serving_description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {analysisResult.confidence && (
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${confidenceBadgeClass(analysisResult.confidence)}`}>
                          {analysisResult.confidence}
                        </span>
                      )}
                      <button
                        onClick={startEditingResult}
                        type="button"
                        className="p-1.5 rounded-lg text-tertiary hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors shrink-0"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Macro Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Calories', value: analysisResult.calories != null ? `${Math.round(analysisResult.calories)}` : '—', icon: <Flame size={10} />, color: 'text-orange-500' },
                      { label: 'Protein', value: `${formatNum(analysisResult.protein_g)}g`, icon: <Beef size={10} />, color: 'text-red-500' },
                      { label: 'Carbs', value: `${formatNum(analysisResult.carbs_g)}g`, icon: <Wheat size={10} />, color: 'text-yellow-500' },
                      { label: 'Fat', value: `${formatNum(analysisResult.fat_g)}g`, icon: <Droplets size={10} />, color: 'text-blue-500' },
                      { label: 'Fiber', value: `${formatNum(analysisResult.fiber_g)}g`, icon: <Leaf size={10} />, color: 'text-green-500' },
                    ].map(({ label, value, icon, color }) => (
                      <div key={label} className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 flex flex-col gap-1">
                        <div className={`flex items-center gap-1 ${color}`}>{icon}</div>
                        <div className="text-base font-black text-primary leading-none">{value}</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-tertiary">{label}</div>
                      </div>
                    ))}
                  </div>

                  {analysisResult.description && (
                    <p className="text-xs text-secondary italic">{analysisResult.description}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ---- Right: Food Log ---- */}
        <div className="flex flex-col gap-3">
          {/* Today's macro summary */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'kcal', value: todayTotals?.total_calories != null ? Math.round(todayTotals.total_calories).toString() : '—' },
              { label: 'Protein', value: todayTotals?.total_protein != null ? `${Math.round(todayTotals.total_protein)}g` : '—' },
              { label: 'Carbs', value: todayTotals?.total_carbs != null ? `${Math.round(todayTotals.total_carbs)}g` : '—' },
              { label: 'Fat', value: todayTotals?.total_fat != null ? `${Math.round(todayTotals.total_fat)}g` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-primary leading-none">{value}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-tertiary mt-1">Today's {label}</div>
              </div>
            ))}
          </div>

          {/* Entry list */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-72 pr-1">
            {isLoadingLog ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-16 rounded-xl bg-black/5 dark:bg-white/5" />
                ))}
              </>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-tertiary">
                <UtensilsCrossed size={32} className="opacity-30" />
                <p className="text-xs font-medium">No food logged yet</p>
                <p className="text-[10px]">Drop a food photo to get started</p>
              </div>
            ) : (
              entries.map(entry => {
                const isEditingThis = editingEntryId === entry.id && entryDraft != null;

                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/10 group"
                  >
                    {isEditingThis ? (
                      renderEditor(
                        entryDraft,
                        setEntryDraft,
                        () => saveEntryEdit(entry.id),
                        cancelEditingEntry,
                        savingId === entry.id
                      )
                    ) : (
                      <div className="flex items-center gap-3">
                        {/* Thumbnail or icon */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black/5 dark:bg-white/5 flex items-center justify-center">
                          {entry.image_thumbnail ? (
                            <img src={entry.image_thumbnail} alt={entry.food_name} className="w-full h-full object-cover" />
                          ) : (
                            <UtensilsCrossed size={20} className="text-tertiary opacity-50" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-primary truncate">{entry.food_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {entry.calories != null && (
                              <span className="text-[10px] font-black text-orange-500">{Math.round(entry.calories)} kcal</span>
                            )}
                            <span className="text-[10px] text-tertiary">
                              {entry.protein_g != null ? `P ${Math.round(entry.protein_g)}g` : ''}
                              {entry.carbs_g != null ? ` · C ${Math.round(entry.carbs_g)}g` : ''}
                              {entry.fat_g != null ? ` · F ${Math.round(entry.fat_g)}g` : ''}
                            </span>
                          </div>
                          <p className="text-[9px] text-tertiary mt-0.5">{formatRelativeTime(entry.created_at)}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => startEditingEntry(entry)}
                            className="p-1.5 rounded-lg text-tertiary hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="p-1.5 rounded-lg text-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0 disabled:opacity-30"
                          >
                            {deletingId === entry.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Trash2 size={12} />
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodTrackerWidget;
