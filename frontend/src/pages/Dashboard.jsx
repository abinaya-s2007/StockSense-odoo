import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load dashboard data.'));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400">Current snapshot of your inventory operations.</p>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Products" value={data?.total_products ?? '—'} />
        <KpiCard label="Low / Out of Stock" value={data?.low_stock_items ?? '—'} accent="warn" />
        <KpiCard label="Pending Receipts" value={data?.pending_receipts ?? '—'} accent="accent" />
        <KpiCard label="Pending Deliveries" value={data?.pending_deliveries ?? '—'} accent="accent2" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/operations/receipts" className="card p-6 hover:border-accent/50 transition-colors">
          <h2 className="font-semibold text-slate-100 mb-4">Receipt</h2>
          <div className="flex items-center justify-between mb-4">
            <div className="card px-4 py-3 flex-1 mr-4">
              <span className="text-2xl font-semibold text-slate-100">{data?.receipt?.to_receive ?? 0}</span>
              <p className="text-xs text-slate-400 mt-1">to receive</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <span><span className="text-danger font-medium">{data?.receipt?.late ?? 0}</span> Late</span>
            <span><span className="text-accent font-medium">{data?.receipt?.operations ?? 0}</span> Operations</span>
          </div>
        </Link>

        <Link to="/operations/deliveries" className="card p-6 hover:border-accent/50 transition-colors">
          <h2 className="font-semibold text-slate-100 mb-4">Delivery</h2>
          <div className="flex items-center justify-between mb-4">
            <div className="card px-4 py-3 flex-1 mr-4">
              <span className="text-2xl font-semibold text-slate-100">{data?.delivery?.to_deliver ?? 0}</span>
              <p className="text-xs text-slate-400 mt-1">to deliver</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <span><span className="text-danger font-medium">{data?.delivery?.late ?? 0}</span> Late</span>
            <span><span className="text-warn font-medium">{data?.delivery?.waiting ?? 0}</span> Waiting</span>
            <span><span className="text-accent font-medium">{data?.delivery?.operations ?? 0}</span> Operations</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }) {
  const accentClass = {
    warn: 'text-warn',
    accent: 'text-accent',
    accent2: 'text-accent2'
  }[accent] || 'text-slate-100';

  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}
