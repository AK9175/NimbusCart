INSERT INTO products (name, description, price, stock, image_url) VALUES
  ('Wireless Headphones',  'Noise-cancelling over-ear headphones',          79.99,  120, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'),
  ('Mechanical Keyboard',  'RGB backlit, tactile switches',                149.99,   85, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop'),
  ('USB-C Hub',            '7-in-1 multiport adapter',                     39.99,  200, 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&h=300&fit=crop'),
  ('Webcam 4K',            'Ultra HD streaming camera with autofocus',     89.99,   60, 'https://images.unsplash.com/photo-1587925358603-c2eea5305bbc?w=400&h=300&fit=crop'),
  ('Standing Desk Mat',    'Anti-fatigue comfort mat, ergonomic design',   34.99,  150, 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop'),
  ('Monitor Arm',          'Dual monitor adjustable desk mount',            59.99,   70, 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=400&h=300&fit=crop'),
  ('Laptop Stand',         'Aluminum foldable stand, portable',             29.99,  180, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop'),
  ('Mouse Pad XL',         'Extended gaming/desk pad, stitched edges',      19.99,  300, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop'),
  ('Portable SSD 1TB',     'USB 3.2 Gen 2 fast external storage',         109.99,   45, 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=300&fit=crop'),
  ('LED Desk Lamp',        'Touch-control, adjustable color temperature',   44.99,   95, 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop'),
  ('Ergonomic Chair',      'Lumbar support, adjustable armrests',          299.99,   30, 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=300&fit=crop'),
  ('4K Monitor 27"',       'IPS panel, 144Hz, HDR400',                    449.99,   20, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop')
ON CONFLICT DO NOTHING;

-- Update image URLs for existing rows (ON CONFLICT DO NOTHING skips already-inserted rows)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop' WHERE name = 'Wireless Headphones';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop' WHERE name = 'Mechanical Keyboard';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&h=300&fit=crop' WHERE name = 'USB-C Hub';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587925358603-c2eea5305bbc?w=400&h=300&fit=crop' WHERE name = 'Webcam 4K';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop' WHERE name = 'Standing Desk Mat';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=400&h=300&fit=crop' WHERE name = 'Monitor Arm';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop' WHERE name = 'Laptop Stand';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop' WHERE name = 'Mouse Pad XL';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=300&fit=crop' WHERE name = 'Portable SSD 1TB';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop' WHERE name = 'LED Desk Lamp';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=300&fit=crop' WHERE name = 'Ergonomic Chair';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop' WHERE name = '4K Monitor 27"';

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
