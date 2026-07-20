// server/routes/orders.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/orders/:orderId — status only (lightweight polling endpoint)
router.get('/:orderId/status', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status FROM orders WHERE order_id = $1',
      [req.params.orderId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ status: result.rows[0].status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/:orderId — full order + line items (any portal, no tenant restriction)
router.get('/:orderId', async (req, res) => {
  try {
    const order = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [req.params.orderId]
    );
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const items = await pool.query(
      'SELECT * FROM order_line_items WHERE order_id = $1',
      [req.params.orderId]
    );

    res.json({ order: order.rows[0], items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;