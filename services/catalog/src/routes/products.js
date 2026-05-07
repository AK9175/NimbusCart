const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// GET /products — list all products, optional ?search= and ?tag=
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, tag, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url, p.created_at,
             COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
      FROM products p
      LEFT JOIN product_tags pt ON pt.product_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    query += ` GROUP BY p.id`;

    if (tag) {
      params.push(tag);
      query += ` HAVING $${params.length} = ANY(ARRAY(
        SELECT t2.name FROM tags t2
        JOIN product_tags pt2 ON pt2.tag_id = t2.id
        WHERE pt2.product_id = p.id
      ))`;
    }

    query += ` ORDER BY p.created_at DESC`;
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ products: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /products/:id — single product with tags
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url, p.created_at,
              COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
       FROM products p
       LEFT JOIN product_tags pt ON pt.product_id = p.id
       LEFT JOIN tags t ON t.id = pt.tag_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /products/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /products — admin only: add a new product to catalog
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, price, stock, image_url, tags: tagNames } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || '', price, stock || 0, image_url || null]
    );
    const product = result.rows[0];

    // Attach tags if provided
    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        const tagResult = await pool.query(
          `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [tagName.toLowerCase()]
        );
        await pool.query(
          `INSERT INTO product_tags (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [product.id, tagResult.rows[0].id]
        );
      }
    }

    res.status(201).json({ ...product, tags: tagNames || [] });
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// DELETE /products/:id — admin only: remove a product from catalog
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM products WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: `Product "${result.rows[0].name}" deleted` });
  } catch (err) {
    console.error('DELETE /products/:id error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
