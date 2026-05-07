require('dotenv').config();
const express = require('express');
const cors = require('cors');

const checkoutRoutes = require('./routes/checkout');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'checkout' }));

app.use('/checkout', checkoutRoutes);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`NimbusCart Checkout service running on http://localhost:${PORT}`);
});
