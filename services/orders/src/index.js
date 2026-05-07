require('dotenv').config();
const express = require('express');
const cors = require('cors');

const ordersRoutes = require('./routes/orders');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'orders' }));

app.use('/orders', ordersRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`NimbusCart Orders service running on http://localhost:${PORT}`);
});
