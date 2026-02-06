const express = require('express');
const router = express.Router();
const db = require('../db');

// Add stock
router.post('/stock', async (req, res) => {
  const { productType, productSubtype, quantity } = req.body;

  if (!productType || !productSubtype || typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    // Insert or update stock
    await db.query(
        `INSERT INTO stock (productType, productSubtype, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [productType, productSubtype, quantity]
    );

    // Add to history
    await db.query(
        `INSERT INTO stock_history (productType, productSubtype, quantity, action)
         VALUES (?, ?, ?, 'added')`,
        [productType, productSubtype, quantity]
    );

    // Get updated stock
    const [rows] = await db.query(
        'SELECT quantity FROM stock WHERE productType = ? AND productSubtype = ?',
        [productType, productSubtype]
    );

    const newStock = rows[0].quantity;

    // Emit socket event
    req.io.emit('stock-updated', {
      productType,
      productSubtype,
      newStock
    });

    res.status(201).json({
      message: 'Stock updated successfully',
      productType,
      productSubtype,
      quantity,
      newStock
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit stock (set exact quantity)
router.put('/stock', async (req, res) => {
  const { productType, productSubtype, quantity } = req.body;

  if (!productType || !productSubtype || typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    // Check if exists
    const [existing] = await db.query(
        'SELECT quantity FROM stock WHERE productType = ? AND productSubtype = ?',
        [productType, productSubtype]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const oldQuantity = existing[0].quantity;

    // Update stock
    await db.query(
        'UPDATE stock SET quantity = ? WHERE productType = ? AND productSubtype = ?',
        [quantity, productType, productSubtype]
    );

    // Add to history
    await db.query(
        `INSERT INTO stock_history (productType, productSubtype, oldQuantity, newQuantity, action)
         VALUES (?, ?, ?, ?, 'edited')`,
        [productType, productSubtype, oldQuantity, quantity]
    );

    // Emit socket event
    req.io.emit('stock-updated', {
      productType,
      productSubtype,
      newStock: quantity
    });

    res.status(200).json({
      message: 'Stock updated successfully',
      productType,
      productSubtype,
      quantity
    });
  } catch (error) {
    console.error('Error editing stock:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete stock subtype
router.delete('/stock', async (req, res) => {
  const { productType, productSubtype } = req.body;

  if (!productType || !productSubtype) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    const [result] = await db.query(
        'DELETE FROM stock WHERE productType = ? AND productSubtype = ?',
        [productType, productSubtype]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    req.io.emit('stock-updated', {
      productType,
      productSubtype,
      newStock: null
    });

    res.status(200).json({
      message: 'Stock subtype deleted successfully',
      productType,
      productSubtype
    });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete entire product type
router.delete('/stock/:productType', async (req, res) => {
  const { productType } = req.params;

  if (!productType) {
    return res.status(400).json({ error: 'Invalid product type' });
  }

  try {
    const [result] = await db.query(
        'DELETE FROM stock WHERE productType = ?',
        [productType]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Stock type not found' });
    }

    req.io.emit('stock-deleted', { productType });

    res.status(200).json({
      message: 'Product type deleted successfully',
      productType
    });
  } catch (error) {
    console.error('Error deleting product type:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all stock
router.get('/stock', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM stock ORDER BY productType, productSubtype');

    // Group by productType
    const stock = {};
    rows.forEach(row => {
      if (!stock[row.productType]) {
        stock[row.productType] = {};
      }
      stock[row.productType][row.productSubtype] = row.quantity;
    });

    res.status(200).json(stock);
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stock history for today
router.get('/stock/history', async (req, res) => {
  try {
    const [rows] = await db.query(
        `SELECT * FROM stock_history
         WHERE DATE(timestamp) = CURDATE()
         ORDER BY timestamp DESC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;