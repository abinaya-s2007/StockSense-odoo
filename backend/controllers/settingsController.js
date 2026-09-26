const pool = require('../config/db');

// ---------- Warehouses ----------
exports.getWarehouses = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM warehouses ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching warehouses.' });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const { name, short_code, address } = req.body;
    if (!name || !short_code) return res.status(400).json({ message: 'Name and short code are required.' });

    const [result] = await pool.query(
      'INSERT INTO warehouses (name, short_code, address) VALUES (?, ?, ?)',
      [name, short_code, address || null]
    );
    res.status(201).json({ message: 'Warehouse created.', id: result.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Short code already exists.' });
    res.status(500).json({ message: 'Error creating warehouse.' });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { name, short_code, address } = req.body;
    await pool.query(
      'UPDATE warehouses SET name = ?, short_code = ?, address = ? WHERE id = ?',
      [name, short_code, address, req.params.id]
    );
    res.json({ message: 'Warehouse updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating warehouse.' });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    await pool.query('DELETE FROM warehouses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Warehouse deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting warehouse.' });
  }
};

// ---------- Locations ----------
exports.getLocations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, w.name AS warehouse_name, w.short_code AS warehouse_code
      FROM locations l JOIN warehouses w ON w.id = l.warehouse_id
      ORDER BY l.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching locations.' });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const { warehouse_id, name, short_code } = req.body;
    if (!warehouse_id || !name || !short_code) {
      return res.status(400).json({ message: 'Warehouse, name and short code are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO locations (warehouse_id, name, short_code) VALUES (?, ?, ?)',
      [warehouse_id, name, short_code]
    );
    res.status(201).json({ message: 'Location created.', id: result.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Short code already exists.' });
    res.status(500).json({ message: 'Error creating location.' });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    await pool.query('DELETE FROM locations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Location deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting location.' });
  }
};
