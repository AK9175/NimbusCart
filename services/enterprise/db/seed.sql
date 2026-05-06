INSERT INTO customers (name, email, company, phone) VALUES
  ('Alice Johnson',  'alice@techcorp.com',    'TechCorp Inc.',      '555-0101'),
  ('Bob Martinez',   'bob@retailhub.com',     'RetailHub LLC',      '555-0102'),
  ('Carol Zhang',    'carol@cloudbase.io',    'CloudBase IO',       '555-0103'),
  ('David Patel',    'david@nexagen.com',     'NexaGen Solutions',  '555-0104'),
  ('Eva Rossi',      'eva@shopwise.net',      'ShopWise Network',   '555-0105'),
  ('Frank Kim',      'frank@storefront.co',   'StoreFront Co.',     '555-0106'),
  ('Grace Liu',      'grace@omniretail.com',  'OmniRetail Group',   '555-0107'),
  ('Henry Brown',    'henry@vantapoint.io',   'VantaPoint Inc.',    '555-0108'),
  ('Irene Novak',    'irene@megadeal.com',    'MegaDeal Corp.',     '555-0109'),
  ('James Wilson',   'james@urbanmart.com',   'UrbanMart Ltd.',     '555-0110')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, description, price, stock, image_url) VALUES
  ('Wireless Headphones', 'Noise-cancelling over-ear headphones',         79.99,  120, 'https://picsum.photos/seed/p1/400/300'),
  ('Mechanical Keyboard', 'RGB backlit, tactile switches',                149.99,  85, 'https://picsum.photos/seed/p2/400/300'),
  ('USB-C Hub',           '7-in-1 multiport adapter',                     39.99, 200, 'https://picsum.photos/seed/p3/400/300'),
  ('Webcam 4K',           'Ultra HD streaming camera with autofocus',     89.99,  60, 'https://picsum.photos/seed/p4/400/300'),
  ('Standing Desk Mat',   'Anti-fatigue comfort mat, ergonomic design',   34.99, 150, 'https://picsum.photos/seed/p5/400/300'),
  ('Monitor Arm',         'Dual monitor adjustable desk mount',            59.99,  70, 'https://picsum.photos/seed/p6/400/300'),
  ('Laptop Stand',        'Aluminum foldable stand, portable',             29.99, 180, 'https://picsum.photos/seed/p7/400/300'),
  ('Mouse Pad XL',        'Extended gaming/desk pad, stitched edges',      19.99, 300, 'https://picsum.photos/seed/p8/400/300'),
  ('Portable SSD 1TB',    'USB 3.2 Gen 2 fast external storage',         109.99,  45, 'https://picsum.photos/seed/p9/400/300'),
  ('LED Desk Lamp',       'Touch-control, adjustable color temperature',   44.99,  95, 'https://picsum.photos/seed/p10/400/300')
ON CONFLICT DO NOTHING;

INSERT INTO orders (customer_id, status, total) VALUES
  (1,  'delivered', 229.97),
  (2,  'processing', 149.99),
  (3,  'delivered',  79.99),
  (4,  'pending',   199.97),
  (5,  'shipped',   109.99),
  (6,  'delivered',  54.98),
  (7,  'processing', 89.99),
  (8,  'pending',   174.98),
  (9,  'delivered',  44.99),
  (10, 'shipped',   259.97),
  (1,  'pending',    39.99),
  (3,  'delivered',  59.99),
  (5,  'processing', 34.99)
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES
  (1,  1, 'Wireless Headphones', 1,  79.99),
  (1,  2, 'Mechanical Keyboard', 1, 149.99),
  (2,  2, 'Mechanical Keyboard', 1, 149.99),
  (3,  1, 'Wireless Headphones', 1,  79.99),
  (4,  3, 'USB-C Hub',           2,  39.99),
  (4,  7, 'Laptop Stand',        3,  29.99),
  (5,  9, 'Portable SSD 1TB',    1, 109.99),
  (6,  8, 'Mouse Pad XL',        1,  19.99),
  (6, 10, 'LED Desk Lamp',       1,  44.99),
  (7,  4, 'Webcam 4K',           1,  89.99),
  (8,  6, 'Monitor Arm',         1,  59.99),
  (8,  7, 'Laptop Stand',        1,  29.99),
  (9, 10, 'LED Desk Lamp',       1,  44.99),
  (10, 2, 'Mechanical Keyboard', 1, 149.99),
  (10, 1, 'Wireless Headphones', 1,  79.99),
  (11, 3, 'USB-C Hub',           1,  39.99),
  (12, 6, 'Monitor Arm',         1,  59.99),
  (13, 5, 'Standing Desk Mat',   1,  34.99)
ON CONFLICT DO NOTHING;
