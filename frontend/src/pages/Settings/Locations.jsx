import React, { useEffect, useState } from 'react';
import api from '../../api/axios.js';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ warehouse_id: '', name: '', short_code: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/settings/locations').then((res) => setLocations(res.data));
    api.get('/settings/warehouses').then((res) => setWarehouses(res.data));
  }
  useEffect(load, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/settings/locations', form);
      setForm({ warehouse_id: '', name: '', short_code: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create location.');
    }
  }

  async function remove(id) {
    await api.delete(`/settings/locations/${id}`);
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Locations</h1>
        <p className="text-sm text-slate-400">Rooms, racks and stock areas inside each warehouse.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="label">Warehouse</label>
          <select className="input" value={form.warehouse_id} onChange={(e) => update('warehouse_id', e.target.value)} required>
            <option value="">Select warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.short_code})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Short Code</label>
          <input className="input" placeholder="e.g. WH/Stock1" value={form.short_code} onChange={(e) => update('short_code', e.target.value)} required />
        </div>
        <div>
          <button type="submit" className="btn-primary">Add Location</button>
        </div>
        {error && <p className="md:col-span-4 text-sm text-danger">{error}</p>}
      </form>

      <div className="card p-6 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Warehouse</th><th>Name</th><th>Short Code</th><th></th></tr></thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id}>
                <td className="text-slate-300">{l.warehouse_name} ({l.warehouse_code})</td>
                <td className="text-slate-100">{l.name}</td>
                <td className="font-mono text-accent">{l.short_code}</td>
                <td><button onClick={() => remove(l.id)} className="text-danger text-sm hover:underline">Delete</button></td>
              </tr>
            ))}
            {locations.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500 py-6">No locations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
