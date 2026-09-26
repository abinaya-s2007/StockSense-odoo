import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios.js';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setError('Could not load this product.'));
  }, [id]);

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
      </div>

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
        <div className="card p-4 mb-6 border-danger/40 bg-danger/10">
          <p className="text-sm text-danger">
            Free-to-use stock ({totalFree}) is at or below the reorder minimum ({product.reorder_min}). Consider creating a Receipt to restock.
          </p>
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
