// server/routes/customer.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/customer/menu/:subdomain — get tenant + menu + branding
router.get('/menu/:subdomain', async (req, res) => {
  const { subdomain } = req.params;
  const { cat = 'All', q = '' } = req.query;

  try {
    const tenantResult = await pool.query(
      'SELECT * FROM tenants WHERE subdomain = $1 AND is_active = 1',
      [subdomain]
    );
    const tenant = tenantResult.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Restaurant not found or inactive' });

    let itemQuery = 'SELECT * FROM menu_items WHERE tenant_id = $1 AND is_available = 1';
    const params = [tenant.tenant_id];

    if (cat !== 'All') {
      params.push(cat);
      itemQuery += ` AND category = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      itemQuery += ` AND name ILIKE $${params.length}`;
    }
    itemQuery += ' ORDER BY category, name';

    const items = await pool.query(itemQuery, params);
    const branding = await pool.query(
      'SELECT * FROM tenant_branding WHERE tenant_id = $1',
      [tenant.tenant_id]
    );
    const categories = await pool.query(
      'SELECT DISTINCT category FROM menu_items WHERE tenant_id = $1 AND is_available = 1',
      [tenant.tenant_id]
    );

    res.json({
      tenant,
      items: items.rows,
      branding: branding.rows[0] || null,
      categories: categories.rows.map(r => r.category)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customer/checkout — place an order
router.post('/checkout', async (req, res) => {
  const { subdomain, name, phone, address, notes, payment, cart } = req.body;
  // cart expected as: [{ item_id, name, price, qty }, ...]

  try {
    const tenantResult = await pool.query(
      'SELECT tenant_id FROM tenants WHERE subdomain = $1',
      [subdomain]
    );
    const tenant = tenantResult.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Restaurant not found' });
    if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

    const orderResult = await pool.query(
      `INSERT INTO orders (tenant_id, customer_name, customer_phone, delivery_address, special_notes, payment_method, status, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, 'Received', $7) RETURNING order_id`,
      [tenant.tenant_id, name, phone, address, notes || '', payment, total.toFixed(2)]
    );
    const orderId = orderResult.rows[0].order_id;

    for (const item of cart) {
      const subtotal = (item.price * item.qty).toFixed(2);
      await pool.query(
        `INSERT INTO order_line_items (order_id, item_id, item_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.item_id, item.name, item.price, item.qty, subtotal]
      );
    }

    res.status(201).json({ message: 'Order placed', orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customer/order/:orderId/confirmation — order + line items
router.get('/order/:orderId/confirmation', async (req, res) => {
  try {
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [req.params.orderId]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await pool.query(
      'SELECT * FROM order_line_items WHERE order_id = $1',
      [req.params.orderId]
    );

    res.json({ order, items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customer/order/:orderId/status — for polling order tracking
router.get('/order/:orderId/status', async (req, res) => {
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

module.exports = router;