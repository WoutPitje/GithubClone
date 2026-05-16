export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status_text: string | null;
  last_seen_at: string | null;
};

export type Conversation = {
  id: string;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
};

export type Participant = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  created_at: string;
  edited_at: string | null;
};

export type ConversationSummary = {
  conversation: Conversation;
  other: Profile;
  unreadCount: number;
  myLastReadAt: string;
};
