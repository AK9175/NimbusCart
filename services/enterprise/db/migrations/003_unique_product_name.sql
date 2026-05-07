-- Remove duplicate products, keeping the lowest id for each name
DELETE FROM order_items WHERE product_id NOT IN (
  SELECT MIN(id) FROM products GROUP BY name
);
DELETE FROM products WHERE id NOT IN (
  SELECT MIN(id) FROM products GROUP BY name
);

-- Prevent future duplicates
ALTER TABLE products ADD CONSTRAINT products_name_unique UNIQUE (name);
