const pool = require('../config/db');

// GET all products with total on-hand / free-to-use across all locations
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.sku, p.name, p.category, p.uom, p.per_unit_cost, p.reorder_min,
             COALESCE(SUM(s.qty_on_hand), 0) AS on_hand,
             COALESCE(SUM(s.qty_on_hand - s.qty_reserved), 0) AS free_to_use
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id
      GROUP BY p.id
      ORDER BY p.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching products.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found.' });

    const [stockRows] = await pool.query(
      `SELECT s.*, l.name AS location_name, l.short_code AS location_code
       FROM stock s JOIN locations l ON l.id = s.location_id
       WHERE s.product_id = ?`,
      [req.params.id]
    );
    res.json({ ...rows[0], stock_by_location: stockRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching product.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { sku, name, category, uom, per_unit_cost, reorder_min, initial_stock, location_id } = req.body;
    if (!sku || !name) return res.status(400).json({ message: 'SKU and name are required.' });

    const [existing] = await pool.query('SELECT id FROM products WHERE sku = ?', [sku]);
    if (existing.length > 0) return res.status(409).json({ message: 'A product with this SKU already exists.' });

    const [result] = await pool.query(
      'INSERT INTO products (sku, name, category, uom, per_unit_cost, reorder_min) VALUES (?, ?, ?, ?, ?, ?)',
      [sku, name, category || null, uom || 'Unit', per_unit_cost || 0, reorder_min || 0]
    );

    if (initial_stock && location_id) {
      await pool.query(
        'INSERT INTO stock (product_id, location_id, qty_on_hand) VALUES (?, ?, ?)',
        [result.insertId, location_id, initial_stock]
      );
    }

    res.status(201).json({ message: 'Product created.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating product.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, category, uom, per_unit_cost, reorder_min } = req.body;
    await pool.query(
      'UPDATE products SET name = ?, category = ?, uom = ?, per_unit_cost = ?, reorder_min = ? WHERE id = ?',
      [name, category, uom, per_unit_cost, reorder_min, req.params.id]
    );
    res.json({ message: 'Product updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating product.' });
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting product.' });
  }
};
