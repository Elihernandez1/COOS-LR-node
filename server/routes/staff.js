// server/routes/staff.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

const STATUS_FLOW = {
  'Received': 'In-Progress',
  'In-Progress': 'Ready',
  'Ready': 'Completed'
};

// GET /api/staff/dashboard — active orders + counts for logged-in staff's tenant
router.get('/dashboard', async (req, res) => {
  const tenantId = req.session.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const orders = await pool.query(
      `SELECT * FROM orders WHERE tenant_id = $1 AND status NOT IN ('Completed','Cancelled') ORDER BY created_at`,
      [tenantId]
    );
    const counts = { Received: 0, 'In-Progress': 0, Ready: 0 };
    orders.rows.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });

    res.json({ orders: orders.rows, counts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/staff/order/:orderId — order detail + line items
router.get('/order/:orderId', async (req, res) => {
  const tenantId = req.session.tenantId;
  try {
    const order = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1 AND tenant_id = $2',
      [req.params.orderId, tenantId]
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

// POST /api/staff/order/:orderId/advance — move order to next status
router.post('/order/:orderId/advance', async (req, res) => {
  const tenantId = req.session.tenantId;
  try {
    const current = await pool.query(
      'SELECT status FROM orders WHERE order_id = $1 AND tenant_id = $2',
      [req.params.orderId, tenantId]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const nextStatus = STATUS_FLOW[current.rows[0].status];
    if (!nextStatus) return res.status(400).json({ error: 'Order cannot be advanced further' });

    await pool.query(
      'UPDATE orders SET status = $1 WHERE order_id = $2',
      [nextStatus, req.params.orderId]
    );

    res.json({ message: `Order advanced to ${nextStatus}`, status: nextStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/staff/order/:orderId/cancel
router.post('/order/:orderId/cancel', async (req, res) => {
  const tenantId = req.session.tenantId;
  const { reason } = req.body;
  try {
    await pool.query(
      `UPDATE orders SET status = 'Cancelled', cancelled_reason = $1 WHERE order_id = $2 AND tenant_id = $3`,
      [reason || 'Other', req.params.orderId, tenantId]
    );
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/staff/history — completed/cancelled orders
router.get('/history', async (req, res) => {
  const tenantId = req.session.tenantId;
  try {
    const orders = await pool.query(
      `SELECT * FROM orders WHERE tenant_id = $1 AND status IN ('Completed','Cancelled') ORDER BY created_at DESC`,
      [tenantId]
    );
    res.json(orders.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/staff/menu — full menu (including unavailable items)
router.get('/menu', async (req, res) => {
  const tenantId = req.session.tenantId;
  try {
    const items = await pool.query(
      'SELECT * FROM menu_items WHERE tenant_id = $1 ORDER BY category, name',
      [tenantId]
    );
    res.json(items.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/staff/menu — add a menu item
router.post('/menu', async (req, res) => {
  const tenantId = req.session.tenantId;
  const { name, description, price, category, badge } = req.body;
  try {
    await pool.query(
      `INSERT INTO menu_items (tenant_id, name, description, price, category, badge, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [tenantId, name, description || '', price, category, badge || '']
    );
    res.status(201).json({ message: 'Item added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/staff/menu/:itemId — edit a menu item
router.put('/menu/:itemId', async (req, res) => {
  const tenantId = req.session.tenantId;
  const { name, description, price, category, badge } = req.body;
  try {
    await pool.query(
      `UPDATE menu_items SET name=$1, description=$2, price=$3, category=$4, badge=$5
       WHERE item_id=$6 AND tenant_id=$7`,
      [name, description || '', price, category, badge || '', req.params.itemId, tenantId]
    );
    res.json({ message: 'Item updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/staff/menu/:itemId/toggle — toggle availability
router.post('/menu/:itemId/toggle', async (req, res) => {
  const tenantId = req.session.tenantId;
  try {
    const result = await pool.query(
      `UPDATE menu_items SET is_available = NOT is_available::boolean
       WHERE item_id=$1 AND tenant_id=$2 RETURNING name, is_available`,
      [req.params.itemId, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Availability toggled', item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/staff/menu/:itemId
router.delete('/menu/:itemId', async (req, res) => {
  const tenantId = req.session.tenantId;
  try {
    await pool.query(
      'DELETE FROM menu_items WHERE item_id=$1 AND tenant_id=$2',
      [req.params.itemId, tenantId]
    );
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/staff/analytics
router.get('/analytics', async (req, res) => {
  const tenantId = req.session.tenantId;
  try {
    const total = await pool.query('SELECT COUNT(*) FROM orders WHERE tenant_id=$1', [tenantId]);
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE tenant_id=$1 AND status='Completed'`,
      [tenantId]
    );
    const topItems = await pool.query(
      `SELECT item_name, SUM(quantity) AS qty, SUM(subtotal) AS rev
       FROM order_line_items oli
       JOIN orders o ON oli.order_id = o.order_id
       WHERE o.tenant_id = $1
       GROUP BY item_name ORDER BY qty DESC LIMIT 6`,
      [tenantId]
    );

    res.json({
      total: parseInt(total.rows[0].count),
      revenue: parseFloat(revenue.rows[0].rev),
      topItems: topItems.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;