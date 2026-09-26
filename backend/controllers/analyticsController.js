const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Unified "ledger" of every stock-affecting event, built entirely from data
// that already exists (moves + adjustments) - no new tables, no mock data.
//
// moves already stores the location a receipt/delivery/transfer touched as a
// short_code string in from_label/to_label (see receipt/delivery/transfer
// controllers), so we resolve those back to real location/warehouse ids by
// joining on locations.short_code. Adjustments already carry a real
// location_id, so those join directly.
//
// signed_qty is the effect on total inventory:
//   in         -> +quantity
//   out        -> -quantity
//   internal   -> 0   (location changes only, total inventory is unaffected)
//   adjustment -> difference (already signed)
// abs_qty is the raw movement volume, used for "activity" style metrics
// (top movers, received/outgoing/internal totals) regardless of direction.
// ---------------------------------------------------------------------------
const LEDGER_SQL = `
  SELECT
    m.id                                                              AS id,
    'move'                                                            AS source,
    m.move_type                                                       AS move_type,
    m.product_id                                                      AS product_id,
    m.reference                                                       AS reference,
    COALESCE(m.move_date, DATE(m.created_at))                         AS txn_date,
    CASE WHEN m.move_type = 'out' THEN -m.quantity
         WHEN m.move_type = 'internal' THEN 0
         ELSE m.quantity END                                          AS signed_qty,
    m.quantity                                                        AS abs_qty,
    fl.id                                                              AS from_location_id,
    fl.warehouse_id                                                    AS from_warehouse_id,
    tl.id                                                              AS to_location_id,
    tl.warehouse_id                                                    AS to_warehouse_id
  FROM moves m
  LEFT JOIN locations fl ON fl.short_code = m.from_label
  LEFT JOIN locations tl ON tl.short_code = m.to_label

  UNION ALL

  SELECT
    a.id                                                              AS id,
    'adjustment'                                                       AS source,
    'adjustment'                                                       AS move_type,
    a.product_id                                                      AS product_id,
    CONCAT('ADJ/', LPAD(a.id, 4, '0'))                                 AS reference,
    DATE(a.created_at)                                                 AS txn_date,
    a.difference                                                       AS signed_qty,
    ABS(a.difference)                                                  AS abs_qty,
    al.id                                                              AS from_location_id,
    al.warehouse_id                                                    AS from_warehouse_id,
    al.id                                                              AS to_location_id,
    al.warehouse_id                                                    AS to_warehouse_id
  FROM adjustments a
  JOIN locations al ON al.id = a.location_id
`;

// Resolve the Today / Week / Month / Custom Range filter into concrete
// [startDate, endDate] strings (YYYY-MM-DD), using the server's local date.
function resolveRange(query) {
  const { range, start, end } = query;
  const today = new Date();
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const endDate = fmt(today);

  if (range === 'custom' && start && end) {
    return { startDate: start, endDate: end };
  }
  if (range === 'today') {
    return { startDate: endDate, endDate };
  }
  if (range === 'week') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { startDate: fmt(d), endDate };
  }
  // 'month' or unrecognized/default -> last 30 days
  const d = new Date(today);
  d.setDate(d.getDate() - 29);
  return { startDate: fmt(d), endDate };
}

// A location filter always wins over a warehouse filter (a location implies
// its warehouse). Resolved once per request so every downstream query can
// just do `location_id IN (...)`.
async function resolveLocationIds(query) {
  const { location_id, warehouse_id } = query;
  if (location_id) return [Number(location_id)];
  if (warehouse_id) {
    const [rows] = await pool.query('SELECT id FROM locations WHERE warehouse_id = ?', [warehouse_id]);
    return rows.map((r) => r.id);
  }
  return null;
}

// Combine an array of {clause, params} into a single AND-joined fragment.
// Callers prepend 'WHERE ' or 'AND ' themselves depending on context.
function combine(conditions) {
  const list = conditions.filter(Boolean);
  return { clauseStr: list.map((c) => c.clause).join(' AND '), params: list.flatMap((c) => c.params) };
}

// Shared ledger-side filters (date range + type + product + category + location)
// used by summary/trend/ledger. `category` requires the caller to have joined
// `products p` in the surrounding query.
function ledgerConditions({ startDate, endDate, type, product_id, category, locationIds }) {
  const conditions = [{ clause: 'l.txn_date BETWEEN ? AND ?', params: [startDate, endDate] }];
  if (type) conditions.push({ clause: 'l.move_type = ?', params: [type] });
  if (product_id) conditions.push({ clause: 'l.product_id = ?', params: [product_id] });
  if (category) conditions.push({ clause: 'p.category = ?', params: [category] });
  if (locationIds) {
    conditions.push({ clause: '(l.from_location_id IN (?) OR l.to_location_id IN (?))', params: [locationIds, locationIds] });
  }
  return conditions;
}

// GET /api/analytics/summary
exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = resolveRange(req.query);
    const { product_id, category, type } = req.query;
    const locationIds = await resolveLocationIds(req.query);

    const ledgerWhere = combine(ledgerConditions({ startDate, endDate, type, product_id, category, locationIds }));

    const [[agg]] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN l.move_type='in' THEN l.abs_qty ELSE 0 END),0)         AS received,
        COALESCE(SUM(CASE WHEN l.move_type='out' THEN l.abs_qty ELSE 0 END),0)        AS outgoing,
        COALESCE(SUM(CASE WHEN l.move_type='internal' THEN l.abs_qty ELSE 0 END),0)   AS internal_moved,
        COALESCE(SUM(CASE WHEN l.move_type='adjustment' THEN l.signed_qty ELSE 0 END),0) AS adjustment_net,
        COALESCE(SUM(CASE WHEN l.move_type='adjustment' THEN l.abs_qty ELSE 0 END),0)    AS adjustment_abs,
        COUNT(CASE WHEN l.move_type='adjustment' THEN 1 END)                          AS adjustment_count
      FROM (${LEDGER_SQL}) l
      JOIN products p ON p.id = l.product_id
      WHERE ${ledgerWhere.clauseStr}
      `,
      ledgerWhere.params
    );

    // Current stock + low/out-of-stock are a live snapshot (not date-ranged),
    // filtered by product / category / location only.
    const productConditions = [];
    if (product_id) productConditions.push({ clause: 'p.id = ?', params: [product_id] });
    if (category) productConditions.push({ clause: 'p.category = ?', params: [category] });
    const productWhere = combine(productConditions);
    const locJoin = locationIds ? 'AND s.location_id IN (?)' : '';
    const locParams = locationIds ? [locationIds] : [];

    const [[stockAgg]] = await pool.query(
      `
      SELECT COALESCE(SUM(s.qty_on_hand),0) AS current_stock
      FROM stock s
      JOIN products p ON p.id = s.product_id
      ${locationIds ? 'WHERE s.location_id IN (?)' : ''}
      ${productWhere.clauseStr ? (locationIds ? 'AND ' : 'WHERE ') + productWhere.clauseStr : ''}
      `,
      [...locParams, ...productWhere.params]
    );

    const [[levelAgg]] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN on_hand <= reorder_min THEN 1 ELSE 0 END),0) AS low_or_out,
        COALESCE(SUM(CASE WHEN on_hand <= 0 THEN 1 ELSE 0 END),0)           AS out_of_stock
      FROM (
        SELECT p.id, p.reorder_min, COALESCE(SUM(s.qty_on_hand),0) AS on_hand
        FROM products p
        LEFT JOIN stock s ON s.product_id = p.id ${locJoin}
        ${productWhere.clauseStr ? 'WHERE ' + productWhere.clauseStr : ''}
        GROUP BY p.id
      ) x
      `,
      [...locParams, ...productWhere.params]
    );

    res.json({
      range: { start: startDate, end: endDate },
      received: Number(agg.received),
      outgoing: Number(agg.outgoing),
      internal_moved: Number(agg.internal_moved),
      adjustment_net: Number(agg.adjustment_net),
      adjustment_abs: Number(agg.adjustment_abs),
      adjustment_count: Number(agg.adjustment_count),
      current_stock: Number(stockAgg.current_stock),
      low_or_out_of_stock: Number(levelAgg.low_or_out),
      out_of_stock: Number(levelAgg.out_of_stock)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching analytics summary.' });
  }
};

// GET /api/analytics/trend  -> Incoming vs Outgoing + Net Movement, bucketed by day/week/month
exports.getTrend = async (req, res) => {
  try {
    const { startDate, endDate } = resolveRange(req.query);
    const { product_id, category, type, group_by } = req.query;
    const locationIds = await resolveLocationIds(req.query);

    const groupExpr = {
      day: 'DATE(l.txn_date)',
      week: 'DATE(DATE_SUB(l.txn_date, INTERVAL WEEKDAY(l.txn_date) DAY))',
      month: "DATE_FORMAT(l.txn_date, '%Y-%m-01')"
    }[group_by] || 'DATE(l.txn_date)';

    const ledgerWhere = combine(ledgerConditions({ startDate, endDate, type, product_id, category, locationIds }));

    const [rows] = await pool.query(
      `
      SELECT
        ${groupExpr} AS period,
        COALESCE(SUM(CASE WHEN l.move_type='in' THEN l.abs_qty ELSE 0 END),0)       AS incoming,
        COALESCE(SUM(CASE WHEN l.move_type='out' THEN l.abs_qty ELSE 0 END),0)      AS outgoing,
        COALESCE(SUM(CASE WHEN l.move_type='internal' THEN l.abs_qty ELSE 0 END),0) AS internal_moved,
        COALESCE(SUM(l.signed_qty),0)                                               AS net_movement
      FROM (${LEDGER_SQL}) l
      JOIN products p ON p.id = l.product_id
      WHERE ${ledgerWhere.clauseStr}
      GROUP BY period
      ORDER BY period ASC
      `,
      ledgerWhere.params
    );

    res.json(
      rows.map((r) => ({
        period: r.period instanceof Date ? r.period.toISOString().slice(0, 10) : String(r.period),
        incoming: Number(r.incoming),
        outgoing: Number(r.outgoing),
        internal_moved: Number(r.internal_moved),
        net_movement: Number(r.net_movement)
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching movement trend.' });
  }
};

// GET /api/analytics/products -> product-wise stock/movement analysis (also powers Top Movers)
exports.getProducts = async (req, res) => {
  try {
    const { startDate, endDate } = resolveRange(req.query);
    const { product_id, category, type } = req.query;
    const locationIds = await resolveLocationIds(req.query);

    const ledgerWhere = combine(ledgerConditions({ startDate, endDate, type, locationIds }));

    const productConditions = [];
    if (product_id) productConditions.push({ clause: 'p.id = ?', params: [product_id] });
    if (category) productConditions.push({ clause: 'p.category = ?', params: [category] });
    const productWhere = combine(productConditions);

    const stockJoin = locationIds ? 'AND s.location_id IN (?)' : '';
    const stockParams = locationIds ? [locationIds] : [];

    const [rows] = await pool.query(
      `
      SELECT
        p.id, p.sku, p.name, p.category, p.uom, p.reorder_min,
        COALESCE(SUM(CASE WHEN l.move_type='in' THEN l.abs_qty ELSE 0 END),0)         AS received,
        COALESCE(SUM(CASE WHEN l.move_type='out' THEN l.abs_qty ELSE 0 END),0)        AS outgoing,
        COALESCE(SUM(CASE WHEN l.move_type='internal' THEN l.abs_qty ELSE 0 END),0)   AS internal_moved,
        COALESCE(SUM(CASE WHEN l.move_type='adjustment' THEN l.signed_qty ELSE 0 END),0) AS adjustment_net,
        COALESCE(SUM(l.abs_qty),0)                                                    AS total_movement,
        COALESCE(stock_agg.on_hand,0)                                                 AS current_stock
      FROM products p
      LEFT JOIN (${LEDGER_SQL}) l ON l.product_id = p.id AND ${ledgerWhere.clauseStr}
      LEFT JOIN (
        SELECT s.product_id, SUM(s.qty_on_hand) AS on_hand
        FROM stock s
        WHERE 1=1 ${stockJoin}
        GROUP BY s.product_id
      ) stock_agg ON stock_agg.product_id = p.id
      ${productWhere.clauseStr ? 'WHERE ' + productWhere.clauseStr : ''}
      GROUP BY p.id
      ORDER BY total_movement DESC, p.id DESC
      `,
      [...ledgerWhere.params, ...stockParams, ...productWhere.params]
    );

    res.json(
      rows.map((r) => ({
        ...r,
        received: Number(r.received),
        outgoing: Number(r.outgoing),
        internal_moved: Number(r.internal_moved),
        adjustment_net: Number(r.adjustment_net),
        total_movement: Number(r.total_movement),
        current_stock: Number(r.current_stock),
        reorder_min: Number(r.reorder_min),
        status: Number(r.current_stock) <= 0 ? 'out' : Number(r.current_stock) <= Number(r.reorder_min) ? 'low' : 'ok'
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching product analysis.' });
  }
};

// GET /api/analytics/reorder -> low-stock / reorder analysis (live snapshot, not date-ranged)
exports.getReorder = async (req, res) => {
  try {
    const { product_id, category } = req.query;
    const locationIds = await resolveLocationIds(req.query);

    const productConditions = [];
    if (product_id) productConditions.push({ clause: 'p.id = ?', params: [product_id] });
    if (category) productConditions.push({ clause: 'p.category = ?', params: [category] });
    const productWhere = combine(productConditions);

    const locJoin = locationIds ? 'AND s.location_id IN (?)' : '';
    const locParams = locationIds ? [locationIds] : [];

    const [rows] = await pool.query(
      `
      SELECT * FROM (
        SELECT p.id, p.sku, p.name, p.category, p.uom, p.reorder_min,
               COALESCE(SUM(s.qty_on_hand),0) AS on_hand
        FROM products p
        LEFT JOIN stock s ON s.product_id = p.id ${locJoin}
        ${productWhere.clauseStr ? 'WHERE ' + productWhere.clauseStr : ''}
        GROUP BY p.id
      ) x
      WHERE on_hand <= reorder_min
      ORDER BY on_hand ASC
      `,
      [...locParams, ...productWhere.params]
    );

    res.json(
      rows.map((r) => {
        const onHand = Number(r.on_hand);
        const reorderMin = Number(r.reorder_min);
        return {
          ...r,
          on_hand: onHand,
          reorder_min: reorderMin,
          out_of_stock: onHand <= 0,
          suggested_reorder_qty: Math.max(reorderMin - onHand, 0)
        };
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching reorder analysis.' });
  }
};

// GET /api/analytics/ledger -> raw filtered transaction list, backs the detail
// table and the CSV export (mirrors Move History's shape/columns).
exports.getLedger = async (req, res) => {
  try {
    const { startDate, endDate } = resolveRange(req.query);
    const { product_id, category, type } = req.query;
    const locationIds = await resolveLocationIds(req.query);

    const ledgerWhere = combine(ledgerConditions({ startDate, endDate, type, product_id, category, locationIds }));

    const [rows] = await pool.query(
      `
      SELECT
        l.id, l.source, l.move_type, l.reference, l.txn_date, l.signed_qty, l.abs_qty,
        p.sku, p.name AS product_name, p.category,
        fl.short_code AS from_location_code, tl.short_code AS to_location_code,
        fw.short_code AS from_warehouse_code, tw.short_code AS to_warehouse_code
      FROM (${LEDGER_SQL}) l
      JOIN products p ON p.id = l.product_id
      LEFT JOIN locations fl ON fl.id = l.from_location_id
      LEFT JOIN locations tl ON tl.id = l.to_location_id
      LEFT JOIN warehouses fw ON fw.id = l.from_warehouse_id
      LEFT JOIN warehouses tw ON tw.id = l.to_warehouse_id
      WHERE ${ledgerWhere.clauseStr}
      ORDER BY l.txn_date DESC, l.id DESC
      LIMIT 2000
      `,
      ledgerWhere.params
    );

    res.json(
      rows.map((r) => ({
        ...r,
        txn_date: r.txn_date instanceof Date ? r.txn_date.toISOString().slice(0, 10) : String(r.txn_date),
        signed_qty: Number(r.signed_qty),
        abs_qty: Number(r.abs_qty)
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching ledger.' });
  }
};
