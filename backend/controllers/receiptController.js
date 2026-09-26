const pool = require('../config/db');

async function nextReference(prefix) {
  const [rows] = await pool.query(
    `SELECT reference FROM receipts WHERE reference LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}/%`]
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const lastNum = parseInt(rows[0].reference.split('/').pop(), 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}/${String(nextNum).padStart(4, '0')}`;
}

// GET /api/receipts  (list view, supports ?search=&status=)
exports.getAll = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `SELECT r.*, l.short_code AS to_location_code FROM receipts r
               JOIN locations l ON l.id = r.to_location_id WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ' AND (r.reference LIKE ? OR r.contact LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY r.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching receipts.' });
  }
};

// GET /api/receipts/:id  (form view with product lines)
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Receipt not found.' });

    const [lines] = await pool.query(
      `SELECT rl.*, p.sku, p.name FROM receipt_lines rl JOIN products p ON p.id = rl.product_id
       WHERE rl.receipt_id = ?`,
      [req.params.id]
    );
    res.json({ ...rows[0], lines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching receipt.' });
  }
};

// POST /api/receipts  (create new - Draft status)
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { receive_from, to_location_id, contact, schedule_date, responsible, lines } = req.body;
    if (!to_location_id || !lines || lines.length === 0) {
      return res.status(400).json({ message: 'Destination location and at least one product line are required.' });
    }

    const reference = await nextReference('WH/IN');
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO receipts (reference, receive_from, to_location_id, contact, schedule_date, responsible, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [reference, receive_from || null, to_location_id, contact || null, schedule_date || null, responsible || null, req.user?.id || null]
    );

    for (const line of lines) {
      await conn.query(
        'INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)',
        [result.insertId, line.product_id, line.quantity]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Receipt created.', id: result.insertId, reference });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error creating receipt.' });
  } finally {
    conn.release();
  }
};

// PUT /api/receipts/:id  (update while in draft/ready)
exports.update = async (req, res) => {
  try {
    const { receive_from, to_location_id, contact, schedule_date, responsible } = req.body;
    await pool.query(
      `UPDATE receipts SET receive_from = ?, to_location_id = ?, contact = ?, schedule_date = ?, responsible = ?
       WHERE id = ? AND status != 'done'`,
      [receive_from, to_location_id, contact, schedule_date, responsible, req.params.id]
    );
    res.json({ message: 'Receipt updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating receipt.' });
  }
};

// PATCH /api/receipts/:id/status  (Draft -> Ready -> Done)
exports.setStatus = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body; // 'ready' | 'done' | 'canceled'
    const [rows] = await conn.query('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Receipt not found.' });
    const receipt = rows[0];

    await conn.beginTransaction();

    if (status === 'done' && receipt.status !== 'done') {
      // Validate -> increase stock & log moves
      const [lines] = await conn.query('SELECT * FROM receipt_lines WHERE receipt_id = ?', [req.params.id]);
      for (const line of lines) {
        await conn.query(
          `INSERT INTO stock (product_id, location_id, qty_on_hand) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand + VALUES(qty_on_hand)`,
          [line.product_id, receipt.to_location_id, line.quantity]
        );
        await conn.query(
          `INSERT INTO moves (reference, move_type, product_id, from_label, to_label, contact, quantity, move_date, status)
           VALUES (?, 'in', ?, ?, (SELECT short_code FROM locations WHERE id = ?), ?, ?, ?, 'done')`,
          [receipt.reference, line.product_id, receipt.receive_from || 'Vendor', receipt.to_location_id,
            receipt.contact, line.quantity, receipt.schedule_date]
        );
      }
      await conn.query('UPDATE receipts SET status = ?, validated_at = NOW() WHERE id = ?', [status, req.params.id]);
    } else {
      await conn.query('UPDATE receipts SET status = ? WHERE id = ?', [status, req.params.id]);
    }

    await conn.commit();
    res.json({ message: `Receipt status set to ${status}.` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error updating receipt status.' });
  } finally {
    conn.release();
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query("DELETE FROM receipts WHERE id = ? AND status = 'draft'", [req.params.id]);
    res.json({ message: 'Receipt deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting receipt.' });
  }
};
