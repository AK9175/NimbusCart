const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// GET /orders — list orders for the authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT o.id, o.status, o.total, o.created_at,
             sa.name AS shipping_name, sa.street, sa.city, sa.state, sa.zip, sa.country
      FROM orders o
      LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
      WHERE o.user_id = $1
    `;
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    query += ` ORDER BY o.created_at DESC`;
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ orders: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('GET /orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /orders/:id — single order with items
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const orderResult = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at,
              sa.name AS shipping_name, sa.street, sa.city, sa.state, sa.zip, sa.country
       FROM orders o
       LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      `SELECT id, product_id, product_name, quantity, unit_price
       FROM order_items WHERE order_id = $1`,
      [id]
    );

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error('GET /orders/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /orders — create a new order
router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { items, shipping } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total) VALUES ($1, 'pending', $2) RETURNING id`,
      [userId, total.toFixed(2)]
    );
    const orderId = orderResult.rows[0].id;

    if (shipping) {
      await client.query(
        `INSERT INTO shipping_addresses (order_id, name, street, city, state, zip, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, shipping.name, shipping.street, shipping.city, shipping.state, shipping.zip, shipping.country || 'US']
      );
    }

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.product_name, item.quantity, item.unit_price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: orderId, status: 'pending', total: total.toFixed(2) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /orders error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

module.exports = router;
