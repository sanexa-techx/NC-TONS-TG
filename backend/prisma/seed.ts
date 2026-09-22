import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed default reward configurations
  const defaultRewards = [
    {
      action_type: 'game_play',
      display_name: 'Drop Catcher Mini-Game',
      nc_reward: 150,
      ton_reward: new Decimal('0.000050'),
    },
    {
      action_type: 'watch_ad',
      display_name: 'Adsgram Rewarded Video',
      nc_reward: 250,
      ton_reward: new Decimal('0.000100'),
    },
    {
      action_type: 'task_default',
      display_name: 'Standard Community Mission',
      nc_reward: 300,
      ton_reward: new Decimal('0.000200'),
    },
  ];

  for (const reward of defaultRewards) {
    await prisma.rewardConfig.upsert({
      where: { action_type: reward.action_type },
      update: {},
      create: reward,
    });
  }

  // Seed sample missions
  const initialMissions = [
    {
      creator_user_id: 0n,
      title: 'Join Official NC TONs Channel',
      description: 'Subscribe to our official Telegram channel for daily mining codes and updates.',
      category: 'telegram',
      task_type: 'telegram_join',
      action_url: 'https://t.me/nctons_official',
      telegram_chat_id: '@nctons_official',
      nc_reward: 500,
      ton_reward: new Decimal('0.000500'),
      target_users: 10000,
      priority: 10,
      is_active: true,
    },
    {
      creator_user_id: 0n,
      title: 'Follow NC TONs on X (Twitter)',
      description: 'Follow our official announcement feed on X to never miss airdrop announcements.',
      category: 'social',
      task_type: 'visit_url',
      action_url: 'https://x.com/nctons',
      telegram_chat_id: null,
      nc_reward: 300,
      ton_reward: new Decimal('0.000200'),
      target_users: 5000,
      priority: 5,
      is_active: true,
    },
    {
      creator_user_id: 0n,
      title: 'Explore TON Ecosystem Bot',
      description: 'Launch the partner TON ecosystem bot and start your web3 adventure.',
      category: 'partner',
      task_type: 'bot_launch',
      action_url: 'https://t.me/ton_ecosystem_bot',
      telegram_chat_id: null,
      nc_reward: 400,
      ton_reward: new Decimal('0.000300'),
      target_users: 2000,
      priority: 2,
      is_active: true,
    },
  ];

  for (const mission of initialMissions) {
    const existing = await prisma.dynamicMission.findFirst({
      where: { title: mission.title },
    });
    if (!existing) {
      await prisma.dynamicMission.create({
        data: mission,
      });
    }
  }

  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error('Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
