import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    sku: '', name: '', category: '', uom: 'Unit', per_unit_cost: '', reorder_min: '',
    initial_stock: '', location_id: ''
  });
  const [error, setError] = useState('');

  function load() {
    api.get('/products').then((res) => setProducts(res.data));
    api.get('/settings/locations').then((res) => setLocations(res.data));
  }

  useEffect(load, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/products', form);
      setShowForm(false);
      setForm({ sku: '', name: '', category: '', uom: 'Unit', per_unit_cost: '', reorder_min: '', initial_stock: '', location_id: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create product.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Products</h1>
          <p className="text-sm text-slate-400">Stock availability per location.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">SKU / Code</label>
            <input className="input" value={form.sku} onChange={(e) => update('sku', e.target.value)} required />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => update('category', e.target.value)} />
          </div>
          <div>
            <label className="label">Unit of Measure</label>
            <input className="input" value={form.uom} onChange={(e) => update('uom', e.target.value)} />
          </div>
          <div>
            <label className="label">Per Unit Cost (Rs)</label>
            <input type="number" step="0.01" className="input" value={form.per_unit_cost} onChange={(e) => update('per_unit_cost', e.target.value)} />
          </div>
          <div>
            <label className="label">Reorder Minimum</label>
            <input type="number" className="input" value={form.reorder_min} onChange={(e) => update('reorder_min', e.target.value)} />
          </div>
          <div>
            <label className="label">Initial Stock (optional)</label>
            <input type="number" className="input" value={form.initial_stock} onChange={(e) => update('initial_stock', e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input" value={form.location_id} onChange={(e) => update('location_id', e.target.value)}>
              <option value="">Select location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.short_code}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex items-center gap-4">
            <button type="submit" className="btn-primary">Save Product</button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </form>
      )}

      <div className="card p-6 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>Per Unit Cost</th>
              <th>On Hand</th>
              <th>Free to Use</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-slate-400">{p.sku}</td>
                <td className="text-slate-100">{p.name}</td>
                <td className="text-slate-400">{p.category || '—'}</td>
                <td className="text-slate-300">{Number(p.per_unit_cost).toLocaleString()} Rs</td>
                <td className="text-slate-300">{p.on_hand}</td>
                <td className={Number(p.free_to_use) <= (p.reorder_min || 0) ? 'text-danger font-medium' : 'text-accent2 font-medium'}>
                  {p.free_to_use}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-6">No products yet. Create your first product.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
