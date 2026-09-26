import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import StatusPill from '../components/StatusPill.jsx';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  function load() {
    api.get('/deliveries', { params: { search, status } }).then((res) => setDeliveries(res.data));
  }

  useEffect(load, [search, status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Delivery Orders</h1>
          <p className="text-sm text-slate-400">Outgoing stock to customers.</p>
        </div>
        <Link to="/operations/deliveries/new" className="btn-primary">New</Link>
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
          <option value="waiting">Waiting</option>
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
              <th>Delivery Address</th>
              <th>Contact</th>
              <th>Schedule Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="cursor-pointer hover:bg-white/5">
                <td><Link to={`/operations/deliveries/${d.id}`} className="text-accent font-mono">{d.reference}</Link></td>
                <td className="text-slate-400 font-mono">{d.from_location_code}</td>
                <td className="text-slate-300">{d.delivery_address || '—'}</td>
                <td className="text-slate-400">{d.contact || '—'}</td>
                <td className="text-slate-400">{d.schedule_date ? new Date(d.schedule_date).toLocaleDateString() : '—'}</td>
                <td><StatusPill status={d.status} /></td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-6">No delivery orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
