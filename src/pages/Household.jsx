import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { initials, formatWeight } from '../lib/utils';
import ProgressRing from '../components/ProgressRing';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '../lib/utils';

export default function Household() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('members');
  const [viewingMember, setViewingMember] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadHousehold();
  }, []);

  async function loadHousehold() {
    setLoading(true);
    try {
      const data = await api.get('/household');
      setHousehold(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function createHousehold() {
    if (!householdName.trim()) return addToast('Household name required', 'error');
    setCreating(true);
    try {
      await api.post('/household', { name: householdName });
      await loadHousehold();
      addToast('Household created!');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function joinHousehold() {
    if (!inviteCode.trim()) return addToast('Enter invite code', 'error');
    setJoining(true);
    try {
      await api.post('/household/join', { invite_code: inviteCode.trim() });
      await loadHousehold();
      addToast('Joined household!');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setJoining(false);
    }
  }

  async function leaveHousehold() {
    if (!confirm('Leave this household?')) return;
    try {
      await api.delete('/household/leave');
      setHousehold(null);
      updateUser({ household_id: null });
      addToast('Left household');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function viewMember(memberId) {
    if (memberId === user.id) {
      addToast("That's you! 😄", 'info');
      return;
    }
    setViewingMember(memberId);
    setProfileLoading(true);
    setTab('profile');
    try {
      const data = await api.get(`/household/member/${memberId}`);
      setMemberProfile(data);
    } catch (err) {
      addToast(err.message, 'error');
      setTab('members');
    } finally {
      setProfileLoading(false);
    }
  }

  async function sendCheer(memberId) {
    try {
      await api.post(`/household/cheer/${memberId}`, {});
      addToast('Cheer sent! 👏');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  // No household — setup screen
  if (!household) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">Household</h1>
          <p className="text-gray-500 text-sm">Connect with your wellness circle</p>
        </div>

        <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-gray-200">
          <p className="text-4xl mb-3">🏠</p>
          <p className="font-medium text-gray-900">No household yet</p>
          <p className="text-sm text-gray-500 mt-1">Create one or join with an invite code</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-heading font-semibold text-base">Create a household</h2>
          <input
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
            placeholder="e.g. The Smith Family"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
          <button
            onClick={createHousehold}
            disabled={creating}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 transition-all"
          >
            {creating ? 'Creating…' : 'Create household'}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-heading font-semibold text-base">Join with invite code</h2>
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="8-character code"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
          />
          <button
            onClick={joinHousehold}
            disabled={joining}
            className="w-full border border-green-300 text-green-700 hover:bg-green-50 font-semibold py-3 rounded-xl text-sm disabled:opacity-60 transition-all"
          >
            {joining ? 'Joining…' : 'Join household'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">{household.name}</h1>
          <p className="text-gray-500 text-sm">{household.members?.length || 0} member{household.members?.length !== 1 ? 's' : ''}</p>
        </div>
        {tab === 'profile' && (
          <button
            onClick={() => { setTab('members'); setViewingMember(null); setMemberProfile(null); }}
            className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* Invite code card */}
      {tab === 'members' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-medium text-green-700 mb-1">Invite code</p>
            <p className="font-mono font-bold text-green-900 text-lg tracking-widest">{household.invite_code}</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(household.invite_code); addToast('Invite code copied!'); }}
            className="bg-green-500 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-green-600 transition-all"
          >
            Copy
          </button>
        </div>
      )}

      {/* Member profile view */}
      {tab === 'profile' && (
        <>
          {profileLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-40 rounded-2xl" />
            </div>
          ) : memberProfile ? (
            <MemberProfile
              profile={memberProfile}
              onCheer={() => sendCheer(viewingMember)}
              weightUnit={user?.unit || 'kg'}
            />
          ) : null}
        </>
      )}

      {/* Members list */}
      {tab === 'members' && (
        <div className="space-y-3">
          {household.members?.map(member => {
            const diff = member.current_weight && member.starting_weight
              ? parseFloat(member.current_weight) - parseFloat(member.starting_weight)
              : null;
            const isMe = member.id === user.id;
            return (
              <div key={member.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 font-bold font-heading text-sm flex items-center justify-center flex-shrink-0">
                    {initials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                      {isMe && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">You</span>}
                      {member.role === 'owner' && <span className="text-xs text-gray-400">Owner</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      {member.current_weight && <span>⚖️ {parseFloat(member.current_weight).toFixed(1)} {member.weight_unit || 'kg'}</span>}
                      {diff !== null && (
                        <span className={diff < 0 ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      )}
                      {member.streak > 0 && <span>🔥 {member.streak}d</span>}
                    </div>
                  </div>
                  {!isMe && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => sendCheer(member.id)}
                        className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 text-xs font-medium px-3 py-2 rounded-xl transition-all"
                      >
                        👏
                      </button>
                      <button
                        onClick={() => viewMember(member.id)}
                        className="bg-gray-50 text-gray-600 hover:bg-gray-100 text-xs font-medium px-3 py-2 rounded-xl transition-all"
                      >
                        View
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leave household */}
      {tab === 'members' && (
        <button
          onClick={leaveHousehold}
          className="w-full text-red-400 hover:text-red-600 text-sm font-medium py-2 transition-colors"
        >
          Leave household
        </button>
      )}
    </div>
  );
}

function MemberProfile({ profile, onCheer, weightUnit }) {
  const { user, weights, todayFood, todayWater, streak, monthlyGoals } = profile;

  const chartData = [...(weights || [])].slice(-20).map(w => ({
    date: formatDate(w.date),
    weight: parseFloat(w.weight),
  }));

  const latestGoal = monthlyGoals?.[0];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-700 font-bold font-heading flex items-center justify-center text-lg">
            {initials(user.name)}
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-gray-900">{user.name}</h2>
            {streak?.streak > 0 && <p className="text-sm text-gray-500">🔥 {streak.streak} day streak</p>}
          </div>
          <button
            onClick={onCheer}
            className="ml-auto bg-yellow-50 border border-yellow-200 text-yellow-600 hover:bg-yellow-100 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            👏 Cheer
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-bold text-gray-900">{Math.round(todayFood?.total_calories || 0)}</p>
            <p className="text-xs text-gray-500">kcal today</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="font-bold text-gray-900">{parseFloat(todayWater?.total_water || 0).toFixed(1)}</p>
            <p className="text-xs text-gray-500">water today</p>
          </div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Weight Trend</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: 11 }} />
              <Line type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {latestGoal && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Monthly Goal</p>
          <p className="text-sm text-gray-900 font-medium">
            Lose {latestGoal.weight_loss_target} {weightUnit}
            {latestGoal.achieved && ' ✅'}
          </p>
          {latestGoal.reward_amount && (
            <p className="text-xs text-gray-500 mt-0.5">Reward: ${latestGoal.reward_amount} AUD</p>
          )}
        </div>
      )}
    </div>
  );
}
