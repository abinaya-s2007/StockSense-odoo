import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import StatusPill from '../components/StatusPill.jsx';

const STAGES = ['draft', 'ready', 'done'];

export default function ReceiptForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState(null);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ receive_from: '', to_location_id: '', contact: '', schedule_date: '', responsible: '' });
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings/locations').then((res) => setLocations(res.data));
    api.get('/products').then((res) => setProducts(res.data));
    if (!isNew) loadReceipt();
  }, [id]);

  function loadReceipt() {
    api.get(`/receipts/${id}`).then((res) => {
      setReceipt(res.data);
      setForm({
        receive_from: res.data.receive_from || '',
        to_location_id: res.data.to_location_id,
        contact: res.data.contact || '',
        schedule_date: res.data.schedule_date ? res.data.schedule_date.slice(0, 10) : '',
        responsible: res.data.responsible || ''
      });
      setLines(res.data.lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })));
    });
  }

  function updateForm(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateLine(idx, field, value) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, { product_id: '', quantity: 1 }]);
  }

  async function handleSave() {
    setError('');
    try {
      const payload = { ...form, lines: lines.filter((l) => l.product_id) };
      if (isNew) {
        const res = await api.post('/receipts', payload);
        navigate(`/operations/receipts/${res.data.id}`);
      } else {
        await api.put(`/receipts/${id}`, form);
        loadReceipt();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save receipt.');
    }
  }

  async function handleStatus(status) {
    try {
      await api.patch(`/receipts/${id}/status`, { status });
      loadReceipt();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status.');
    }
  }

  const currentStage = receipt?.status || 'draft';
  const stageIndex = STAGES.indexOf(currentStage);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{isNew ? 'New Receipt' : receipt?.reference || '…'}</h1>
          <p className="text-sm text-slate-400">Receive stock from a vendor into a warehouse location.</p>
        </div>
        {receipt && <StatusPill status={receipt.status} />}
      </div>

      {!isNew && receipt && (
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => handleStatus('ready')} disabled={currentStage !== 'draft'} className="btn-ghost disabled:opacity-40">Validate to Ready</button>
          <button onClick={() => handleStatus('done')} disabled={currentStage === 'done'} className="btn-primary disabled:opacity-40">
            Validate (Increase Stock)
          </button>
          <button onClick={() => window.print()} className="btn-ghost">Print</button>
          <button onClick={() => handleStatus('canceled')} className="btn-danger">Cancel</button>

          <div className="ml-auto flex items-center gap-2 text-sm">
            {STAGES.map((s, i) => (
              <span key={s} className={i <= stageIndex ? 'text-accent font-medium' : 'text-slate-500'}>
                {s.charAt(0).toUpperCase() + s.slice(1)}{i < STAGES.length - 1 ? ' >' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6 mb-6 grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Receive From (Vendor)</label>
          <input className="input" value={form.receive_from} onChange={(e) => updateForm('receive_from', e.target.value)} />
        </div>
        <div>
          <label className="label">Schedule Date</label>
          <input type="date" className="input" value={form.schedule_date} onChange={(e) => updateForm('schedule_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Destination Location</label>
          <select className="input" value={form.to_location_id} onChange={(e) => updateForm('to_location_id', e.target.value)}>
            <option value="">Select location</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.short_code}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Responsible</label>
          <input className="input" value={form.responsible} onChange={(e) => updateForm('responsible', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Contact</label>
          <input className="input" value={form.contact} onChange={(e) => updateForm('contact', e.target.value)} />
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-slate-100 mb-4">Products</h2>
        <table className="table-base mb-4">
          <thead>
            <tr><th>Product</th><th>Quantity</th></tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <select className="input" value={line.product_id} onChange={(e) => updateLine(idx, 'product_id', e.target.value)}>
                    <option value="">Select product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" className="input" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} className="btn-ghost text-sm">+ Add New Product</button>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <button onClick={handleSave} className="btn-primary">{isNew ? 'Create Receipt' : 'Save Changes'}</button>
    </div>
  );
}
