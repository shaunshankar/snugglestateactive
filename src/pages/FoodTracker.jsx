import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { todayISO, formatDate } from '../lib/utils';
import { SkeletonList } from '../components/Skeleton';

const MODES = ['AI Estimate', 'Scan Photo', 'Manual'];

export default function FoodTracker() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('AI Estimate');

  // AI text mode
  const [description, setDescription] = useState('');

  // Image scan mode
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageMediaType, setImageMediaType] = useState('image/jpeg');
  const [imageCaption, setImageCaption] = useState('');

  // Shared
  const [estimating, setEstimating] = useState(false);
  const [preview, setPreview] = useState(null);

  // Manual mode
  const [manualDesc, setManualDesc] = useState('');
  const [manual, setManual] = useState({ calories: '', protein_g: '', carbs_g: '', fat_g: '' });

  const today = todayISO();
  const calorieGoal = user?.daily_calorie_goal || 2000;

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      setEntries(await api.get(`/food?date=${today}`));
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Resize image client-side to keep payload under ~1MB
  function resizeImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const mediaType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const data = canvas.toDataURL(mediaType, 0.85).split(',')[1];
        URL.revokeObjectURL(url);
        resolve({ data, mediaType });
      };
      img.src = url;
    });
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const { data, mediaType } = await resizeImage(file);
    setImageData(data);
    setImageMediaType(mediaType);
  }

  async function handleScanEstimate() {
    if (!imageData) return;
    setEstimating(true);
    setPreview(null);
    try {
      const data = await api.post('/ai/calories', {
        image: { data: imageData, media_type: imageMediaType },
        description: imageCaption || undefined,
      });
      setPreview(data);
    } catch (err) {
      addToast('Could not analyse image — try adding manually', 'error');
    } finally {
      setEstimating(false);
    }
  }

  async function handleTextEstimate() {
    if (!description.trim()) return;
    setEstimating(true);
    setPreview(null);
    try {
      setPreview(await api.post('/ai/calories', { description }));
    } catch (err) {
      addToast('Could not estimate — try adding manually', 'error');
      setMode('Manual');
    } finally {
      setEstimating(false);
    }
  }

  async function handleSave() {
    try {
      let desc, payload;
      if (mode === 'Manual') {
        desc = manualDesc || 'Manual entry';
        payload = { description: desc, ...manual, is_manual: true };
      } else {
        desc = mode === 'Scan Photo'
          ? (preview?.food_name || imageCaption || 'Scanned meal')
          : description;
        payload = { description: desc, ...preview, is_manual: false };
      }
      const entry = await api.post('/food', payload);
      setEntries(prev => [...prev, entry]);
      // Reset
      setDescription('');
      setPreview(null);
      setImagePreview(null);
      setImageData(null);
      setImageCaption('');
      setManualDesc('');
      setManual({ calories: '', protein_g: '', carbs_g: '', fat_g: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      addToast('Food logged!');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/food?id=${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  function switchMode(m) {
    setMode(m);
    setPreview(null);
    setDescription('');
    setImagePreview(null);
    setImageData(null);
    setImageCaption('');
  }

  const totals = entries.reduce(
    (s, e) => ({
      calories: s.calories + parseFloat(e.calories || 0),
      protein_g: s.protein_g + parseFloat(e.protein_g || 0),
      carbs_g: s.carbs_g + parseFloat(e.carbs_g || 0),
      fat_g: s.fat_g + parseFloat(e.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
  const caloriePercent = Math.min(totals.calories / calorieGoal, 1);

  const canSave = mode === 'Manual'
    ? manualDesc.trim()
    : !!preview;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Food Tracker</h1>
        <p className="text-gray-500 text-sm">{formatDate(today)}</p>
      </div>

      {/* Mode selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex gap-1.5 mb-4 bg-gray-100 rounded-xl p-1">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {m === 'Scan Photo' ? '📷 Scan' : m === 'AI Estimate' ? '✨ AI' : '✏️ Manual'}
            </button>
          ))}
        </div>

        {/* AI Estimate */}
        {mode === 'AI Estimate' && (
          <div>
            <div className="flex gap-2">
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextEstimate()}
                placeholder="e.g. 2 scrambled eggs and toast"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              <button
                onClick={handleTextEstimate}
                disabled={estimating || !description.trim()}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-all"
              >
                {estimating ? '…' : 'Estimate'}
              </button>
            </div>
          </div>
        )}

        {/* Scan Photo */}
        {mode === 'Scan Photo' && (
          <div className="space-y-3">
            {/* Drop zone / file picker */}
            {!imagePreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-green-400 rounded-2xl p-8 flex flex-col items-center gap-2 text-gray-400 hover:text-green-600 transition-all"
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <span className="font-medium text-sm">Take a photo or upload</span>
                <span className="text-xs">Tap to open camera or gallery</span>
              </button>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-52 object-cover rounded-2xl"
                />
                <button
                  onClick={() => { setImagePreview(null); setImageData(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />

            {imagePreview && (
              <>
                <input
                  value={imageCaption}
                  onChange={e => setImageCaption(e.target.value)}
                  placeholder="Optional: add context (e.g. 'large portion')"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <button
                  onClick={handleScanEstimate}
                  disabled={estimating || !imageData}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {estimating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analysing image…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      Analyse with Sonnet
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Manual */}
        {mode === 'Manual' && (
          <div className="space-y-3">
            <input
              value={manualDesc}
              onChange={e => setManualDesc(e.target.value)}
              placeholder="What did you eat?"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              {[['calories', 'Calories (kcal)'], ['protein_g', 'Protein (g)'], ['carbs_g', 'Carbs (g)'], ['fat_g', 'Fat (g)']].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input
                    type="number"
                    value={manual[key]}
                    onChange={e => setManual(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared: AI result preview */}
        {preview && (
          <div className="mt-3 bg-green-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-green-700">
                {mode === 'Scan Photo' ? '📷 Scan Result' : '✨ AI Estimate'}
              </p>
              {preview.food_name && (
                <p className="text-xs text-gray-600 font-medium truncate ml-2">{preview.food_name}</p>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="font-bold text-gray-900">{Math.round(preview.calories || 0)}</p>
                <p className="text-xs text-gray-500">kcal</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">{Math.round(preview.protein_g || 0)}g</p>
                <p className="text-xs text-gray-500">protein</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">{Math.round(preview.carbs_g || 0)}g</p>
                <p className="text-xs text-gray-500">carbs</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">{Math.round(preview.fat_g || 0)}g</p>
                <p className="text-xs text-gray-500">fat</p>
              </div>
            </div>
          </div>
        )}

        {canSave && (
          <button
            onClick={handleSave}
            className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            Add to log
          </button>
        )}
      </div>

      {/* Daily totals */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today's Total</p>
            <p className="text-sm font-semibold text-gray-900">{Math.round(totals.calories)} / {calorieGoal} kcal</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all duration-700 ${caloriePercent >= 1 ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${caloriePercent * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="font-bold text-blue-700">{Math.round(totals.protein_g)}g</p>
              <p className="text-xs text-gray-500">Protein</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="font-bold text-amber-600">{Math.round(totals.carbs_g)}g</p>
              <p className="text-xs text-gray-500">Carbs</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="font-bold text-red-500">{Math.round(totals.fat_g)}g</p>
              <p className="text-xs text-gray-500">Fat</p>
            </div>
          </div>
        </div>
      )}

      {/* Food log */}
      <div>
        <h2 className="font-heading font-semibold text-base text-gray-900 mb-3">Today's Log</h2>
        {loading ? (
          <SkeletonList count={3} />
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="font-medium text-gray-900">Nothing logged yet</p>
            <p className="text-sm text-gray-500 mt-1">Describe your meal or snap a photo to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 text-lg">
                  {entry.is_manual ? '✏️' : '🍴'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.description}</p>
                  <p className="text-xs text-gray-500">
                    {entry.calories ? `${Math.round(entry.calories)} kcal` : '—'}
                    {entry.protein_g ? ` · ${Math.round(entry.protein_g)}g protein` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
