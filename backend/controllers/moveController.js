const pool = require('../config/db');

// GET /api/moves  (Move History - list all in/out/internal/adjustment movements)
exports.getAll = async (req, res) => {
  try {
    const { search, type } = req.query;
    let sql = `
      SELECT m.*, p.sku, p.name AS product_name
      FROM moves m
      JOIN products p ON p.id = m.product_id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      sql += ' AND (m.reference LIKE ? OR m.contact LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (type) {
      sql += ' AND m.move_type = ?';
      params.push(type);
    }
    sql += ' ORDER BY m.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching move history.' });
  }
};
