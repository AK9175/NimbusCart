require('dotenv').config();
const express = require('express');
const cors = require('cors');

const cartRoutes = require('./routes/cart');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'cart' }));

app.use('/cart', cartRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`NimbusCart Cart service running on http://localhost:${PORT}`);
});
