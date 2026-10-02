// backend/src/services/membership.ts
import { bot } from "../bot/bot.js";
import { pool } from "../db/index.js";

export interface ChatMembershipStatus {
  id: number;
  chatId: string;
  title: string;
  inviteLink: string;
  chatType: string;
  isMember: boolean;
}

export async function checkUserMembership(userId: number): Promise<{
  allJoined: boolean;
  channels: ChatMembershipStatus[];
}> {
  const result = await pool.query(
    "SELECT * FROM mandatory_chats WHERE is_active = TRUE ORDER BY id ASC"
  );
  const chats = result.rows;

  const validStatuses = ["creator", "administrator", "member", "restricted"];
  const evaluatedChannels: ChatMembershipStatus[] = [];
  let allJoined = true;

  for (const chat of chats) {
    let isMember = false;
    try {
      if (bot && bot.telegram) {
        const member = await bot.telegram.getChatMember(chat.chat_id, userId);
        isMember = validStatuses.includes(member.status);
      } else {
        console.warn(`[Membership Check] Telegram Bot instance unavailable for getChatMember`);
        isMember = false;
      }
    } catch (err: any) {
      console.warn(`[Membership Check] Error checking user ${userId} in ${chat.chat_id}:`, err?.message || err);
      isMember = false;
    }

    if (!isMember) {
      allJoined = false;
    }

    evaluatedChannels.push({
      id: chat.id,
      chatId: chat.chat_id,
      title: chat.title,
      inviteLink: chat.invite_link,
      chatType: chat.chat_type,
      isMember,
    });
  }

  return { allJoined, channels: evaluatedChannels };
}
