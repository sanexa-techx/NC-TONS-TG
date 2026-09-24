import { Router } from 'express';
import { getNotionStatus, syncWithdrawalToNotion, syncTaskSubmissionToNotion } from '../services/notionService.js';
import { ENV } from '../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Get Notion Integration Status
router.get('/status', async (_req, res) => {
  try {
    const status = await getNotionStatus();
    return res.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to check Notion status',
    });
  }
});

// 2. Test Sync to Notion (Withdrawals or Tasks)
router.post('/test-sync', async (req, res) => {
  const { type = 'withdrawal', sampleData } = req.body;

  try {
    if (type === 'withdrawal') {
      const result = await syncWithdrawalToNotion({
        id: sampleData?.id || 1,
        userId: sampleData?.userId || req.telegramUser?.id?.toString() || '0',
        tonAddress: sampleData?.tonAddress || '',
        tonAmount: sampleData?.tonAmount || 0,
        status: sampleData?.status || 'PENDING',
      });
      return res.json(result);
    } else if (type === 'task') {
      const result = await syncTaskSubmissionToNotion({
        id: sampleData?.id || 1,
        userId: sampleData?.userId || req.telegramUser?.id?.toString() || '0',
        missionTitle: sampleData?.missionTitle || 'Task Verification',
        status: sampleData?.status || 'PENDING_REVIEW',
      });
      return res.json(result);
    }

    return res.status(400).json({ error: "Invalid type. Must be 'withdrawal' or 'task'" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update Notion Configuration (.env)
router.post('/configure', async (req, res) => {
  const { apiKey, withdrawalsDbId, tasksDbId } = req.body;

  try {
    const envPath = path.resolve(__dirname, '../../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    if (apiKey !== undefined) {
      (ENV as any).NOTION_API_KEY = apiKey;
      if (envContent.includes('NOTION_API_KEY=')) {
        envContent = envContent.replace(/NOTION_API_KEY=.*/, `NOTION_API_KEY="${apiKey}"`);
      } else {
        envContent += `\nNOTION_API_KEY="${apiKey}"`;
      }
    }

    if (withdrawalsDbId !== undefined) {
      (ENV as any).NOTION_WITHDRAWALS_DATABASE_ID = withdrawalsDbId;
      if (envContent.includes('NOTION_WITHDRAWALS_DATABASE_ID=')) {
        envContent = envContent.replace(/NOTION_WITHDRAWALS_DATABASE_ID=.*/, `NOTION_WITHDRAWALS_DATABASE_ID="${withdrawalsDbId}"`);
      } else {
        envContent += `\nNOTION_WITHDRAWALS_DATABASE_ID="${withdrawalsDbId}"`;
      }
    }

    if (tasksDbId !== undefined) {
      (ENV as any).NOTION_TASKS_DATABASE_ID = tasksDbId;
      if (envContent.includes('NOTION_TASKS_DATABASE_ID=')) {
        envContent = envContent.replace(/NOTION_TASKS_DATABASE_ID=.*/, `NOTION_TASKS_DATABASE_ID="${tasksDbId}"`);
      } else {
        envContent += `\nNOTION_TASKS_DATABASE_ID="${tasksDbId}"`;
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    const status = await getNotionStatus();
    return res.json({
      success: true,
      message: 'Notion configuration updated',
      status,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
