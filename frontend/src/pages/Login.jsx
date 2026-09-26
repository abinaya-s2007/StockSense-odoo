import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { login_id: loginId, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Login ID or Password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center text-ink font-bold">S</div>
          <span className="font-semibold text-xl text-slate-100 tracking-tight">StockSense</span>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold text-slate-100 mb-1">Sign in</h1>
          <p className="text-sm text-slate-400 mb-6">Manage receipts, deliveries and stock in one place.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Login ID or Email</label>
              <input className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-4 text-sm">
            <Link to="/forgot-password" className="text-accent hover:underline">Forgot password?</Link>
            <Link to="/signup" className="text-accent hover:underline">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
