import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getCurrentMonth, formatMonth, todayISO } from '../lib/utils';
import ProgressRing from '../components/ProgressRing';

export default function Goals() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [tab, setTab] = useState('daily');
  const [dailyGoal, setDailyGoal] = useState(null);
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  const [calorieGoal, setCalorieGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [weightTarget, setWeightTarget] = useState('');

  const [newMonth, setNewMonth] = useState(getCurrentMonth());
  const [newTarget, setNewTarget] = useState('');
  const [newReward, setNewReward] = useState('');
  const [newStartWeight, setNewStartWeight] = useState('');
  const [savingMonthly, setSavingMonthly] = useState(false);

  const today = todayISO();

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const [g, mg] = await Promise.all([
        api.get('/goals'),
        api.get('/goals?type=monthly'),
      ]);
      setDailyGoal(g.daily);
      setStreak(g.streak || 0);
      setMonthlyGoals(mg);

      if (g.daily) {
        setCalorieGoal(g.daily.calorie_goal || user?.daily_calorie_goal || '');
        setWaterGoal(g.daily.water_goal || user?.daily_water_goal || '');
        setWeightTarget(g.daily.weight_target || user?.weight_target || '');
      } else {
        setCalorieGoal(user?.daily_calorie_goal || '');
        setWaterGoal(user?.daily_water_goal || '');
        setWeightTarget(user?.weight_target || '');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveDailyGoals() {
    try {
      await api.post('/goals', {
        calorie_goal: parseFloat(calorieGoal) || null,
        water_goal: parseFloat(waterGoal) || null,
        weight_target: parseFloat(weightTarget) || null,
      });
      await api.patch('/user', {
        daily_calorie_goal: parseFloat(calorieGoal) || null,
        daily_water_goal: parseFloat(waterGoal) || null,
        weight_target: parseFloat(weightTarget) || null,
      });
      updateUser({
        daily_calorie_goal: parseFloat(calorieGoal) || user?.daily_calorie_goal,
        daily_water_goal: parseFloat(waterGoal) || user?.daily_water_goal,
        weight_target: parseFloat(weightTarget) || user?.weight_target,
      });
      addToast('Goals updated!');
      await checkAndCelebrate();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function checkAndCelebrate() {
    try {
      const [food, water] = await Promise.all([
        api.get(`/food?date=${today}`),
        api.get(`/water?date=${today}`),
      ]);
      const totalCal = food.reduce((s, e) => s + parseFloat(e.calories || 0), 0);
      const totalWater = water.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const cGoal = parseFloat(calorieGoal) || 2000;
      const wGoal = parseFloat(waterGoal) || 8;

      if (totalCal > 0 && totalCal <= cGoal && totalWater >= wGoal) {
        const newStreak = streak + 1;
        await api.post('/goals', { goals_met: true, streak_count: newStreak });
        setStreak(newStreak);

        const currentMonthGoal = monthlyGoals.find(g => g.month === getCurrentMonth());
        const monthPercent = currentMonthGoal
          ? Math.min((currentMonthGoal.weight_loss_target > 0 ? 50 : 0), 100)
          : 0;

        const { quote } = await api.post('/ai/quote', { streak: newStreak, monthlyPercent: monthPercent });
        setMotivationalQuote(quote);
        setShowCelebration(true);

        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#22c55e', '#16a34a', '#bbf7d0'] });
      }
    } catch {
      // Non-critical
    }
  }

  async function saveMonthlyGoal() {
    if (!newTarget) return addToast('Weight loss target required', 'error');
    setSavingMonthly(true);
    try {
      const goal = await api.post('/goals?type=monthly', {
        month: newMonth,
        weight_loss_target: parseFloat(newTarget),
        reward_amount: parseFloat(newReward) || null,
        starting_weight: parseFloat(newStartWeight) || null,
      });
      setMonthlyGoals(prev => {
        const idx = prev.findIndex(g => g.month === goal.month);
        if (idx >= 0) { const next = [...prev]; next[idx] = goal; return next; }
        return [goal, ...prev];
      });
      setNewTarget('');
      setNewReward('');
      setNewStartWeight('');
      addToast('Monthly goal saved!');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingMonthly(false);
    }
  }

  async function markAchieved(goal) {
    try {
      const updated = await api.patch(`/goals?type=monthly&id=${goal.id}`, { achieved: true });
      setMonthlyGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#22c55e', '#f59e0b', '#3b82f6'] });
      addToast(`🎉 Goal achieved! You earned $${goal.reward_amount || 0}!`);
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function markRewardClaimed(goal) {
    try {
      const updated = await api.patch(`/goals?type=monthly&id=${goal.id}`, { reward_claimed: true });
      setMonthlyGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
      addToast('Reward claimed — you earned it! 🎊');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-5">
      {showCelebration && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCelebration(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-heading font-bold text-2xl text-gray-900 mb-2">Goals Crushed!</h2>
            <p className="text-green-600 font-semibold mb-3">🔥 {streak} day streak!</p>
            {motivationalQuote && (
              <p className="text-gray-600 text-sm italic mb-6">"{motivationalQuote}"</p>
            )}
            <button
              onClick={() => setShowCelebration(false)}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Keep it up!
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Goals</h1>
        <p className="text-gray-500 text-sm">Set targets and track your progress</p>
      </div>

      {/* Streak banner */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 text-white flex items-center gap-3">
        <span className="text-3xl">🔥</span>
        <div>
          <p className="font-heading font-bold text-xl">{streak} day streak</p>
          <p className="text-green-100 text-xs">Keep hitting your daily goals!</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {['daily', 'monthly'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-heading font-semibold text-base text-gray-900">Daily Goals</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Calorie limit (kcal)</label>
            <input
              type="number"
              value={calorieGoal}
              onChange={e => setCalorieGoal(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Water goal ({user?.water_unit || 'cups'})
            </label>
            <input
              type="number"
              value={waterGoal}
              onChange={e => setWaterGoal(e.target.value)}
              placeholder="e.g. 8"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Weight target ({user?.unit || 'kg'})
            </label>
            <input
              type="number"
              value={weightTarget}
              onChange={e => setWeightTarget(e.target.value)}
              placeholder="e.g. 75"
              step="0.1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <button
            onClick={saveDailyGoals}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            Save goals & check progress
          </button>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="space-y-4">
          {/* Add new monthly goal */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-heading font-semibold text-base text-gray-900">Set Monthly Goal</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
              <input
                type="month"
                value={newMonth}
                onChange={e => setNewMonth(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Weight loss target ({user?.unit || 'kg'})
              </label>
              <input
                type="number"
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                placeholder="e.g. 2"
                step="0.1"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reward (AUD $)</label>
                <input
                  type="number"
                  value={newReward}
                  onChange={e => setNewReward(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start weight</label>
                <input
                  type="number"
                  value={newStartWeight}
                  onChange={e => setNewStartWeight(e.target.value)}
                  placeholder={user?.unit || 'kg'}
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>
            <button
              onClick={saveMonthlyGoal}
              disabled={savingMonthly}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-60"
            >
              {savingMonthly ? 'Saving…' : 'Save monthly goal'}
            </button>
          </div>

          {/* Monthly goal list */}
          {monthlyGoals.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
              <p className="text-3xl mb-2">🎯</p>
              <p className="font-medium text-gray-900">No monthly goals yet</p>
              <p className="text-sm text-gray-500 mt-1">Set a target above to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyGoals.map(goal => (
                <div key={goal.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${goal.achieved ? 'border-green-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{formatMonth(goal.month)}</p>
                      <p className="text-sm text-gray-500">
                        Lose {goal.weight_loss_target} {user?.unit || 'kg'}
                        {goal.reward_amount ? ` · $${goal.reward_amount} reward` : ''}
                      </p>
                    </div>
                    {goal.achieved && <span className="text-2xl">✅</span>}
                  </div>

                  {goal.starting_weight && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Starting: {goal.starting_weight} {user?.unit || 'kg'}</span>
                        <span>Target loss: {goal.weight_loss_target} {user?.unit || 'kg'}</span>
                      </div>
                    </div>
                  )}

                  {goal.achieved && goal.reward_amount && !goal.reward_claimed && (
                    <div className="bg-amber-50 rounded-xl p-3 mb-3 text-center">
                      <p className="text-amber-700 font-semibold text-sm">
                        🎉 You earned ${goal.reward_amount} AUD — treat yourself!
                      </p>
                      <button
                        onClick={() => markRewardClaimed(goal)}
                        className="mt-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                      >
                        Mark reward claimed
                      </button>
                    </div>
                  )}
                  {goal.reward_claimed && (
                    <p className="text-xs text-gray-400 text-center">🎊 Reward claimed!</p>
                  )}

                  {!goal.achieved && (
                    <button
                      onClick={() => markAchieved(goal)}
                      className="w-full border border-green-300 text-green-700 hover:bg-green-50 font-medium py-2.5 rounded-xl text-sm transition-all"
                    >
                      Mark as achieved
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
