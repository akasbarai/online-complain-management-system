const express = require('express');
const pool = require('../db/connection');
const router = express.Router();

router.get('/departments', async (req, res) => {
  try {
    const [departments] = await pool.query(
      'SELECT id, name, description, status FROM departments WHERE status = ? ORDER BY name',
      ['Active']
    );
    res.json(departments.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description
    })));
  } catch (err) {
    console.error('Error fetching public departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
