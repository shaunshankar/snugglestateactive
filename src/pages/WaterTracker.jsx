import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { todayISO, formatDate } from '../lib/utils';
import ProgressRing from '../components/ProgressRing';

const CUP_AMOUNTS = [0.5, 1, 1.5, 2];
const ML_AMOUNTS = [150, 250, 350, 500];

export default function WaterTracker() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitMode, setUnitMode] = useState(user?.water_unit || 'cups');
  const [custom, setCustom] = useState('');

  const today = todayISO();
  const waterGoal = user?.daily_water_goal || 8;
  const total = entries.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await api.get(`/water?date=${today}`);
      setEntries(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function addWater(amount) {
    try {
      const entry = await api.post('/water', { amount, unit: unitMode });
      setEntries(prev => [...prev, entry]);
      setCustom('');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function deleteEntry(id) {
    try {
      await api.delete(`/water?id=${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  const quickAmounts = unitMode === 'cups' ? CUP_AMOUNTS : ML_AMOUNTS;
  const unitLabel = unitMode === 'cups' ? 'cups' : 'ml';
  const displayTotal = unitMode === 'ml' ? `${Math.round(total)}ml` : `${total.toFixed(1)} cups`;
  const displayGoal = unitMode === 'ml' ? `${waterGoal * 250}ml` : `${waterGoal} cups`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">Water Tracker</h1>
          <p className="text-gray-500 text-sm">{formatDate(today)}</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {['cups', 'ml'].map(u => (
            <button
              key={u}
              onClick={() => setUnitMode(u)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${unitMode === u ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Progress ring */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
        <ProgressRing
          value={total}
          max={unitMode === 'cups' ? waterGoal : waterGoal * 250}
          size={160}
          strokeWidth={14}
          color="#60a5fa"
          label={displayTotal}
          sublabel={`of ${displayGoal}`}
        />
        {total >= (unitMode === 'cups' ? waterGoal : waterGoal * 250) && (
          <div className="mt-3 flex items-center gap-2 text-blue-600 font-medium text-sm">
            <span>🎉</span>
            <span>Daily goal reached!</span>
          </div>
        )}
      </div>

      {/* Quick add buttons */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Add</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {quickAmounts.map(amount => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              className="bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 font-semibold py-3 rounded-xl text-sm transition-all"
            >
              +{amount}
              <span className="block text-xs font-normal text-blue-500">{unitLabel}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder={`Custom (${unitLabel})`}
            min="0"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
          <button
            onClick={() => custom && addWater(parseFloat(custom))}
            disabled={!custom}
            className="px-5 py-3 bg-blue-400 hover:bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
          >
            Add
          </button>
        </div>
      </div>

      {/* Entry log */}
      <div>
        <h2 className="font-heading font-semibold text-base text-gray-900 mb-3">Today's Log</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-2xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <p className="text-3xl mb-2">💧</p>
            <p className="font-medium text-gray-900">Stay hydrated!</p>
            <p className="text-sm text-gray-500 mt-1">Tap a quick-add button above to log your first sip.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...entries].reverse().map(entry => (
              <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-lg">
                  💧
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {entry.amount} {entry.unit}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
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
