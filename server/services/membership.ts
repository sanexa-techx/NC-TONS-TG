// server/services/membership.ts
import { bot } from "../bot.js";
import { pool } from "../config/db.js";

export interface ChatMembershipStatus {
  id: number;
  chatId: string;
  title: string;
  inviteLink: string;
  chatType: string;
  isMember: boolean;
}

export { checkUserMembership } from "../../backend/src/services/membership.js";
