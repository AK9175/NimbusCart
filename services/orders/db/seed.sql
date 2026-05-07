-- Seed orders for user_id=1 (matches enterprise DB user id after first Google login)
INSERT INTO orders (user_id, status, total) VALUES
  (1, 'delivered',  229.97),
  (1, 'processing', 149.99),
  (1, 'shipped',    109.99),
  (1, 'pending',     39.99),
  (1, 'delivered',   59.99)
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES
  (1, 1, 'Wireless Headphones', 1,  79.99),
  (1, 2, 'Mechanical Keyboard', 1, 149.99),
  (2, 2, 'Mechanical Keyboard', 1, 149.99),
  (3, 9, 'Portable SSD 1TB',    1, 109.99),
  (4, 3, 'USB-C Hub',           1,  39.99),
  (5, 6, 'Monitor Arm',         1,  59.99)
ON CONFLICT DO NOTHING;

INSERT INTO shipping_addresses (order_id, name, street, city, state, zip, country) VALUES
  (1, 'Test User', '123 Main St', 'San Jose', 'CA', '95112', 'US'),
  (2, 'Test User', '123 Main St', 'San Jose', 'CA', '95112', 'US'),
  (3, 'Test User', '123 Main St', 'San Jose', 'CA', '95112', 'US'),
  (4, 'Test User', '123 Main St', 'San Jose', 'CA', '95112', 'US'),
  (5, 'Test User', '123 Main St', 'San Jose', 'CA', '95112', 'US')
ON CONFLICT DO NOTHING;
