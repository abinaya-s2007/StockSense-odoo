import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';

const typeColor = {
  in: 'text-accent2',
  out: 'text-danger',
  internal: 'text-accent',
  adjustment: 'text-warn'
};

export default function MoveHistory() {
  const [moves, setMoves] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  function load() {
    api.get('/moves', { params: { search, type } }).then((res) => setMoves(res.data));
  }
  useEffect(load, [search, type]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Move History</h1>
        <p className="text-sm text-slate-400">Every stock movement between locations, logged in the ledger.</p>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search by reference or contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[160px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="in">Incoming</option>
          <option value="out">Outgoing</option>
          <option value="internal">Internal</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      <div className="card p-6 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Reference</th><th>Date</th><th>Product</th><th>From</th><th>To</th><th>Quantity</th><th>Status</th></tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id}>
                <td className="text-slate-300 font-mono">{m.reference}</td>
                <td className="text-slate-400">{m.move_date ? new Date(m.move_date).toLocaleDateString() : new Date(m.created_at).toLocaleDateString()}</td>
                <td className="text-slate-100">[{m.sku}] {m.product_name}</td>
                <td className="text-slate-400">{m.from_label}</td>
                <td className="text-slate-400">{m.to_label}</td>
                <td className={`font-medium ${typeColor[m.move_type] || 'text-slate-300'}`}>
                  {m.move_type === 'out' ? '-' : '+'}{Math.abs(m.quantity)}
                </td>
                <td className="text-slate-400 capitalize">{m.status}</td>
              </tr>
            ))}
            {moves.length === 0 && <tr><td colSpan={7} className="text-center text-slate-500 py-6">No stock movements recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
