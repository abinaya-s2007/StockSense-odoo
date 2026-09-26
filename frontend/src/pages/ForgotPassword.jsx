import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function requestOtp(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      setDevOtp(res.data.dev_otp || '');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send OTP.');
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      setMessage('Password reset. Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password.');
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
          {step === 1 ? (
            <>
              <h1 className="text-lg font-semibold text-slate-100 mb-1">Reset password</h1>
              <p className="text-sm text-slate-400 mb-6">We'll send a one-time code to your email.</p>
              <form onSubmit={requestOtp} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <button type="submit" className="btn-primary w-full">Send code</button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-slate-100 mb-1">Enter code</h1>
              <p className="text-sm text-slate-400 mb-2">{message}</p>
              {devOtp && (
                <p className="text-xs text-warn mb-4">Dev mode — your code: <span className="font-mono">{devOtp}</span></p>
              )}
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="label">OTP Code</label>
                  <input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <button type="submit" className="btn-primary w-full">Reset password</button>
              </form>
            </>
          )}
          <p className="text-sm text-slate-400 mt-4 text-center">
            <Link to="/login" className="text-accent hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
