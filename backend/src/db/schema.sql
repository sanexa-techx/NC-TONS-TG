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

-- 6. Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(32) NOT NULL, -- 'game_memory', 'game_2048', 'game_carrace'
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL, -- 'ACTIVE', 'COMPLETED', 'EXPIRED'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    score INT
);

-- Seed Initial Reward Configurations
DELETE FROM reward_configs 
WHERE action_type IN ('game_drop', 'game_spin', 'game_grid', 'game_play');

INSERT INTO reward_configs (action_type, display_name, nc_reward, ton_reward, updated_at)
VALUES
    ('game_memory', 'Memory Matrix Puzzle', 45, 0.000015, CURRENT_TIMESTAMP),
    ('game_2048', '2048 Tile Merge', 60, 0.000020, CURRENT_TIMESTAMP),
    ('game_carrace', 'Cyber Car Race', 50, 0.000025, CURRENT_TIMESTAMP),
    ('watch_ad', 'Adsgram Rewarded Video', 250, 0.000100, CURRENT_TIMESTAMP),
    ('task_default', 'Standard Community Mission', 300, 0.000200, CURRENT_TIMESTAMP)
ON CONFLICT (action_type) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    nc_reward = EXCLUDED.nc_reward,
    ton_reward = EXCLUDED.ton_reward;

-- Seed Initial Missions
INSERT INTO dynamic_missions (creator_user_id, title, description, category, task_type, action_url, telegram_chat_id, nc_reward, ton_reward, target_users, is_active, priority)
VALUES
    (0, 'Join Official NC TONs Channel', 'Subscribe to our official Telegram channel for daily mining codes and updates.', 'telegram', 'telegram_join', 'https://t.me/nctons_official', '@nctons_official', 500, 0.000500, 10000, true, 10),
    (0, 'Follow NC TONs on X (Twitter)', 'Follow our official announcement feed on X.', 'social', 'visit_url', 'https://x.com/nctons', NULL, 300, 0.000200, 5000, true, 5),
    (0, 'Explore TON Ecosystem Bot', 'Launch the partner TON ecosystem bot and start your web3 adventure.', 'partner', 'bot_launch', 'https://t.me/ton_ecosystem_bot', NULL, 400, 0.000300, 2000, true, 2)
ON CONFLICT DO NOTHING;

-- Promo Codes Tables
CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    nc_reward INT NOT NULL DEFAULT 500,
    ton_reward NUMERIC(14, 6) DEFAULT 0.000050,
    max_claims INT DEFAULT 100,
    claimed_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_promo_claims (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    promo_code_id INT REFERENCES promo_codes(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_promo UNIQUE (user_id, promo_code_id)
);

-- Seed Initial Promo Codes
INSERT INTO promo_codes (code, nc_reward, ton_reward, max_claims, claimed_count, is_active)
VALUES
    ('WELCOME500', 500, 0.000050, 1000, 0, true),
    ('NCTONS2026', 1000, 0.000100, 500, 0, true)
ON CONFLICT (code) DO NOTHING;

-- Referral System & Friends Hub Schema
-- 1. Extend Users Table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referred_by BIGINT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS unclaimed_referral_nc BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS unclaimed_referral_ton NUMERIC(14, 6) DEFAULT 0.000000,
ADD COLUMN IF NOT EXISTS total_referral_nc BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referral_ton NUMERIC(14, 6) DEFAULT 0.000000;

-- 2. Referrals History Table
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id BIGINT NOT NULL REFERENCES users(id),
    referee_id BIGINT NOT NULL UNIQUE REFERENCES users(id), -- A user can only be referred once
    is_premium BOOLEAN DEFAULT FALSE,                      -- Referee has Telegram Premium
    bonus_nc INT NOT NULL,
    bonus_ton NUMERIC(14, 6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Profile & Avatar System Schema
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS photo_synced_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS miner_level INT DEFAULT 1;

-- Daily Streak & Reward System (NC TONs)
-- 1. Extend Users Table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS daily_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_claim_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_daily_claims INT DEFAULT 0;

-- 2. Configurable 7-Day Rewards Table
CREATE TABLE IF NOT EXISTS daily_streak_rewards (
    day_number INT PRIMARY KEY, -- 1 through 7
    nc_reward INT NOT NULL,
    ton_reward NUMERIC(14, 6) NOT NULL,
    battery_bonus_pct INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed Initial 7-Day Ladder
INSERT INTO daily_streak_rewards (day_number, nc_reward, ton_reward, battery_bonus_pct)
VALUES 
  (1, 250, 0.000010, 0),
  (2, 500, 0.000020, 20),
  (3, 800, 0.000035, 0),
  (4, 1200, 0.000050, 0),
  (5, 1800, 0.000075, 50),
  (6, 2600, 0.000100, 0),
  (7, 4500, 0.000250, 100)
ON CONFLICT (day_number) DO NOTHING;

-- Social Task Screenshot Verification System (NC TONs)
-- 1. Support screenshot task types in dynamic_missions
ALTER TABLE dynamic_missions 
ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS proof_instructions TEXT DEFAULT 'Upload a screenshot showing you followed/subscribed';

-- 2. Task Proof Submissions Registry
CREATE TABLE IF NOT EXISTS task_proof_submissions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_id INT NOT NULL REFERENCES dynamic_missions(id) ON DELETE CASCADE,
    telegram_file_id TEXT,               -- Telegram image reference
    channel_message_id BIGINT,          -- Message ID in Admin Channel
    status VARCHAR(20) DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'APPROVED', 'REJECTED'
    reviewed_by BIGINT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_pending_user_task UNIQUE(user_id, mission_id)
);

-- 3. Compatibility view & rule for user_mission_claims
CREATE OR REPLACE VIEW user_mission_claims AS 
SELECT id, user_id, mission_id, claimed_at FROM mission_claims;

CREATE OR REPLACE RULE user_mission_claims_ins AS ON INSERT TO user_mission_claims 
DO INSTEAD 
INSERT INTO mission_claims (user_id, mission_id, claimed_at) 
VALUES (NEW.user_id, NEW.mission_id, COALESCE(NEW.claimed_at, NOW()))
RETURNING id, user_id, mission_id, claimed_at;

-- Seed Sample Screenshot Social Mission
INSERT INTO dynamic_missions (creator_user_id, title, description, category, task_type, action_url, telegram_chat_id, nc_reward, ton_reward, target_users, is_active, priority, requires_proof, proof_instructions)
VALUES
  (0, 'Subscribe to NC TONs YouTube', 'Subscribe to our official YouTube channel and upload screenshot proof of your subscription.', 'social', 'screenshot_social', 'https://youtube.com/@nctons', NULL, 600, 0.000400, 5000, true, 8, true, 'Take a screenshot showing the Subscribed button on our YouTube channel and upload it below:')
ON CONFLICT DO NOTHING;

-- Dual Ad Networks (Adsgram & Monetag) & Withdrawal Gatekeeper (NC TONs)
-- 1. Daily Ad Views Tracking Table (Resets daily based on UTC date)
CREATE TABLE IF NOT EXISTS user_daily_ads (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_date DATE NOT NULL DEFAULT CURRENT_DATE,
    adsgram_count INT DEFAULT 0,
    monetag_count INT DEFAULT 0,
    last_ad_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, ad_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_ads ON user_daily_ads(user_id, ad_date);

-- 2. Update Reward Configurations Table
INSERT INTO reward_configs (action_type, display_name, nc_reward, ton_reward)
VALUES 
  ('ad_adsgram', 'Adsgram Rewarded Video', 200, 0.000300),
  ('ad_monetag', 'Monetag Rewarded Ad', 200, 0.000200)
ON CONFLICT (action_type) DO UPDATE 
SET nc_reward = EXCLUDED.nc_reward,
    ton_reward = EXCLUDED.ton_reward,
    display_name = EXCLUDED.display_name;


