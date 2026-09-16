-- Database Schema for Kendana (Express.js)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    allow_negative_balance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO transaction_types (id, name) VALUES
(1, 'Income'),
(2, 'Expense'),
(3, 'Transfer'),
(4, 'Debt'),
(5, 'Receivable')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0,
    group_type VARCHAR(50) DEFAULT 'Liquid',
    icon VARCHAR(10) DEFAULT '💵',
    keyword TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type_id INT REFERENCES transaction_types(id) ON DELETE CASCADE,
    category_name VARCHAR(255) NOT NULL,
    icon VARCHAR(10) DEFAULT '📁',
    keyword TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_logs (
    id SERIAL PRIMARY KEY,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type_id INT REFERENCES transaction_types(id),
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    source_wallet_id INT REFERENCES wallets(id),
    destination_wallet_id INT REFERENCES wallets(id),
    amount NUMERIC(15, 2) NOT NULL,
    balance_before NUMERIC(15, 2) DEFAULT 0,
    balance_after NUMERIC(15, 2) DEFAULT 0,
    subject VARCHAR(255),
    notes TEXT,
    is_cleared BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_wallet_balance NUMERIC(15, 2) DEFAULT 0,
    total_receivables NUMERIC(15, 2) DEFAULT 0,
    total_debts NUMERIC(15, 2) DEFAULT 0,
    net_worth NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, snapshot_date)
);

