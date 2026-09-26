import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import StatusPill from '../components/StatusPill.jsx';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ from_location_id: '', to_location_id: '', schedule_date: '', responsible: '' });
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [error, setError] = useState('');

  function load() {
    api.get('/transfers').then((res) => setTransfers(res.data));
    api.get('/settings/locations').then((res) => setLocations(res.data));
    api.get('/products').then((res) => setProducts(res.data));
  }
  useEffect(load, []);

  function updateForm(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function updateLine(idx, field, value) { setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [field]: value } : l))); }
  function addLine() { setLines((ls) => [...ls, { product_id: '', quantity: 1 }]); }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/transfers', { ...form, lines: lines.filter((l) => l.product_id) });
      setShowForm(false);
      setForm({ from_location_id: '', to_location_id: '', schedule_date: '', responsible: '' });
      setLines([{ product_id: '', quantity: 1 }]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create transfer.');
    }
  }

  async function validate(id) {
    await api.patch(`/transfers/${id}/status`, { status: 'done' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Internal Transfers</h1>
          <p className="text-sm text-slate-400">Move stock between locations inside the company.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">From Location</label>
              <select className="input" value={form.from_location_id} onChange={(e) => updateForm('from_location_id', e.target.value)} required>
                <option value="">Select</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.short_code}</option>)}
              </select>
            </div>
            <div>
              <label className="label">To Location</label>
              <select className="input" value={form.to_location_id} onChange={(e) => updateForm('to_location_id', e.target.value)} required>
                <option value="">Select</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.short_code}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Schedule Date</label>
              <input type="date" className="input" value={form.schedule_date} onChange={(e) => updateForm('schedule_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Responsible</label>
              <input className="input" value={form.responsible} onChange={(e) => updateForm('responsible', e.target.value)} />
            </div>
          </div>

          <table className="table-base mb-4">
            <thead><tr><th>Product</th><th>Quantity</th></tr></thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <select className="input" value={line.product_id} onChange={(e) => updateLine(idx, 'product_id', e.target.value)}>
                      <option value="">Select product</option>
                      {products.map((p) => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" className="input" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addLine} className="btn-ghost text-sm mb-4">+ Add New Product</button>
          <div className="flex items-center gap-4">
            <button type="submit" className="btn-primary">Create Transfer</button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </form>
      )}

      <div className="card p-6 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Reference</th><th>From</th><th>To</th><th>Schedule Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td className="text-accent font-mono">{t.reference}</td>
                <td className="font-mono text-slate-400">{t.from_code}</td>
                <td className="font-mono text-slate-400">{t.to_code}</td>
                <td className="text-slate-400">{t.schedule_date ? new Date(t.schedule_date).toLocaleDateString() : '—'}</td>
                <td><StatusPill status={t.status} /></td>
                <td>
                  {t.status !== 'done' && (
                    <button onClick={() => validate(t.id)} className="text-accent text-sm hover:underline">Validate</button>
                  )}
                </td>
              </tr>
            ))}
            {transfers.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-6">No transfers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
