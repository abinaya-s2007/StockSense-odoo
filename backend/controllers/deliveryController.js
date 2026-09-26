const pool = require('../config/db');

async function nextReference(prefix) {
  const [rows] = await pool.query(
    `SELECT reference FROM deliveries WHERE reference LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}/%`]
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const lastNum = parseInt(rows[0].reference.split('/').pop(), 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}/${String(nextNum).padStart(4, '0')}`;
}

// GET /api/deliveries
exports.getAll = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `SELECT d.*, l.short_code AS from_location_code FROM deliveries d
               JOIN locations l ON l.id = d.from_location_id WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ' AND (d.reference LIKE ? OR d.contact LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY d.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching deliveries.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Delivery not found.' });

    const [lines] = await pool.query(
      `SELECT dl.*, p.sku, p.name FROM delivery_lines dl JOIN products p ON p.id = dl.product_id
       WHERE dl.delivery_id = ?`,
      [req.params.id]
    );
    res.json({ ...rows[0], lines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching delivery.' });
  }
};

// POST /api/deliveries
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { from_location_id, delivery_address, contact, schedule_date, responsible, operation_type, lines } = req.body;
    if (!from_location_id || !lines || lines.length === 0) {
      return res.status(400).json({ message: 'Source location and at least one product line are required.' });
    }

    const reference = await nextReference('WH/OUT');

    // Determine initial status: if stock insufficient -> 'waiting', else 'ready'
    let initialStatus = 'ready';
    for (const line of lines) {
      const [stockRows] = await pool.query(
        'SELECT qty_on_hand - qty_reserved AS free FROM stock WHERE product_id = ? AND location_id = ?',
        [line.product_id, from_location_id]
      );
      const free = stockRows.length > 0 ? stockRows[0].free : 0;
      if (free < line.quantity) {
        initialStatus = 'waiting';
        break;
      }
    }

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO deliveries (reference, from_location_id, delivery_address, contact, schedule_date, responsible, operation_type, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reference, from_location_id, delivery_address || null, contact || null, schedule_date || null,
        responsible || null, operation_type || 'Delivery', initialStatus, req.user?.id || null]
    );

    for (const line of lines) {
      await conn.query(
        'INSERT INTO delivery_lines (delivery_id, product_id, quantity) VALUES (?, ?, ?)',
        [result.insertId, line.product_id, line.quantity]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Delivery created.', id: result.insertId, reference, status: initialStatus });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error creating delivery.' });
  } finally {
    conn.release();
  }
};

exports.update = async (req, res) => {
  try {
    const { delivery_address, contact, schedule_date, responsible, operation_type } = req.body;
    await pool.query(
      `UPDATE deliveries SET delivery_address = ?, contact = ?, schedule_date = ?, responsible = ?, operation_type = ?
       WHERE id = ? AND status != 'done'`,
      [delivery_address, contact, schedule_date, responsible, operation_type, req.params.id]
    );
    res.json({ message: 'Delivery updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating delivery.' });
  }
};

// PATCH /api/deliveries/:id/status  (Draft -> Waiting -> Ready -> Done)
exports.setStatus = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body;
    const [rows] = await conn.query('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Delivery not found.' });
    const delivery = rows[0];

    await conn.beginTransaction();

    if (status === 'done' && delivery.status !== 'done') {
      const [lines] = await conn.query('SELECT * FROM delivery_lines WHERE delivery_id = ?', [req.params.id]);
      for (const line of lines) {
        const [stockRows] = await conn.query(
          'SELECT qty_on_hand FROM stock WHERE product_id = ? AND location_id = ?',
          [line.product_id, delivery.from_location_id]
        );
        const currentQty = stockRows.length > 0 ? Number(stockRows[0].qty_on_hand) : 0;
        if (currentQty < Number(line.quantity)) {
          await conn.rollback();
          return res.status(400).json({ message: `Insufficient stock for product ID ${line.product_id}.` });
        }
        await conn.query(
          'UPDATE stock SET qty_on_hand = qty_on_hand - ? WHERE product_id = ? AND location_id = ?',
          [line.quantity, line.product_id, delivery.from_location_id]
        );
        await conn.query(
          `INSERT INTO moves (reference, move_type, product_id, from_label, to_label, contact, quantity, move_date, status)
           VALUES (?, 'out', ?, (SELECT short_code FROM locations WHERE id = ?), ?, ?, ?, ?, 'done')`,
          [delivery.reference, line.product_id, delivery.from_location_id, delivery.delivery_address || 'Customer',
            delivery.contact, line.quantity, delivery.schedule_date]
        );
      }
      await conn.query('UPDATE deliveries SET status = ?, validated_at = NOW() WHERE id = ?', [status, req.params.id]);
    } else {
      await conn.query('UPDATE deliveries SET status = ? WHERE id = ?', [status, req.params.id]);
    }

    await conn.commit();
    res.json({ message: `Delivery status set to ${status}.` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error updating delivery status.' });
  } finally {
    conn.release();
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query("DELETE FROM deliveries WHERE id = ? AND status = 'draft'", [req.params.id]);
    res.json({ message: 'Delivery deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting delivery.' });
  }
};
