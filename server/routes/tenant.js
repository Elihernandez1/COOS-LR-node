const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/tenant/:subdomain — look up a tenant by subdomain
router.get('/:subdomain', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tenants WHERE subdomain = $1',
      [req.params.subdomain]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;