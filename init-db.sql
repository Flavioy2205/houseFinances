-- Script de inicialização automática do PostgreSQL / Supabase para o HouseFinances

-- 1. Tabela de Transações (Gastos por Usuário)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  is_installment BOOLEAN DEFAULT false,
  installments_count INT,
  total_amount NUMERIC(10,2),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Usuários Cadastrados
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Contas a Pagar & Acordos / Parcelamentos (Bills)
CREATE TABLE IF NOT EXISTS bills (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'nao_pago',
  paid_at DATE,
  paid_amount NUMERIC(10,2),
  category VARCHAR(50) DEFAULT 'gasto_fixo',
  payment_type VARCHAR(50) DEFAULT 'debito',
  is_agreement BOOLEAN DEFAULT false,
  agreement_id VARCHAR(255),
  installment_index INT,
  installments_count INT,
  total_amount NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Orçamentos / Limites Mensais por Usuário (User Budgets)
CREATE TABLE IF NOT EXISTS user_budgets (
  user_id VARCHAR(255) PRIMARY KEY,
  amount NUMERIC(10,2) NOT NULL DEFAULT 4000.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);

-- Polícias RLS (Para Supabase)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso público às transações" ON transactions;
CREATE POLICY "Permitir acesso público às transações" ON transactions FOR ALL USING (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso público aos usuários" ON users;
CREATE POLICY "Permitir acesso público aos usuários" ON users FOR ALL USING (true);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso público às contas" ON bills;
CREATE POLICY "Permitir acesso público às contas" ON bills FOR ALL USING (true);

ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso público aos orçamentos" ON user_budgets;
CREATE POLICY "Permitir acesso público aos orçamentos" ON user_budgets FOR ALL USING (true);

