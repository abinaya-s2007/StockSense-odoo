const pool = require('../config/db');

// GET /api/dashboard  -> KPIs shown on the landing page
exports.getSummary = async (req, res) => {
  try {
    const [[{ total_products }]] = await pool.query('SELECT COUNT(*) AS total_products FROM products');

    const [[{ low_stock }]] = await pool.query(`
      SELECT COUNT(*) AS low_stock FROM (
        SELECT p.id, COALESCE(SUM(s.qty_on_hand),0) AS total_qty, p.reorder_min
        FROM products p LEFT JOIN stock s ON s.product_id = p.id
        GROUP BY p.id
        HAVING total_qty <= p.reorder_min
      ) x
    `);

    const [[{ pending_receipts }]] = await pool.query(
      "SELECT COUNT(*) AS pending_receipts FROM receipts WHERE status IN ('draft','ready')"
    );
    const [[{ pending_deliveries }]] = await pool.query(
      "SELECT COUNT(*) AS pending_deliveries FROM deliveries WHERE status IN ('draft','waiting','ready')"
    );
    const [[{ scheduled_transfers }]] = await pool.query(
      "SELECT COUNT(*) AS scheduled_transfers FROM transfers WHERE status IN ('draft','ready')"
    );

    // Late = schedule_date < today ; Waiting = waiting status ; Operations = schedule_date > today
    const [[receiptStats]] = await pool.query(`
      SELECT
        SUM(CASE WHEN schedule_date < CURDATE() AND status != 'done' THEN 1 ELSE 0 END) AS late,
        COUNT(*) AS total_operations
      FROM receipts WHERE status != 'done'
    `);
    const [[deliveryStats]] = await pool.query(`
      SELECT
        SUM(CASE WHEN schedule_date < CURDATE() AND status != 'done' THEN 1 ELSE 0 END) AS late,
        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) AS waiting,
        COUNT(*) AS total_operations
      FROM deliveries WHERE status != 'done'
    `);

    res.json({
      total_products,
      low_stock_items: low_stock,
      pending_receipts,
      pending_deliveries,
      scheduled_transfers,
      receipt: {
        to_receive: pending_receipts,
        late: receiptStats.late || 0,
        operations: receiptStats.total_operations || 0
      },
      delivery: {
        to_deliver: pending_deliveries,
        late: deliveryStats.late || 0,
        waiting: deliveryStats.waiting || 0,
        operations: deliveryStats.total_operations || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching dashboard summary.' });
  }
};
