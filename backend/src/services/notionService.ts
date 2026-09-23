import { Client } from '@notionhq/client';
import { ENV } from '../config/env.js';

let notionClient: Client | null = null;

function getClient(): Client | null {
  if (!ENV.NOTION_API_KEY || ENV.NOTION_API_KEY.trim() === '') {
    return null;
  }
  if (!notionClient) {
    notionClient = new Client({
      auth: ENV.NOTION_API_KEY.trim(),
    });
  }
  return notionClient;
}

export interface NotionIntegrationStatus {
  configured: boolean;
  authenticated: boolean;
  botId?: string;
  botName?: string;
  workspaceName?: string;
  databases: {
    withdrawals: {
      configured: boolean;
      databaseId?: string;
      accessible: boolean;
      title?: string;
    };
    tasks: {
      configured: boolean;
      databaseId?: string;
      accessible: boolean;
      title?: string;
    };
  };
  error?: string;
}

/**
 * Validates Notion API credentials and database access permissions
 */
export async function getNotionStatus(): Promise<NotionIntegrationStatus> {
  const client = getClient();
  const withdrawalsDbId = ENV.NOTION_WITHDRAWALS_DATABASE_ID?.trim();
  const tasksDbId = ENV.NOTION_TASKS_DATABASE_ID?.trim();

  const status: NotionIntegrationStatus = {
    configured: Boolean(client),
    authenticated: false,
    databases: {
      withdrawals: {
        configured: Boolean(withdrawalsDbId),
        databaseId: withdrawalsDbId || undefined,
        accessible: false,
      },
      tasks: {
        configured: Boolean(tasksDbId),
        databaseId: tasksDbId || undefined,
        accessible: false,
      },
    },
  };

  if (!client) {
    status.error = 'NOTION_API_KEY is not configured in backend/.env';
    return status;
  }

  try {
    const meRes: any = await client.users.me({});
    status.authenticated = true;
    status.botId = meRes.id;
    status.botName = meRes.name || 'NC TONs Integration Bot';
    status.workspaceName = meRes.bot?.owner?.workspace_name || 'Notion Workspace';

    // Verify Withdrawals Database if configured
    if (withdrawalsDbId) {
      try {
        const dbRes: any = await client.databases.retrieve({ database_id: withdrawalsDbId });
        status.databases.withdrawals.accessible = true;
        status.databases.withdrawals.title = dbRes.title?.[0]?.plain_text || 'Withdrawals';
      } catch (err: any) {
        console.warn('Notion Withdrawals Database check failed:', err.message);
      }
    }

    // Verify Tasks Database if configured
    if (tasksDbId) {
      try {
        const dbRes: any = await client.databases.retrieve({ database_id: tasksDbId });
        status.databases.tasks.accessible = true;
        status.databases.tasks.title = dbRes.title?.[0]?.plain_text || 'Missions';
      } catch (err: any) {
        console.warn('Notion Tasks Database check failed:', err.message);
      }
    }

    return status;
  } catch (err: any) {
    status.authenticated = false;
    status.error = err.message || 'Authentication with Notion API failed';
    return status;
  }
}

/**
 * Creates or updates a record in the Notion Withdrawals database
 */
export async function syncWithdrawalToNotion(withdrawal: {
  id: number;
  userId: bigint | string | number;
  tonAddress: string;
  tonAmount: string | number;
  status: string;
  createdAt?: Date | string;
}): Promise<{ success: boolean; pageId?: string; error?: string }> {
  const client = getClient();
  const dbId = ENV.NOTION_WITHDRAWALS_DATABASE_ID?.trim();

  if (!client || !dbId) {
    return { success: false, error: 'Notion withdrawals database not configured' };
  }

  try {
    const createdPage = await client.pages.create({
      parent: { database_id: dbId },
      properties: {
        Title: {
          title: [
            {
              type: 'text',
              text: { content: `Withdrawal #${withdrawal.id}` },
            },
          ],
        },
        'User ID': {
          rich_text: [
            {
              type: 'text',
              text: { content: withdrawal.userId.toString() },
            },
          ],
        },
        'TON Address': {
          rich_text: [
            {
              type: 'text',
              text: { content: withdrawal.tonAddress },
            },
          ],
        },
        Amount: {
          number: Number(withdrawal.tonAmount),
        },
        Status: {
          select: {
            name: withdrawal.status.toUpperCase(),
          },
        },
      },
    });

    console.log(`[NOTION] Synced Withdrawal #${withdrawal.id} to Notion page: ${createdPage.id}`);
    return { success: true, pageId: createdPage.id };
  } catch (err: any) {
    console.error('[NOTION] Failed to sync withdrawal to Notion:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Creates a record in the Notion Tasks database for admin review
 */
export async function syncTaskSubmissionToNotion(submission: {
  id: number;
  userId: bigint | string | number;
  missionTitle: string;
  status: string;
  createdAt?: Date | string;
}): Promise<{ success: boolean; pageId?: string; error?: string }> {
  const client = getClient();
  const dbId = ENV.NOTION_TASKS_DATABASE_ID?.trim();

  if (!client || !dbId) {
    return { success: false, error: 'Notion tasks database not configured' };
  }

  try {
    const createdPage = await client.pages.create({
      parent: { database_id: dbId },
      properties: {
        Title: {
          title: [
            {
              type: 'text',
              text: { content: `Proof #${submission.id} - ${submission.missionTitle}` },
            },
          ],
        },
        'User ID': {
          rich_text: [
            {
              type: 'text',
              text: { content: submission.userId.toString() },
            },
          ],
        },
        Status: {
          select: {
            name: submission.status.toUpperCase(),
          },
        },
      },
    });

    console.log(`[NOTION] Synced Proof Submission #${submission.id} to Notion page: ${createdPage.id}`);
    return { success: true, pageId: createdPage.id };
  } catch (err: any) {
    console.error('[NOTION] Failed to sync task submission to Notion:', err.message);
    return { success: false, error: err.message };
  }
}
