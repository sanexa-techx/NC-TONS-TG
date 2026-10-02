import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://neondb_owner:npg_YLUb51eGvrRd@ep-aged-block-auqekanh-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Neon PostgreSQL.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS mandatory_chats (
          id SERIAL PRIMARY KEY,
          chat_id VARCHAR(64) NOT NULL UNIQUE,
          title VARCHAR(128) NOT NULL,
          invite_link TEXT NOT NULL,
          chat_type VARCHAR(32) DEFAULT 'channel',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
      );

      DELETE FROM mandatory_chats;

      INSERT INTO mandatory_chats (chat_id, title, invite_link, chat_type, is_active)
      VALUES 
        ('@nctons_official', 'NC TONs Updates', 'https://t.me/nctons_official', 'channel', TRUE),
        ('@ncton_officialgroup', 'NC TONs Official Group', 'https://t.me/ncton_officialgroup', 'group', TRUE),
        ('@nicecoinpayouts', 'NC PAYOUT AND PROOF', 'https://t.me/nicecoinpayouts', 'channel', TRUE);
    `);

    console.log('✅ Updated mandatory_chats in database successfully.');

    const res = await client.query('SELECT * FROM mandatory_chats WHERE is_active = TRUE ORDER BY id ASC');
    console.log('Current mandatory chats in Neon database:');
    console.table(res.rows);
  } catch (err) {
    console.error('Migration update failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
