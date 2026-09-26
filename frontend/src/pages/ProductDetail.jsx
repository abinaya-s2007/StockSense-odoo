import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios.js';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saveError, setSaveError] = useState('');

  function load() {
    api.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setError('Could not load this product.'));
  }

  useEffect(load, [id]);

  function startEdit() {
    setSaveError('');
    setEditForm({
      name: product.name,
      category: product.category || '',
      uom: product.uom,
      per_unit_cost: product.per_unit_cost,
      reorder_min: product.reorder_min
    });
    setEditing(true);
  }

  function updateEditField(field, value) {
    setEditForm((f) => ({ ...f, [field]: value }));
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaveError('');
    try {
      await api.put(`/products/${id}`, editForm);
      setEditing(false);
      load();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Could not update product.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${id}`);
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete product.');
    }
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-danger mb-4">{error}</p>
        <Link to="/products" className="text-accent text-sm hover:underline">&larr; Back to Products</Link>
      </div>
    );
  }

  if (!product) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const totalOnHand = product.stock_by_location.reduce((sum, s) => sum + Number(s.qty_on_hand), 0);
  const totalReserved = product.stock_by_location.reduce((sum, s) => sum + Number(s.qty_reserved), 0);
  const totalFree = totalOnHand - totalReserved;
  const isLow = totalFree <= (product.reorder_min || 0);

  return (
    <div>
      <Link to="/products" className="text-accent text-sm hover:underline">&larr; Back to Products</Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">[{product.sku}] {product.name}</h1>
          <p className="text-sm text-slate-400">{product.category || 'Uncategorized'} · {product.uom}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => (editing ? setEditing(false) : startEdit())}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveEdit} className="card p-6 mb-6 grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={editForm.name} onChange={(e) => updateEditField('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={editForm.category} onChange={(e) => updateEditField('category', e.target.value)} />
          </div>
          <div>
            <label className="label">Unit of Measure</label>
            <input className="input" value={editForm.uom} onChange={(e) => updateEditField('uom', e.target.value)} />
          </div>
          <div>
            <label className="label">Per Unit Cost (Rs)</label>
            <input type="number" step="0.01" className="input" value={editForm.per_unit_cost} onChange={(e) => updateEditField('per_unit_cost', e.target.value)} />
          </div>
          <div>
            <label className="label">Reorder Minimum</label>
            <input type="number" className="input" value={editForm.reorder_min} onChange={(e) => updateEditField('reorder_min', e.target.value)} />
          </div>
          <div className="md:col-span-3 flex items-center gap-4">
            <button type="submit" className="btn-primary">Save Changes</button>
            {saveError && <p className="text-sm text-danger">{saveError}</p>}
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">On Hand</p>
          <p className="text-2xl font-semibold text-slate-100">{totalOnHand}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Reserved</p>
          <p className="text-2xl font-semibold text-slate-100">{totalReserved}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Free to Use</p>
          <p className={`text-2xl font-semibold ${isLow ? 'text-danger' : 'text-accent2'}`}>{totalFree}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Per Unit Cost</p>
          <p className="text-2xl font-semibold text-slate-100">{Number(product.per_unit_cost).toLocaleString()} Rs</p>
        </div>
      </div>

      {isLow && (
        <div className="card p-4 mb-6 border-danger/40 bg-danger/10 flex items-center justify-between gap-4">
          <p className="text-sm text-danger">
            Free-to-use stock ({totalFree}) is at or below the reorder minimum ({product.reorder_min}).
          </p>
          <Link
            to={`/operations/receipts/new?product_id=${product.id}&qty=${Math.max(product.reorder_min, 1)}`}
            className="btn-primary whitespace-nowrap"
          >
            Create Receipt
          </Link>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-slate-100 mb-4">Stock by Location</h2>
        <table className="table-base">
          <thead>
            <tr><th>Location</th><th>On Hand</th><th>Reserved</th><th>Free to Use</th></tr>
          </thead>
          <tbody>
            {product.stock_by_location.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-slate-300">{s.location_code}</td>
                <td className="text-slate-300">{s.qty_on_hand}</td>
                <td className="text-slate-400">{s.qty_reserved}</td>
                <td className="text-accent2 font-medium">{Number(s.qty_on_hand) - Number(s.qty_reserved)}</td>
              </tr>
            ))}
            {product.stock_by_location.length === 0 && (
              <tr><td colSpan={4} className="text-center text-slate-500 py-6">No stock recorded at any location yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
