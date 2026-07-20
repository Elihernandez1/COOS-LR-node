// server/routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');

// GET /api/admin/dashboard — tenant list + summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const tenants = await pool.query('SELECT * FROM tenants ORDER BY name');
    const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
    const totalRevenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE status = 'Completed'`
    );
    const totalStaff = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'staff'`);

    res.json({
      tenants: tenants.rows,
      totalOrders: parseInt(totalOrders.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].rev),
      totalStaff: parseInt(totalStaff.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/onboard — create a new tenant + default branding row
router.post('/onboard', async (req, res) => {
  const { name, subdomain, owner, phone, address } = req.body;
  try {
    const tenantResult = await pool.query(
      `INSERT INTO tenants (name, subdomain, owner_name, phone, address, is_active)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING tenant_id`,
      [name, subdomain.toLowerCase().trim(), owner, phone || '', address || '']
    );
    const tenantId = tenantResult.rows[0].tenant_id;

    await pool.query(
      `INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color, logo_text)
       VALUES ($1, '#E8751A', '#0E9F8E', 'LP')`,
      [tenantId]
    );

    res.status(201).json({ message: 'Restaurant onboarded', tenantId });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Subdomain already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/branding/:tenantId — update branding
router.put('/branding/:tenantId', async (req, res) => {
  const { primary_color, secondary_color, logo_text } = req.body;
  try {
    await pool.query(
      `UPDATE tenant_branding
       SET primary_color = $1, secondary_color = $2, logo_text = $3
       WHERE tenant_id = $4`,
      [primary_color, secondary_color, logo_text, req.params.tenantId]
    );
    res.json({ message: 'Branding updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/tenant/:tenantId/toggle — activate/deactivate a tenant
router.post('/tenant/:tenantId/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE tenants SET is_active = NOT is_active::boolean WHERE tenant_id = $1 RETURNING is_active, name',
      [req.params.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ message: 'Tenant status updated', tenant: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users — list all users with their restaurant name
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.email, u.full_name, u.role, u.tenant_id, t.name AS restaurant
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.tenant_id
      ORDER BY u.user_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users — create a new staff account
router.post('/users', async (req, res) => {
  const { tenant_id, email, password, full_name } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (tenant_id, email, password, full_name, role)
       VALUES ($1, $2, $3, $4, 'staff')`,
      [tenant_id, email.trim().toLowerCase(), hash, full_name]
    );
    res.status(201).json({ message: 'Staff account created' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/analytics — per-tenant order/revenue totals
router.get('/analytics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.name, t.subdomain, t.is_active,
             COUNT(o.order_id) AS orders,
             COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'Completed'), 0) AS revenue
      FROM tenants t
      LEFT JOIN orders o ON o.tenant_id = t.tenant_id
      GROUP BY t.tenant_id, t.name, t.subdomain, t.is_active
      ORDER BY t.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;