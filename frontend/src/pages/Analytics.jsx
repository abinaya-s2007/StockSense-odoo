import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { downloadCSV } from '../utils/csv.js';
import TrendChart from '../components/charts/TrendChart.jsx';
import BarList from '../components/charts/BarList.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' }
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtNum(v) {
  const n = Number(v ?? 0);
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, '');
}

export default function Analytics() {
  // ---- filters ----
  const [range, setRange] = useState('month');
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [productId, setProductId] = useState('');
  const [category, setCategory] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [type, setType] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  // ---- filter option sources (loaded once, reuse existing APIs) ----
  const [allProducts, setAllProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);

  // ---- analytics data ----
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [products, setProducts] = useState([]);
  const [reorder, setReorder] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [productSort, setProductSort] = useState({ key: 'total_movement', dir: 'desc' });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/products').then((res) => setAllProducts(res.data)).catch(() => {});
    api.get('/settings/warehouses').then((res) => setWarehouses(res.data)).catch(() => {});
    api.get('/settings/locations').then((res) => setLocations(res.data)).catch(() => {});
  }, []);

  const categories = useMemo(
    () => [...new Set(allProducts.map((p) => p.category).filter(Boolean))].sort(),
    [allProducts]
  );

  const locationsForWarehouse = useMemo(
    () => (warehouseId ? locations.filter((l) => String(l.warehouse_id) === String(warehouseId)) : locations),
    [locations, warehouseId]
  );

  const params = useMemo(() => {
    const p = { range, group_by: groupBy };
    if (range === 'custom') { p.start = customStart; p.end = customEnd; }
    if (productId) p.product_id = productId;
    if (category) p.category = category;
    if (warehouseId) p.warehouse_id = warehouseId;
    if (locationId) p.location_id = locationId;
    if (type) p.type = type;
    return p;
  }, [range, groupBy, customStart, customEnd, productId, category, warehouseId, locationId, type]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/analytics/summary', { params }),
      api.get('/analytics/trend', { params }),
      api.get('/analytics/products', { params }),
      api.get('/analytics/reorder', { params })
    ])
      .then(([s, t, pr, r]) => {
        setSummary(s.data);
        setTrend(t.data);
        setProducts(pr.data);
        setReorder(r.data);
      })
      .catch(() => setError('Could not load analytics data.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  function handleWarehouseChange(v) {
    setWarehouseId(v);
    setLocationId('');
  }

  function resetFilters() {
    setProductId(''); setCategory(''); setWarehouseId(''); setLocationId(''); setType('');
  }

  const topMovers = useMemo(
    () => [...products].sort((a, b) => b.total_movement - a.total_movement).slice(0, 8)
      .map((p) => ({ label: `[${p.sku}] ${p.name}`, value: Number(p.total_movement), sub: p.uom })),
    [products]
  );

  // ---- Transaction Mix donut: proportion of ledger volume by type, for the
  // current filters/range (built entirely from the summary already fetched) ----
  const transactionMix = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Incoming (Receipts)', value: Number(summary.received) },
      { label: 'Outgoing (Deliveries)', value: Number(summary.outgoing) },
      { label: 'Internal Transfers', value: Number(summary.internal_moved) },
      { label: 'Adjustments', value: Number(summary.adjustment_abs) }
    ];
  }, [summary]);

  // ---- Stock by Category donut: current stock grouped by category, from the
  // product-wise analysis already fetched (no extra request needed) ----
  const stockByCategory = useMemo(() => {
    const totals = new Map();
    for (const p of products) {
      const key = p.category || 'Uncategorized';
      totals.set(key, (totals.get(key) || 0) + Number(p.current_stock));
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    const { key, dir } = productSort;
    list.sort((a, b) => {
      const av = a[key]; const bv = b[key];
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [products, productSort]);

  function toggleSort(key) {
    setProductSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  }

  function exportProductsCSV() {
    downloadCSV('inventory-analytics-products.csv', products, [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'received', label: 'Received' },
      { key: 'outgoing', label: 'Outgoing' },
      { key: 'internal_moved', label: 'Internal Transfers' },
      { key: 'adjustment_net', label: 'Adjustment Net' },
      { key: 'total_movement', label: 'Total Movement' },
      { key: 'current_stock', label: 'Current Stock' },
      { key: 'reorder_min', label: 'Reorder Minimum' },
      { key: 'status', label: 'Status' }
    ]);
  }

  function exportReorderCSV() {
    downloadCSV('inventory-analytics-reorder.csv', reorder, [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'on_hand', label: 'On Hand' },
      { key: 'reorder_min', label: 'Reorder Minimum' },
      { key: 'suggested_reorder_qty', label: 'Suggested Reorder Qty' },
      { key: 'out_of_stock', label: 'Out Of Stock' }
    ]);
  }

  async function exportTransactionsCSV() {
    setExporting(true);
    try {
      const res = await api.get('/analytics/ledger', { params });
      downloadCSV('inventory-analytics-transactions.csv', res.data, [
        { key: 'txn_date', label: 'Date' },
        { key: 'move_type', label: 'Type' },
        { key: 'reference', label: 'Reference' },
        { key: 'sku', label: 'SKU' },
        { key: 'product_name', label: 'Product' },
        { key: 'category', label: 'Category' },
        { key: 'from_location_code', label: 'From Location' },
        { key: 'to_location_code', label: 'To Location' },
        { key: 'signed_qty', label: 'Net Qty' },
        { key: 'abs_qty', label: 'Quantity' }
      ]);
    } catch {
      setError('Could not export transactions.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Inventory Analytics</h1>
          <p className="text-sm text-slate-400">Movement, stock health and reorder insight built from your live ledger.</p>
        </div>
        <button className="btn-ghost" onClick={exportTransactionsCSV} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export Transactions CSV'}
        </button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {/* ---- Filters ---- */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                range === opt.value ? 'bg-accent text-ink' : 'border border-line text-slate-300 hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" className="input max-w-[160px]" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} />
              <span className="text-slate-500 text-sm">to</span>
              <input type="date" className="input max-w-[160px]" value={customEnd} min={customStart} max={todayISO()} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <select className="input max-w-[200px]" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All Products</option>
            {allProducts.map((p) => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
          </select>
          <select className="input max-w-[170px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input max-w-[170px]" value={warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select className="input max-w-[170px]" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">All Locations</option>
            {locationsForWarehouse.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="input max-w-[160px]" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Transaction Types</option>
            <option value="in">Incoming (Receipts)</option>
            <option value="out">Outgoing (Deliveries)</option>
            <option value="internal">Internal Transfers</option>
            <option value="adjustment">Adjustments</option>
          </select>
          {(productId || category || warehouseId || locationId || type) && (
            <button className="btn-ghost" onClick={resetFilters}>Clear Filters</button>
          )}
        </div>
      </div>

      {/* ---- KPI cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <KpiCard label="Received" value={summary ? `+${fmtNum(summary.received)}` : '—'} accent="accent2" />
        <KpiCard label="Outgoing" value={summary ? `-${fmtNum(summary.outgoing)}` : '—'} accent="danger" />
        <KpiCard
          label="Adjustments"
          value={summary ? `${summary.adjustment_net >= 0 ? '+' : ''}${fmtNum(summary.adjustment_net)}` : '—'}
          accent="warn"
          sub={summary ? `${summary.adjustment_count} recorded` : ''}
        />
        <KpiCard label="Current Stock" value={summary ? fmtNum(summary.current_stock) : '—'} accent="accent" sub="as of now" />
        <KpiCard
          label="Low / Out of Stock"
          value={summary ? summary.low_or_out_of_stock : '—'}
          accent={summary?.low_or_out_of_stock > 0 ? 'danger' : 'accent2'}
          sub={summary ? `${summary.out_of_stock} out of stock` : ''}
        />
      </div>

      {/* ---- Trend chart ---- */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">Incoming vs Outgoing &amp; Net Movement</h2>
          <div className="flex gap-1">
            {['day', 'week', 'month'].map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                  groupBy === g ? 'bg-accent text-ink' : 'border border-line text-slate-400 hover:bg-white/5'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        {loading ? <p className="text-sm text-slate-500 py-10 text-center">Loading…</p> : <TrendChart data={trend} />}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* ---- Top moving products ---- */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-100 mb-4">Top Moving Products</h2>
          <BarList items={topMovers} />
        </div>

        {/* ---- Low-stock / reorder analysis ---- */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100">Low-Stock &amp; Reorder Analysis</h2>
            <button className="text-sm text-accent hover:underline disabled:opacity-40" onClick={exportReorderCSV} disabled={reorder.length === 0}>
              Export CSV
            </button>
          </div>
          {reorder.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nothing needs reordering right now.</p>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="table-base">
                <thead>
                  <tr><th>Product</th><th>On Hand</th><th>Reorder Min</th><th>Suggested Reorder</th></tr>
                </thead>
                <tbody>
                  {reorder.map((p) => (
                    <tr key={p.id}>
                      <td><Link to={`/products/${p.id}`} className="text-accent">[{p.sku}] {p.name}</Link></td>
                      <td className={p.out_of_stock ? 'text-danger font-medium' : 'text-warn font-medium'}>{fmtNum(p.on_hand)}</td>
                      <td className="text-slate-400">{fmtNum(p.reorder_min)}</td>
                      <td className="text-slate-200">{fmtNum(p.suggested_reorder_qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---- Transaction mix & stock-by-category donuts ---- */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="font-semibold text-slate-100 mb-4">Transaction Mix</h2>
          {loading ? <p className="text-sm text-slate-500 py-10 text-center">Loading…</p> : <DonutChart segments={transactionMix} centerSub="Total Volume" />}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-slate-100 mb-4">Current Stock by Category</h2>
          {loading ? <p className="text-sm text-slate-500 py-10 text-center">Loading…</p> : <DonutChart segments={stockByCategory} centerSub="Units on Hand" />}
        </div>
      </div>

      {/* ---- Product-wise stock/movement analysis ---- */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">Product-wise Stock &amp; Movement Analysis</h2>
          <button className="btn-ghost" onClick={exportProductsCSV} disabled={products.length === 0}>Export CSV</button>
        </div>
        {products.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No products match the current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <SortableTh label="Received" sortKey="received" state={productSort} onSort={toggleSort} />
                  <SortableTh label="Outgoing" sortKey="outgoing" state={productSort} onSort={toggleSort} />
                  <SortableTh label="Internal" sortKey="internal_moved" state={productSort} onSort={toggleSort} />
                  <SortableTh label="Adjustments" sortKey="adjustment_net" state={productSort} onSort={toggleSort} />
                  <SortableTh label="Total Movement" sortKey="total_movement" state={productSort} onSort={toggleSort} />
                  <SortableTh label="Current Stock" sortKey="current_stock" state={productSort} onSort={toggleSort} />
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/products/${p.id}`} className="text-accent">[{p.sku}] {p.name}</Link></td>
                    <td className="text-accent2">{p.received > 0 ? `+${fmtNum(p.received)}` : '0'}</td>
                    <td className="text-danger">{p.outgoing > 0 ? `-${fmtNum(p.outgoing)}` : '0'}</td>
                    <td className="text-slate-400">{fmtNum(p.internal_moved)}</td>
                    <td className={p.adjustment_net === 0 ? 'text-slate-400' : p.adjustment_net > 0 ? 'text-accent2' : 'text-danger'}>
                      {p.adjustment_net > 0 ? '+' : ''}{fmtNum(p.adjustment_net)}
                    </td>
                    <td className="text-slate-200">{fmtNum(p.total_movement)}</td>
                    <td className="text-slate-100 font-medium">{fmtNum(p.current_stock)}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, sub }) {
  const accentClass = { warn: 'text-warn', accent: 'text-accent', accent2: 'text-accent2', danger: 'text-danger' }[accent] || 'text-slate-100';
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${accentClass}`}>{value}</p>
      {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
    </div>
  );
}

function SortableTh({ label, sortKey, state, onSort }) {
  const active = state.key === sortKey;
  return (
    <th className="cursor-pointer select-none hover:text-slate-200" onClick={() => onSort(sortKey)}>
      {label}{active ? (state.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}

function StatusBadge({ status }) {
  const map = {
    ok: 'status-pill bg-accent2/10 text-accent2',
    low: 'status-pill bg-warn/10 text-warn',
    out: 'status-pill bg-danger/10 text-danger'
  };
  const text = { ok: 'OK', low: 'Low', out: 'Out of Stock' }[status] || status;
  return <span className={map[status] || 'status-pill bg-white/5 text-slate-300'}>{text}</span>;
}
