import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";
import NotificationEngine from "../services/notificationEngine";

const { ok, fail } = respond;

function shapeConversation(row: any) {
  return {
    id: row.id, type: row.type, name: row.name, avatarUrl: row.avatar_url, color: row.color,
    lastMessagePreview: row.last_message_preview, lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count, otherUser: row.other_handle ? {
      id: row.other_user_id, handle: row.other_handle, displayName: row.other_display_name,
      avatarColor: row.other_avatar_color, avatarInitials: row.other_avatar_initials, verified: row.other_verified,
    } : null,
  };
}

// ── GET /messages/conversations ──────────────────────────────────────────
// Kept as raw SQL: a self-join to find "the other DM participant" plus
// NULLS LAST ordering doesn't translate cleanly to the query builder, and
// this exact query is already correct/battle-tested — no behavior risk
// from re-deriving it via relations.
async function listConversations(req: AuthedRequest, res: Response) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT c.*, cm.unread_count,
       ou.id as other_user_id, ou.handle as other_handle, ou.display_name as other_display_name,
       ou.avatar_color as other_avatar_color, ou.avatar_initials as other_avatar_initials, ou.verified as other_verified
     FROM conversation_members cm
     JOIN conversations c ON c.id = cm.conversation_id
     LEFT JOIN conversation_members ocm ON ocm.conversation_id = c.id AND ocm.user_id != ${req.user.id} AND c.type = 'dm'
     LEFT JOIN users ou ON ou.id = ocm.user_id
     WHERE cm.user_id = ${req.user.id} AND cm.left_at IS NULL
     ORDER BY c.last_message_at DESC NULLS LAST LIMIT 50
  `;
  return ok(res, { conversations: rows.map(shapeConversation) });
}

// ── POST /messages/conversations/dm — get or create a 1:1 conversation ───
async function getOrCreateDm(req: AuthedRequest, res: Response) {
  const { userId } = req.body;
  if (!userId) return fail(res, 400, "userId is required");
  if (userId === req.user.id) return fail(res, 400, "Cannot DM yourself");

  const existing: { id: string }[] = await prisma.$queryRaw`
    SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ${req.user.id}
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ${userId}
     WHERE c.type = 'dm' LIMIT 1
  `;
  if (existing.length) return ok(res, { conversationId: existing[0].id, created: false });

  const conv = await prisma.conversations.create({ data: { type: "dm", createdBy: req.user.id } });
  await prisma.conversationMembers.createMany({
    data: [{ conversationId: conv.id, userId: req.user.id }, { conversationId: conv.id, userId }],
  });
  return ok(res, { conversationId: conv.id, created: true }, 201);
}

// ── POST /messages/conversations/group — body: { name, member_ids: string[] } ─
async function createGroup(req: AuthedRequest, res: Response) {
  const { name, member_ids } = req.body;
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName || cleanName.length > 100) return fail(res, 400, "name is required (max 100 characters)");
  if (!Array.isArray(member_ids) || !member_ids.length) return fail(res, 400, "member_ids must be a non-empty array");

  const uniqueMemberIds = [...new Set(member_ids.filter((id: unknown) => typeof id === "string" && id !== req.user.id))];
  if (!uniqueMemberIds.length) return fail(res, 400, "Add at least one other member");

  const validMembers = await prisma.users.count({ where: { id: { in: uniqueMemberIds }, deletedAt: null } });
  if (validMembers !== uniqueMemberIds.length) return fail(res, 400, "One or more members were not found");

  const conv = await prisma.conversations.create({ data: { type: "group", name: cleanName, createdBy: req.user.id } });
  await prisma.conversationMembers.createMany({
    data: [
      { conversationId: conv.id, userId: req.user.id, role: "owner" },
      ...uniqueMemberIds.map((userId: string) => ({ conversationId: conv.id, userId, role: "member" })),
    ],
  });
  return ok(res, { conversationId: conv.id, conversation: { id: conv.id, type: conv.type, name: conv.name } }, 201);
}

// ── POST /messages/conversations/:id/members — body: { user_id } ──────────
async function addMember(req: AuthedRequest, res: Response) {
  const { user_id } = req.body;
  if (!user_id) return fail(res, 400, "user_id is required");

  const conv = await prisma.conversations.findUnique({ where: { id: req.params.id }, select: { type: true } });
  if (!conv || conv.type !== "group") return fail(res, 404, "Group conversation not found");

  const requester = await prisma.conversationMembers.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
  });
  if (!requester || requester.leftAt) return fail(res, 403, "Not a member of this group");

  const target = await prisma.users.findUnique({ where: { id: user_id }, select: { id: true } });
  if (!target) return fail(res, 404, "User not found");

  await prisma.conversationMembers.upsert({
    where: { conversationId_userId: { conversationId: req.params.id, userId: user_id } },
    create: { conversationId: req.params.id, userId: user_id, role: "member" },
    update: { leftAt: null },
  });
  return ok(res, { added: true }, 201);
}

// ── POST /messages/conversations/:id/leave ────────────────────────────────
async function leaveGroup(req: AuthedRequest, res: Response) {
  const conv = await prisma.conversations.findUnique({ where: { id: req.params.id }, select: { type: true } });
  if (!conv || conv.type !== "group") return fail(res, 400, "Can only leave a group conversation");

  const member = await prisma.conversationMembers.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
  });
  if (!member || member.leftAt) return fail(res, 404, "Not a member of this group");

  await prisma.conversationMembers.update({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
    data: { leftAt: new Date() },
  });
  return ok(res, { left: true });
}

// ── GET /messages/conversations/:id/messages ─────────────────────────────
async function listMessages(req: AuthedRequest, res: Response) {
  const member = await prisma.conversationMembers.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
  });
  if (!member || member.leftAt) return fail(res, 403, "Not a member of this conversation");

  const rows = await prisma.messages.findMany({
    where: { conversationId: req.params.id, isDeleted: false },
    include: { users: { select: { handle: true, displayName: true, avatarColor: true, avatarInitials: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  await prisma.conversationMembers.update({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
    data: { unreadCount: 0, lastReadAt: new Date() },
  });

  return ok(res, {
    messages: rows.reverse().map(m => ({
      id: m.id, content: m.content, contentType: m.contentType, replyToId: m.replyToId,
      sender: { id: m.senderId, handle: m.users.handle, displayName: m.users.displayName, avatarColor: m.users.avatarColor, avatarInitials: m.users.avatarInitials },
      createdAt: m.createdAt,
    })),
  });
}

// ── POST /messages/conversations/:id/messages ────────────────────────────
async function sendMessage(req: AuthedRequest, res: Response) {
  const { content, contentType } = req.body;
  if (!content?.trim()) return fail(res, 400, "content is required");

  const member = await prisma.conversationMembers.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } },
  });
  if (!member || member.leftAt) return fail(res, 403, "Not a member of this conversation");

  const msg = await prisma.messages.create({
    data: { conversationId: req.params.id, senderId: req.user.id, content: content.trim(), contentType: contentType || "text" },
  });

  await prisma.conversations.update({
    where: { id: req.params.id },
    data: { lastMessageId: msg.id, lastMessageAt: new Date(), lastMessagePreview: content.slice(0, 100) },
  });
  await prisma.conversationMembers.updateMany({
    where: { conversationId: req.params.id, userId: { not: req.user.id }, leftAt: null },
    data: { unreadCount: { increment: 1 } },
  });

  // Notify other members (excluding anyone who has left the conversation)
  const others = await prisma.conversationMembers.findMany({
    where: { conversationId: req.params.id, userId: { not: req.user.id }, leftAt: null },
    select: { userId: true },
  });
  for (const o of others) {
    const body = NotificationEngine.formatBody("dm", req.user.displayName);
    await prisma.notifications.create({
      data: { userId: o.userId, actorId: req.user.id, type: "dm", messageId: msg.id, conversationId: req.params.id, body },
    });
  }

  // Real-time push over Socket.IO if available
  const io = req.app.get("io");
  if (io) io.to(`conversation:${req.params.id}`).emit("message:new", { conversationId: req.params.id, message: { id: msg.id, content: msg.content, senderId: req.user.id, createdAt: msg.createdAt } });

  return ok(res, { message: { id: msg.id, content: msg.content, contentType: msg.contentType, createdAt: msg.createdAt } }, 201);
}

export = { listConversations, getOrCreateDm, createGroup, addMember, leaveGroup, listMessages, sendMessage };
