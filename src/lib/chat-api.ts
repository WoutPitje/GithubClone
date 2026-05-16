import { supabase } from "@/integrations/supabase/client";
import type { Conversation, ConversationSummary, Message, Profile } from "./chat-types";

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url,status_text,last_seen_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function listOtherUsers(myId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url,status_text,last_seen_at")
    .neq("id", myId)
    .order("display_name", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Load all conversations the current user participates in, joined with the
 * other participant's profile and an unread count derived from my last_read_at.
 */
export async function listMyConversations(myId: string): Promise<ConversationSummary[]> {
  const { data: mine, error: e1 } = await supabase
    .from("conversation_participants")
    .select("conversation_id,last_read_at")
    .eq("user_id", myId);
  if (e1) throw e1;
  const convIds = (mine ?? []).map((m) => m.conversation_id);
  if (convIds.length === 0) return [];

  const [convsRes, partsRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id,created_at,last_message_at,last_message_preview")
      .in("id", convIds)
      .order("last_message_at", { ascending: false }),
    supabase
      .from("conversation_participants")
      .select("conversation_id,user_id")
      .in("conversation_id", convIds)
      .neq("user_id", myId),
  ]);
  if (convsRes.error) throw convsRes.error;
  if (partsRes.error) throw partsRes.error;

  const otherIds = Array.from(new Set((partsRes.data ?? []).map((p) => p.user_id)));
  const profsRes = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url,status_text,last_seen_at")
    .in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
  if (profsRes.error) throw profsRes.error;

  const profById = new Map<string, Profile>(
    (profsRes.data ?? []).map((p) => [p.id, p as Profile]),
  );
  const otherByConv = new Map<string, string>();
  for (const p of partsRes.data ?? []) otherByConv.set(p.conversation_id, p.user_id);
  const myLastReadByConv = new Map<string, string>(
    (mine ?? []).map((m) => [m.conversation_id, m.last_read_at]),
  );

  // Unread counts: one query per conv would be wasteful; do a single grouped query.
  // We approximate by fetching counts via a single SQL call per conv (small N for v1).
  const unreadCounts = await Promise.all(
    convIds.map(async (cid) => {
      const since = myLastReadByConv.get(cid);
      if (!since) return [cid, 0] as const;
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", cid)
        .neq("sender_id", myId)
        .gt("created_at", since);
      if (error) return [cid, 0] as const;
      return [cid, count ?? 0] as const;
    }),
  );
  const unreadMap = new Map<string, number>(unreadCounts);

  const summaries: ConversationSummary[] = [];
  for (const c of (convsRes.data as Conversation[]) ?? []) {
    const otherId = otherByConv.get(c.id);
    if (!otherId) continue;
    const other = profById.get(otherId);
    if (!other) continue;
    summaries.push({
      conversation: c,
      other,
      unreadCount: unreadMap.get(c.id) ?? 0,
      myLastReadAt: myLastReadByConv.get(c.id) ?? c.created_at,
    });
  }
  return summaries;
}

/**
 * Find or create a 1-on-1 conversation, atomically, via a SECURITY DEFINER RPC.
 * The RPC bypasses RLS for the insert path and double-checks identity itself.
 */
export async function getOrCreateDirectConversation(_myId: string, otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_direct_conversation", { _other_user: otherId });
  if (error) throw error;
  return data as string;
}

export async function getConversationPeer(myId: string, conversationId: string): Promise<Profile | null> {
  const { data: part, error } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", myId)
    .maybeSingle();
  if (error) throw error;
  if (!part) return null;
  const { data: p, error: e2 } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url,status_text,last_seen_at")
    .eq("id", part.user_id)
    .single();
  if (e2) throw e2;
  return (p as Profile) ?? null;
}

export async function listMessages(conversationId: string, limit = 100): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,attachment_path,created_at,edited_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as Message[]) ?? []).slice().reverse();
}

export async function sendMessage(opts: {
  conversationId: string;
  senderId: string;
  body?: string | null;
  attachmentPath?: string | null;
}): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: opts.conversationId,
      sender_id: opts.senderId,
      body: opts.body ?? null,
      attachment_path: opts.attachmentPath ?? null,
    })
    .select("id,conversation_id,sender_id,body,attachment_path,created_at,edited_at")
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markRead(conversationId: string, myId: string): Promise<void> {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", myId);
}

export async function getPeerLastRead(conversationId: string, myId: string): Promise<string | null> {
  const { data } = await supabase
    .from("conversation_participants")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .neq("user_id", myId)
    .maybeSingle();
  return (data?.last_read_at as string | undefined) ?? null;
}

export async function uploadAttachment(opts: {
  myId: string;
  conversationId: string;
  file: File;
}): Promise<string> {
  const ext = opts.file.name.split(".").pop() || "bin";
  const path = `${opts.myId}/${opts.conversationId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("chat-attachments").upload(path, opts.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: opts.file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string, ttlSec = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(path, ttlSec);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function publicAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl ?? null;
}
