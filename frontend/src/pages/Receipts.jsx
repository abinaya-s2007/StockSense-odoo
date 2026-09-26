import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import StatusPill from '../components/StatusPill.jsx';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  function load() {
    api.get('/receipts', { params: { search, status } }).then((res) => setReceipts(res.data));
  }

  useEffect(load, [search, status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Receipts</h1>
          <p className="text-sm text-slate-400">Incoming stock from vendors.</p>
        </div>
        <Link to="/operations/receipts/new" className="btn-primary">New</Link>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search by reference or contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="card p-6 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Reference</th>
              <th>From</th>
              <th>To</th>
              <th>Contact</th>
              <th>Schedule Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-white/5">
                <td>
                  <Link to={`/operations/receipts/${r.id}`} className="text-accent font-mono">{r.reference}</Link>
                </td>
                <td className="text-slate-300">{r.receive_from || 'Vendor'}</td>
                <td className="text-slate-400 font-mono">{r.to_location_code}</td>
                <td className="text-slate-400">{r.contact || '—'}</td>
                <td className="text-slate-400">{r.schedule_date ? new Date(r.schedule_date).toLocaleDateString() : '—'}</td>
                <td><StatusPill status={r.status} /></td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-6">No receipts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
