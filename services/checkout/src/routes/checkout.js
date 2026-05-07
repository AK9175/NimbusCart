const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/verifyToken');

const CART_URL = process.env.CART_SERVICE_URL || 'http://localhost:3002';
const ORDERS_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3004';

// POST /checkout — get cart items, create order, clear cart
router.post('/', verifyToken, async (req, res) => {
  const authHeader = req.headers.authorization;
  const { shipping } = req.body;

  try {
    // 1. Fetch current cart
    const cartRes = await axios.get(`${CART_URL}/cart`, {
      headers: { Authorization: authHeader },
    });

    const { items } = cartRes.data;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty — nothing to checkout' });
    }

    // 2. Create order in orders service
    const orderPayload = {
      items: items.map(item => ({
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      })),
      shipping: shipping || null,
    };

    const orderRes = await axios.post(`${ORDERS_URL}/orders`, orderPayload, {
      headers: { Authorization: authHeader },
    });

    const order = orderRes.data;

    // 3. Clear cart
    await axios.delete(`${CART_URL}/cart`, {
      headers: { Authorization: authHeader },
    });

    res.status(201).json({
      message: 'Checkout successful',
      order,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || 'Checkout failed';
    console.error('POST /checkout error:', err.message);
    res.status(status).json({ error: message });
  }
});

module.exports = router;
