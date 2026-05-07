INSERT INTO products (name, description, price, stock, image_url) VALUES
  ('Wireless Headphones',  'Noise-cancelling over-ear headphones',          79.99,  120, 'https://picsum.photos/seed/p1/400/300'),
  ('Mechanical Keyboard',  'RGB backlit, tactile switches',                149.99,   85, 'https://picsum.photos/seed/p2/400/300'),
  ('USB-C Hub',            '7-in-1 multiport adapter',                     39.99,  200, 'https://picsum.photos/seed/p3/400/300'),
  ('Webcam 4K',            'Ultra HD streaming camera with autofocus',     89.99,   60, 'https://picsum.photos/seed/p4/400/300'),
  ('Standing Desk Mat',    'Anti-fatigue comfort mat, ergonomic design',   34.99,  150, 'https://picsum.photos/seed/p5/400/300'),
  ('Monitor Arm',          'Dual monitor adjustable desk mount',            59.99,   70, 'https://picsum.photos/seed/p6/400/300'),
  ('Laptop Stand',         'Aluminum foldable stand, portable',             29.99,  180, 'https://picsum.photos/seed/p7/400/300'),
  ('Mouse Pad XL',         'Extended gaming/desk pad, stitched edges',      19.99,  300, 'https://picsum.photos/seed/p8/400/300'),
  ('Portable SSD 1TB',     'USB 3.2 Gen 2 fast external storage',         109.99,   45, 'https://picsum.photos/seed/p9/400/300'),
  ('LED Desk Lamp',        'Touch-control, adjustable color temperature',   44.99,   95, 'https://picsum.photos/seed/p10/400/300'),
  ('Ergonomic Chair',      'Lumbar support, adjustable armrests',          299.99,   30, 'https://picsum.photos/seed/p11/400/300'),
  ('4K Monitor 27"',       'IPS panel, 144Hz, HDR400',                    449.99,   20, 'https://picsum.photos/seed/p12/400/300')
ON CONFLICT DO NOTHING;

INSERT INTO tags (name) VALUES
  ('audio'), ('input'), ('accessories'), ('video'), ('storage'),
  ('lighting'), ('furniture'), ('display')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id FROM products p, tags t WHERE
  (p.name = 'Wireless Headphones'  AND t.name = 'audio')    OR
  (p.name = 'Mechanical Keyboard'  AND t.name = 'input')    OR
  (p.name = 'USB-C Hub'            AND t.name = 'accessories') OR
  (p.name = 'Webcam 4K'            AND t.name = 'video')    OR
  (p.name = 'Standing Desk Mat'    AND t.name = 'accessories') OR
  (p.name = 'Monitor Arm'          AND t.name = 'accessories') OR
  (p.name = 'Laptop Stand'         AND t.name = 'accessories') OR
  (p.name = 'Mouse Pad XL'         AND t.name = 'input')    OR
  (p.name = 'Portable SSD 1TB'     AND t.name = 'storage')  OR
  (p.name = 'LED Desk Lamp'        AND t.name = 'lighting') OR
  (p.name = 'Ergonomic Chair'      AND t.name = 'furniture') OR
  (p.name = '4K Monitor 27"'       AND t.name = 'display')
ON CONFLICT DO NOTHING;
