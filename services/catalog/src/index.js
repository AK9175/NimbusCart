require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productsRoutes = require('./routes/products');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'catalog' }));

app.use('/products', productsRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`NimbusCart Catalog service running on http://localhost:${PORT}`);
});
