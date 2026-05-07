const express = require('express');
const router = express.Router();
const redis = require('../config/redis');
const verifyToken = require('../middleware/verifyToken');

const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

function cartKey(userId) {
  return `cart:${userId}`;
}

async function getCart(userId) {
  const data = await redis.get(cartKey(userId));
  return data ? JSON.parse(data) : [];
}

async function saveCart(userId, items) {
  await redis.setex(cartKey(userId), CART_TTL, JSON.stringify(items));
}

// GET /cart — get current user's cart
router.get('/', verifyToken, async (req, res) => {
  try {
    const items = await getCart(req.user.id);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ items, total: parseFloat(total.toFixed(2)), count: items.length });
  } catch (err) {
    console.error('GET /cart error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /cart/items — add item or increment quantity if already in cart
router.post('/items', verifyToken, async (req, res) => {
  try {
    const { productId, name, price, quantity = 1 } = req.body;

    if (!productId || !name || price == null) {
      return res.status(400).json({ error: 'productId, name, and price are required' });
    }

    const items = await getCart(req.user.id);
    const existing = items.find(i => i.productId === productId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ productId, name, price, quantity });
    }

    await saveCart(req.user.id, items);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.status(201).json({ items, total: parseFloat(total.toFixed(2)), count: items.length });
  } catch (err) {
    console.error('POST /cart/items error:', err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// PUT /cart/items/:productId — set quantity for an item
router.put('/items/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'quantity must be at least 1' });
    }

    const items = await getCart(req.user.id);
    const item = items.find(i => i.productId === productId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    item.quantity = quantity;
    await saveCart(req.user.id, items);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ items, total: parseFloat(total.toFixed(2)), count: items.length });
  } catch (err) {
    console.error('PUT /cart/items/:productId error:', err);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// DELETE /cart/items/:productId — remove a single item
router.delete('/items/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    let items = await getCart(req.user.id);
    items = items.filter(i => i.productId !== productId);
    await saveCart(req.user.id, items);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ items, total: parseFloat(total.toFixed(2)), count: items.length });
  } catch (err) {
    console.error('DELETE /cart/items/:productId error:', err);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// DELETE /cart — clear the entire cart
router.delete('/', verifyToken, async (req, res) => {
  try {
    await redis.del(cartKey(req.user.id));
    res.json({ items: [], total: 0, count: 0 });
  } catch (err) {
    console.error('DELETE /cart error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
