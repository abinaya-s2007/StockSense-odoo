import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const [form, setForm] = useState({ name: '', login_id: '', email: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', form);
      login(res.data.token, { name: form.name, email: form.email });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center text-ink font-bold">S</div>
          <span className="font-semibold text-xl text-slate-100 tracking-tight">StockSense</span>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold text-slate-100 mb-1">Create your account</h1>
          <p className="text-sm text-slate-400 mb-6">Login ID: 6–12 characters. Password needs upper, lower &amp; special character.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Login ID</label>
              <input className="input" value={form.login_id} onChange={(e) => update('login_id', e.target.value)} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={(e) => update('password', e.target.value)} required />
            </div>
            <div>
              <label className="label">Re-enter Password</label>
              <input type="password" className="input" value={form.confirm_password} onChange={(e) => update('confirm_password', e.target.value)} required />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <p className="text-sm text-slate-400 mt-4 text-center">
            Already have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
