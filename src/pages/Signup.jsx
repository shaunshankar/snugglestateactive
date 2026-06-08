import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return addToast('Passwords do not match', 'error');
    if (password.length < 6) return addToast('Password must be at least 6 characters', 'error');
    setLoading(true);
    try {
      const { token, user } = await api.post('/auth?action=signup', { name, email, password });
      login(token, user);
      navigate('/');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">SnuggleState Lean</h1>
          <p className="text-gray-500 text-sm mt-1">Start your wellness journey</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-heading font-semibold text-lg text-gray-900 mb-5">Create account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Min 6 characters"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 text-sm"
            >
              {loading ? 'Creating account…' : 'Get started'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
