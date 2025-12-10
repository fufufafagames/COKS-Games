-- 1. Update games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT ('free') CHECK (price_type IN ('free', 'paid')),
ADD COLUMN IF NOT EXISTS price INT DEFAULT 0;

-- 2. Create transactions table
-- WARNING: This will delete existing transactions table. 
-- Since we are implementing a new payment system, this ensures fresh compatible schema.
DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  game_id INT NOT NULL,
  order_id VARCHAR(100) UNIQUE NOT NULL,

  invoice_number VARCHAR(100),
  amount INT NOT NULL,
  payment_method VARCHAR(50),
  payment_channel VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'processing', 'success', 'failed', 'expired')),
  payment_url TEXT,
  payment_code VARCHAR(100),
  qr_code_url TEXT,
  expired_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_order_id ON transactions (order_id);
CREATE INDEX idx_status ON transactions (status);
CREATE INDEX idx_user_game ON transactions (user_id, game_id);
