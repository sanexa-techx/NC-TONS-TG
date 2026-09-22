-- NC TONs PostgreSQL Schema Migration

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY, -- Telegram User ID
    first_name VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    ton_balance NUMERIC(12, 6) DEFAULT 0.000000 NOT NULL,
    nc_balance BIGINT DEFAULT 0 NOT NULL,
    power_percentage INT DEFAULT 100 NOT NULL,
    power_capacity_hours INT DEFAULT 8 NOT NULL,
    ton_hashrate_per_sec NUMERIC(12, 8) DEFAULT 0.00000100 NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    referrer_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Reward Configs Table
CREATE TABLE IF NOT EXISTS reward_configs (
    action_type VARCHAR(32) PRIMARY KEY, -- 'game_play', 'watch_ad', 'task_default'
    display_name VARCHAR(64) NOT NULL,
    nc_reward INT NOT NULL,
    ton_reward NUMERIC(12, 6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Dynamic Missions Table
CREATE TABLE IF NOT EXISTS dynamic_missions (
    id SERIAL PRIMARY KEY,
    creator_user_id BIGINT NOT NULL,
    title VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(32) NOT NULL, -- 'telegram', 'social', 'daily', 'partner'
    task_type VARCHAR(32) NOT NULL, -- 'telegram_join', 'visit_url', 'bot_launch'
    action_url TEXT NOT NULL,
    telegram_chat_id VARCHAR(64),
    nc_reward INT NOT NULL,
    ton_reward NUMERIC(12, 6) NOT NULL,
    target_users INT,
    completed_count INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    priority INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Mission Claims Table
CREATE TABLE IF NOT EXISTS mission_claims (
    id SERIAL PRIMARY KEY,
    mission_id INT NOT NULL REFERENCES dynamic_missions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_user_mission UNIQUE (user_id, mission_id)
);

-- 5. Withdrawals Table
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ton_address VARCHAR(128) NOT NULL,
    ton_amount NUMERIC(10, 4) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'APPROVED', 'REJECTED'
    channel_message_id BIGINT,
    reviewed_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed Initial Reward Configurations
INSERT INTO reward_configs (action_type, display_name, nc_reward, ton_reward, updated_at)
VALUES
    ('game_play', 'Drop Catcher Mini-Game', 150, 0.000050, CURRENT_TIMESTAMP),
    ('watch_ad', 'Adsgram Rewarded Video', 250, 0.000100, CURRENT_TIMESTAMP),
    ('task_default', 'Standard Community Mission', 300, 0.000200, CURRENT_TIMESTAMP)
ON CONFLICT (action_type) DO NOTHING;

-- Seed Initial Missions
INSERT INTO dynamic_missions (creator_user_id, title, description, category, task_type, action_url, telegram_chat_id, nc_reward, ton_reward, target_users, is_active, priority)
VALUES
    (0, 'Join Official NC TONs Channel', 'Subscribe to our official Telegram channel for daily mining codes and updates.', 'telegram', 'telegram_join', 'https://t.me/nctons_official', '@nctons_official', 500, 0.000500, 10000, true, 10),
    (0, 'Follow NC TONs on X (Twitter)', 'Follow our official announcement feed on X.', 'social', 'visit_url', 'https://x.com/nctons', NULL, 300, 0.000200, 5000, true, 5),
    (0, 'Explore TON Ecosystem Bot', 'Launch the partner TON ecosystem bot and start your web3 adventure.', 'partner', 'bot_launch', 'https://t.me/ton_ecosystem_bot', NULL, 400, 0.000300, 2000, true, 2)
ON CONFLICT DO NOTHING;
