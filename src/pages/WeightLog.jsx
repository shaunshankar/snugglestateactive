import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { formatDate, todayISO } from '../lib/utils';
import { SkeletonList } from '../components/Skeleton';

export default function WeightLog() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState(user?.unit || 'kg');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await api.get('/weight');
      setEntries(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLog() {
    if (!weight) return addToast('Enter a weight value', 'error');
    try {
      const entry = await api.post('/weight', {
        weight: parseFloat(weight),
        unit,
        date: todayISO(),
        notes: notes || null,
      });
      setEntries(prev => [entry, ...prev]);
      setWeight('');
      setNotes('');
      addToast('Weight logged!');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/weight?id=${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleEdit(id) {
    try {
      const updated = await api.patch(`/weight?id=${id}`, {
        weight: parseFloat(editWeight),
        notes: editNotes || null,
      });
      setEntries(prev => prev.map(e => e.id === id ? updated : e));
      setEditingId(null);
      addToast('Entry updated!');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditWeight(entry.weight);
    setEditNotes(entry.notes || '');
  }

  const latest = entries[0];
  const start = entries[entries.length - 1];
  const diff = latest && start && latest.id !== start.id
    ? parseFloat(latest.weight) - parseFloat(start.weight)
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Weight Log</h1>
        <p className="text-gray-500 text-sm">Track your progress over time</p>
      </div>

      {/* Stats row */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
            <p className="font-heading font-bold text-lg text-gray-900">{parseFloat(latest.weight).toFixed(1)}</p>
            <p className="text-xs text-gray-500">{unit} now</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
            <p className="font-heading font-bold text-lg text-gray-900">{parseFloat(start.weight).toFixed(1)}</p>
            <p className="text-xs text-gray-500">{unit} start</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
            <p className={`font-heading font-bold text-lg ${diff !== null ? (diff < 0 ? 'text-green-600' : 'text-orange-500') : 'text-gray-900'}`}>
              {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}
            </p>
            <p className="text-xs text-gray-500">{unit} change</p>
          </div>
        </div>
      )}

      {/* Log entry form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-heading font-semibold text-base text-gray-900 mb-4">Log Today's Weight</h2>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex gap-2">
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 78.5"
              step="0.1"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <div className="flex bg-gray-100 rounded-xl p-1">
              {['kg', 'lbs'].map(u => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${unit === u ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm mb-3"
        />
        <button
          onClick={handleLog}
          disabled={!weight}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-60"
        >
          Log weight
        </button>
      </div>

      {/* History */}
      <div>
        <h2 className="font-heading font-semibold text-base text-gray-900 mb-3">History</h2>
        {loading ? (
          <SkeletonList count={5} />
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <p className="text-3xl mb-2">⚖️</p>
            <p className="font-medium text-gray-900">No entries yet</p>
            <p className="text-sm text-gray-500 mt-1">Log your first weight reading above to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                {editingId === entry.id ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={editWeight}
                      onChange={e => setEditWeight(e.target.value)}
                      step="0.1"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <input
                      type="text"
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Notes"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(entry.id)}
                        className="flex-1 bg-green-500 text-white text-sm font-medium py-2 rounded-xl"
                      >Save</button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-gray-100 text-gray-600 text-sm font-medium py-2 rounded-xl"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${i === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {i === 0 ? '📍' : parseFloat(entry.weight).toFixed(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{parseFloat(entry.weight).toFixed(1)} {entry.unit}</p>
                      <p className="text-xs text-gray-400">{formatDate(entry.date)}{entry.notes ? ` · ${entry.notes}` : ''}</p>
                    </div>
                    {i > 0 && entries[i - 1] && (
                      <div className={`text-xs font-semibold flex-shrink-0 ${parseFloat(entry.weight) < parseFloat(entries[i - 1].weight) ? 'text-green-500' : 'text-orange-400'}`}>
                        {(parseFloat(entry.weight) - parseFloat(entries[i - 1].weight) > 0 ? '+' : '') +
                          (parseFloat(entry.weight) - parseFloat(entries[i - 1].weight)).toFixed(1)}
                      </div>
                    )}
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(entry)} className="text-gray-300 hover:text-green-500 transition-colors p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
