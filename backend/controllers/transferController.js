const pool = require('../config/db');

async function nextReference() {
  const [rows] = await pool.query(
    `SELECT reference FROM transfers ORDER BY id DESC LIMIT 1`
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const lastNum = parseInt(rows[0].reference.split('/').pop(), 10);
    nextNum = lastNum + 1;
  }
  return `WH/INT/${String(nextNum).padStart(4, '0')}`;
}

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, fl.short_code AS from_code, tl.short_code AS to_code
      FROM transfers t
      JOIN locations fl ON fl.id = t.from_location_id
      JOIN locations tl ON tl.id = t.to_location_id
      ORDER BY t.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching transfers.' });
  }
};

exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { from_location_id, to_location_id, schedule_date, responsible, lines } = req.body;
    if (!from_location_id || !to_location_id || !lines || lines.length === 0) {
      return res.status(400).json({ message: 'From/To locations and at least one product line are required.' });
    }
    if (from_location_id === to_location_id) {
      return res.status(400).json({ message: 'From and To locations must be different.' });
    }

    const reference = await nextReference();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO transfers (reference, from_location_id, to_location_id, schedule_date, responsible, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
      [reference, from_location_id, to_location_id, schedule_date || null, responsible || null, req.user?.id || null]
    );

    for (const line of lines) {
      await conn.query(
        'INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES (?, ?, ?)',
        [result.insertId, line.product_id, line.quantity]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Transfer created.', id: result.insertId, reference });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error creating transfer.' });
  } finally {
    conn.release();
  }
};

exports.setStatus = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body;
    const [rows] = await conn.query('SELECT * FROM transfers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Transfer not found.' });
    const transfer = rows[0];

    await conn.beginTransaction();

    if (status === 'done' && transfer.status !== 'done') {
      const [lines] = await conn.query('SELECT * FROM transfer_lines WHERE transfer_id = ?', [req.params.id]);
      for (const line of lines) {
        const [stockRows] = await conn.query(
          'SELECT qty_on_hand FROM stock WHERE product_id = ? AND location_id = ?',
          [line.product_id, transfer.from_location_id]
        );
        const currentQty = stockRows.length > 0 ? Number(stockRows[0].qty_on_hand) : 0;
        if (currentQty < Number(line.quantity)) {
          await conn.rollback();
          return res.status(400).json({ message: `Insufficient stock for product ID ${line.product_id}.` });
        }
        await conn.query(
          'UPDATE stock SET qty_on_hand = qty_on_hand - ? WHERE product_id = ? AND location_id = ?',
          [line.quantity, line.product_id, transfer.from_location_id]
        );
        await conn.query(
          `INSERT INTO stock (product_id, location_id, qty_on_hand) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand + VALUES(qty_on_hand)`,
          [line.product_id, transfer.to_location_id, line.quantity]
        );
        await conn.query(
          `INSERT INTO moves (reference, move_type, product_id, from_label, to_label, quantity, move_date, status)
           VALUES (?, 'internal', ?, (SELECT short_code FROM locations WHERE id = ?), (SELECT short_code FROM locations WHERE id = ?), ?, ?, 'done')`,
          [transfer.reference, line.product_id, transfer.from_location_id, transfer.to_location_id,
            line.quantity, transfer.schedule_date]
        );
      }
      await conn.query('UPDATE transfers SET status = ?, validated_at = NOW() WHERE id = ?', [status, req.params.id]);
    } else {
      await conn.query('UPDATE transfers SET status = ? WHERE id = ?', [status, req.params.id]);
    }

    await conn.commit();
    res.json({ message: `Transfer status set to ${status}.` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error updating transfer status.' });
  } finally {
    conn.release();
  }
};
