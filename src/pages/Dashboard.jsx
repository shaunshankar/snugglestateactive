import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getGreeting, formatDate, todayISO, weightDiff, formatWeight } from '../lib/utils';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [weights, setWeights] = useState([]);
  const [todayFood, setTodayFood] = useState([]);
  const [todayWater, setTodayWater] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = todayISO();

  useEffect(() => {
    async function load() {
      try {
        const [w, f, wa, g] = await Promise.all([
          api.get('/weight'),
          api.get(`/food?date=${today}`),
          api.get(`/water?date=${today}`),
          api.get('/goals'),
        ]);
        setWeights(w);
        setTodayFood(f);
        setTodayWater(wa);
        setGoals(g);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    load();

    // Show unread cheer notifications
    api.get('/notifications').then(notifs => {
      const unread = notifs.filter(n => !n.is_read);
      if (unread.length > 0) {
        unread.forEach(n => addToast(n.message + ' 👏', 'info'));
        api.patch('/notifications').catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const currentWeight = weights[0]?.weight;
  const startWeight = weights[weights.length - 1]?.weight;
  const weightUnit = weights[0]?.unit || user?.unit || 'kg';
  const diff = weightDiff(currentWeight, startWeight);

  const totalCalories = todayFood.reduce((s, e) => s + parseFloat(e.calories || 0), 0);
  const calorieGoal = goals?.daily?.calorie_goal || user?.daily_calorie_goal || 2000;

  const totalWater = todayWater.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const waterGoal = goals?.daily?.water_goal || user?.daily_water_goal || 8;
  const waterUnit = user?.water_unit || 'cups';

  const streak = goals?.streak || 0;

  const chartData = [...weights]
    .reverse()
    .slice(-30)
    .map(w => ({
      date: formatDate(w.date),
      weight: parseFloat(w.weight),
    }));

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const caloriePercent = Math.min(totalCalories / calorieGoal, 1);
  const waterPercent = Math.min(totalWater / waterGoal, 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">
            {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(today)}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Weight summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Weight</p>
        <div className="flex items-end gap-4">
          <div>
            <p className="font-heading font-bold text-3xl text-gray-900">
              {currentWeight ? formatWeight(currentWeight, weightUnit) : '—'}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">Current weight</p>
          </div>
          {diff !== null && (
            <div className={`flex items-center gap-1 text-sm font-semibold mb-1 ${diff < 0 ? 'text-green-600' : 'text-orange-500'}`}>
              <span>{diff < 0 ? '↓' : '↑'}</span>
              <span>{Math.abs(diff).toFixed(1)} {weightUnit}</span>
              <span className="text-gray-400 font-normal">total</span>
            </div>
          )}
        </div>
        {startWeight && (
          <p className="text-xs text-gray-400 mt-1">Started at {formatWeight(startWeight, weightUnit)}</p>
        )}
      </div>

      {/* Weight chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">30-Day Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(v) => [`${v} ${weightUnit}`, 'Weight']}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's progress */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calories */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-green-100 transition-colors" onClick={() => navigate('/food')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Calories</p>
            <span className="text-lg">🍽️</span>
          </div>
          <p className="font-heading font-bold text-xl text-gray-900">{Math.round(totalCalories)}</p>
          <p className="text-xs text-gray-400 mb-2">of {calorieGoal} kcal</p>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${caloriePercent >= 1 ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${caloriePercent * 100}%` }}
            />
          </div>
        </div>

        {/* Water */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-green-100 transition-colors" onClick={() => navigate('/water')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Water</p>
            <span className="text-lg">💧</span>
          </div>
          <p className="font-heading font-bold text-xl text-gray-900">{totalWater.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mb-2">of {waterGoal} {waterUnit}</p>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${waterPercent * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-sm shadow-green-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <p className="font-heading font-bold text-2xl">{streak} day{streak !== 1 ? 's' : ''}</p>
            <p className="text-green-100 text-sm">Current streak</p>
          </div>
        </div>
        {streak === 0 && (
          <p className="text-green-100 text-sm mt-2">Hit your goals today to start a streak!</p>
        )}
      </div>

      {/* Empty state for new users */}
      {weights.length === 0 && (
        <div className="bg-white rounded-2xl p-6 border border-dashed border-gray-200 text-center">
          <p className="text-2xl mb-2">👋</p>
          <p className="font-medium text-gray-900">Welcome to SnuggleState Lean!</p>
          <p className="text-sm text-gray-500 mt-1">Log your first weight entry to get started on your journey.</p>
          <button
            onClick={() => navigate('/weight')}
            className="mt-4 bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-600 transition-colors"
          >
            Log weight
          </button>
        </div>
      )}
    </div>
  );
}
