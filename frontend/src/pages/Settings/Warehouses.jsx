import React, { useEffect, useState } from 'react';
import api from '../../api/axios.js';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ name: '', short_code: '', address: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/settings/warehouses').then((res) => setWarehouses(res.data));
  }
  useEffect(load, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/settings/warehouses', form);
      setForm({ name: '', short_code: '', address: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create warehouse.');
    }
  }

  async function remove(id) {
    await api.delete(`/settings/warehouses/${id}`);
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Warehouse</h1>
        <p className="text-sm text-slate-400">Warehouse details &amp; location.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Short Code</label>
          <input className="input" value={form.short_code} onChange={(e) => update('short_code', e.target.value)} required />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <button type="submit" className="btn-primary">Add Warehouse</button>
          {error && <span className="ml-4 text-sm text-danger">{error}</span>}
        </div>
      </form>

      <div className="card p-6 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Name</th><th>Short Code</th><th>Address</th><th></th></tr></thead>
          <tbody>
            {warehouses.map((w) => (
              <tr key={w.id}>
                <td className="text-slate-100">{w.name}</td>
                <td className="font-mono text-accent">{w.short_code}</td>
                <td className="text-slate-400">{w.address || '—'}</td>
                <td><button onClick={() => remove(w.id)} className="text-danger text-sm hover:underline">Delete</button></td>
              </tr>
            ))}
            {warehouses.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500 py-6">No warehouses yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
