import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ product_id: '', location_id: '', counted_qty: '', reason: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api.get('/adjustments').then((res) => setAdjustments(res.data));
    api.get('/products').then((res) => setProducts(res.data));
    api.get('/settings/locations').then((res) => setLocations(res.data));
  }
  useEffect(load, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.post('/adjustments', form);
      setMessage(`Recorded. Adjustment: ${res.data.difference >= 0 ? '+' : ''}${res.data.difference}`);
      setForm({ product_id: '', location_id: '', counted_qty: '', reason: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record adjustment.');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Stock Adjustments</h1>
        <p className="text-sm text-slate-400">Fix mismatches between recorded stock and physical count.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="label">Product</label>
          <select className="input" value={form.product_id} onChange={(e) => update('product_id', e.target.value)} required>
            <option value="">Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <select className="input" value={form.location_id} onChange={(e) => update('location_id', e.target.value)} required>
            <option value="">Select location</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.short_code}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Counted Quantity</label>
          <input type="number" className="input" value={form.counted_qty} onChange={(e) => update('counted_qty', e.target.value)} required />
        </div>
        <div>
          <label className="label">Reason (optional)</label>
          <input className="input" value={form.reason} onChange={(e) => update('reason', e.target.value)} />
        </div>
        <div className="md:col-span-4">
          <button type="submit" className="btn-primary">Apply Adjustment</button>
          {message && <span className="ml-4 text-sm text-accent2">{message}</span>}
          {error && <span className="ml-4 text-sm text-danger">{error}</span>}
        </div>
      </form>

      <div className="card p-6 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Product</th><th>Location</th><th>Recorded</th><th>Counted</th><th>Difference</th><th>Date</th></tr>
          </thead>
          <tbody>
            {adjustments.map((a) => (
              <tr key={a.id}>
                <td className="text-slate-100">[{a.sku}] {a.product_name}</td>
                <td className="font-mono text-slate-400">{a.location_code}</td>
                <td className="text-slate-300">{a.recorded_qty}</td>
                <td className="text-slate-300">{a.counted_qty}</td>
                <td className={Number(a.difference) < 0 ? 'text-danger font-medium' : 'text-accent2 font-medium'}>
                  {Number(a.difference) > 0 ? '+' : ''}{a.difference}
                </td>
                <td className="text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {adjustments.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-6">No adjustments logged.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
