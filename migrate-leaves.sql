-- Drop old leaves table and create new one
DROP TABLE IF EXISTS leaves CASCADE;

CREATE TABLE leaves (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  pl DECIMAL(5,2) DEFAULT 0,
  cl DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month)
);
