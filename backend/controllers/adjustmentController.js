const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, p.sku, p.name AS product_name, l.short_code AS location_code
      FROM adjustments a
      JOIN products p ON p.id = a.product_id
      JOIN locations l ON l.id = a.location_id
      ORDER BY a.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching adjustments.' });
  }
};

// POST /api/adjustments  -> select product/location, enter counted qty, system auto-updates + logs
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { product_id, location_id, counted_qty, reason } = req.body;
    if (!product_id || !location_id || counted_qty === undefined) {
      return res.status(400).json({ message: 'Product, location and counted quantity are required.' });
    }

    await conn.beginTransaction();

    const [stockRows] = await conn.query(
      'SELECT qty_on_hand FROM stock WHERE product_id = ? AND location_id = ?',
      [product_id, location_id]
    );
    const recordedQty = stockRows.length > 0 ? Number(stockRows[0].qty_on_hand) : 0;
    const difference = Number(counted_qty) - recordedQty;

    await conn.query(
      `INSERT INTO stock (product_id, location_id, qty_on_hand) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE qty_on_hand = VALUES(qty_on_hand)`,
      [product_id, location_id, counted_qty]
    );

    const [result] = await conn.query(
      `INSERT INTO adjustments (product_id, location_id, recorded_qty, counted_qty, difference, reason, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_id, location_id, recordedQty, counted_qty, difference, reason || null, req.user?.id || null]
    );

    await conn.query(
      `INSERT INTO moves (reference, move_type, product_id, from_label, to_label, quantity, move_date, status)
       VALUES (?, 'adjustment', ?, 'Recorded Stock', 'Physical Count', ?, CURDATE(), 'done')`,
      [`ADJ/${String(result.insertId).padStart(4, '0')}`, product_id, difference]
    );

    await conn.commit();
    res.status(201).json({ message: 'Adjustment recorded.', id: result.insertId, difference });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error recording adjustment.' });
  } finally {
    conn.release();
  }
};
