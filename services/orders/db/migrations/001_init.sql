CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  status     VARCHAR(50) DEFAULT 'pending',
  total      NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_addresses (
  id       SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  name     VARCHAR(255),
  street   VARCHAR(255),
  city     VARCHAR(100),
  state    VARCHAR(100),
  zip      VARCHAR(20),
  country  VARCHAR(100) DEFAULT 'US'
);
