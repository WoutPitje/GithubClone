-- WhatsApp-style 1-on-1 chat schema.
-- Adds: profile fields, conversations, participants, messages.
-- Plus storage buckets for avatars (public) and chat attachments (private).

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles: extend the existing table from 0001_init.sql
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists status_text text default 'Hey there! I am using WhatsClone.',
  add column if not exists last_seen_at timestamptz default now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Conversations (1-on-1 only for v1)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text
);

alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create index conversation_participants_user_idx
  on public.conversation_participants (user_id);

-- SECURITY DEFINER helper to avoid recursion when policies need to ask
-- "is the caller a member of this conversation?"
create or replace function public.is_conversation_member(_conversation_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = _conversation_id
      and user_id = _user_id
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Messages
-- ─────────────────────────────────────────────────────────────────────────────

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  attachment_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

alter table public.messages enable row level security;

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- Keep conversations.last_message_at and preview in sync when a message lands.
create or replace function public.bump_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = coalesce(
           nullif(left(new.body, 120), ''),
           case when new.attachment_path is not null then 'Photo' else null end
         )
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_insert_bump_conversation on public.messages;
create trigger on_message_insert_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_on_message();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- conversations: members can read; anyone authed can create a new one.
create policy "conversations_select_member" on public.conversations
  for select using (public.is_conversation_member(id, auth.uid()));

create policy "conversations_insert_authed" on public.conversations
  for insert with check (auth.uid() is not null);

-- conversation_participants: members can read the membership list of their own
-- conversations; users can add themselves OR (during creation) be added by the
-- conversation creator. For v1 we allow any authed user to insert a row where
-- the user_id is themselves, OR a row into a conversation they are already a
-- member of (lets you add the other party to a fresh conversation you just
-- created and inserted yourself into first).
create policy "participants_select_member" on public.conversation_participants
  for select using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "participants_insert_self_or_member" on public.conversation_participants
  for insert with check (
    auth.uid() = user_id
    or public.is_conversation_member(conversation_id, auth.uid())
  );

-- Only the participant themselves can update their own last_read_at.
create policy "participants_update_self" on public.conversation_participants
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- messages: members of the conversation read; only sender can insert (and only
-- into a conversation they belong to); only sender can edit/delete own.
create policy "messages_select_member" on public.messages
  for select using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "messages_insert_sender_member" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "messages_update_own" on public.messages
  for update using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy "messages_delete_own" on public.messages
  for delete using (auth.uid() = sender_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime: enable change streams + full row payloads
-- ─────────────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_participants;
alter publication supabase_realtime add table public.conversations;

alter table public.messages replica identity full;
alter table public.conversation_participants replica identity full;
alter table public.conversations replica identity full;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: avatars (public bucket) + chat-attachments (private, per-user path)
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
  values ('chat-attachments', 'chat-attachments', false)
  on conflict (id) do nothing;

-- Avatars: public bucket → read happens via the public CDN flag, no
-- storage.objects SELECT policy needed. Authed users can upload to their own
-- folder. Path convention: <auth.uid()>/<filename>.
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Chat attachments: private. Path convention: <auth.uid()>/<conversation_id>/<filename>
-- Uploader can only write under their own folder. Read is wider — any member
-- of the conversation can fetch — but only via signed URL minted by the app.
create policy "chat_attach_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "chat_attach_select_member" on storage.objects
  for select using (
    bucket_id = 'chat-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_conversation_member(
        ((storage.foldername(name))[2])::uuid,
        auth.uid()
      )
    )
  );

create policy "chat_attach_update_own" on storage.objects
  for update using (
    bucket_id = 'chat-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "chat_attach_delete_own" on storage.objects
  for delete using (
    bucket_id = 'chat-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
