-- Script de inicialização automática do PostgreSQL 15 no Docker

-- Tabela de Transações (Gastos)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(255) PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários Cadastrados
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Comentários informativos
COMMENT ON TABLE transactions IS 'Tabela de lançamentos de despesas do HouseFinances';
COMMENT ON TABLE users IS 'Tabela de usuários cadastrados do HouseFinances';
