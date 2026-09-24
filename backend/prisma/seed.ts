import * as process from 'node:process';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Remove legacy game reward configurations
  await prisma.rewardConfig.deleteMany({
    where: {
      action_type: { in: ['game_drop', 'game_spin', 'game_grid', 'game_play'] },
    },
  });

  // Seed default reward configurations
  const defaultRewards = [
    {
      action_type: 'game_memory',
      display_name: 'Memory Matrix Puzzle',
      nc_reward: 45,
      ton_reward: new Decimal('0.000015'),
    },
    {
      action_type: 'game_2048',
      display_name: '2048 Tile Merge',
      nc_reward: 60,
      ton_reward: new Decimal('0.000020'),
    },
    {
      action_type: 'game_carrace',
      display_name: 'Cyber Car Race',
      nc_reward: 50,
      ton_reward: new Decimal('0.000025'),
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
      update: {
        display_name: reward.display_name,
        nc_reward: reward.nc_reward,
        ton_reward: reward.ton_reward,
      },
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
    {
      creator_user_id: 0n,
      title: 'Subscribe to NC TONs YouTube',
      description: 'Subscribe to our official YouTube channel and upload screenshot proof of your subscription.',
      category: 'social',
      task_type: 'screenshot_social',
      action_url: 'https://youtube.com/@nctons',
      telegram_chat_id: null,
      nc_reward: 600,
      ton_reward: new Decimal('0.000400'),
      target_users: 5000,
      priority: 8,
      is_active: true,
      requires_proof: true,
      proof_instructions: 'Take a screenshot showing the Subscribed button on our YouTube channel and upload it below:',
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

  // Seed 7-Day Daily Streak Rewards Ladder
  const dailyRewards = [
    { day_number: 1, nc_reward: 250, ton_reward: new Decimal('0.000010'), battery_bonus_pct: 0 },
    { day_number: 2, nc_reward: 500, ton_reward: new Decimal('0.000020'), battery_bonus_pct: 20 },
    { day_number: 3, nc_reward: 800, ton_reward: new Decimal('0.000035'), battery_bonus_pct: 0 },
    { day_number: 4, nc_reward: 1200, ton_reward: new Decimal('0.000050'), battery_bonus_pct: 0 },
    { day_number: 5, nc_reward: 1800, ton_reward: new Decimal('0.000075'), battery_bonus_pct: 50 },
    { day_number: 6, nc_reward: 2600, ton_reward: new Decimal('0.000100'), battery_bonus_pct: 0 },
    { day_number: 7, nc_reward: 4500, ton_reward: new Decimal('0.000250'), battery_bonus_pct: 100 },
  ];

  for (const reward of dailyRewards) {
    await prisma.dailyStreakReward.upsert({
      where: { day_number: reward.day_number },
      update: {
        nc_reward: reward.nc_reward,
        ton_reward: reward.ton_reward,
        battery_bonus_pct: reward.battery_bonus_pct,
      },
      create: reward,
    });
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
