-- Fixes for the chat schema:
--   1. SECURITY DEFINER RPC for creating 1-on-1 conversations atomically.
--   2. Rewrite RLS policies that hit `auth.uid()` directly using the
--      `(select auth.uid())` idiom — under some Postgres planning paths the
--      bare reference inside a policy evaluates as NULL even when the
--      caller is authenticated.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Atomic conversation creation
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_direct_conversation(_other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _me uuid := auth.uid();
  _existing uuid;
  _new uuid;
begin
  if _me is null then
    raise exception 'Not authenticated';
  end if;
  if _me = _other_user then
    raise exception 'Cannot start chat with yourself';
  end if;

  select cp1.conversation_id into _existing
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = _me
    and cp2.user_id = _other_user
    and cp1.user_id <> cp2.user_id
  limit 1;

  if _existing is not null then
    return _existing;
  end if;

  insert into public.conversations default values returning id into _new;
  insert into public.conversation_participants (conversation_id, user_id)
    values (_new, _me), (_new, _other_user);
  return _new;
end $$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rewrite policies that use auth.uid() with the (select auth.uid()) idiom
-- ─────────────────────────────────────────────────────────────────────────────

-- conversations
drop policy if exists "conversations_insert_authed" on public.conversations;
create policy "conversations_insert_authed" on public.conversations
  for insert with check ((select auth.uid()) is not null);

-- conversation_participants
drop policy if exists "participants_insert_self_or_member" on public.conversation_participants;
create policy "participants_insert_self_or_member" on public.conversation_participants
  for insert with check (
    (select auth.uid()) = user_id
    or public.is_conversation_member(conversation_id, (select auth.uid()))
  );

drop policy if exists "participants_update_self" on public.conversation_participants;
create policy "participants_update_self" on public.conversation_participants
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- messages
drop policy if exists "messages_insert_sender_member" on public.messages;
create policy "messages_insert_sender_member" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and public.is_conversation_member(conversation_id, (select auth.uid()))
  );

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
  for update using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete using ((select auth.uid()) = sender_id);

-- Storage: avatars
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (select auth.role()) = 'authenticated'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Storage: chat-attachments
drop policy if exists "chat_attach_insert_own" on storage.objects;
create policy "chat_attach_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and (select auth.role()) = 'authenticated'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "chat_attach_select_member" on storage.objects;
create policy "chat_attach_select_member" on storage.objects
  for select using (
    bucket_id = 'chat-attachments'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.conversation_participants cp
        where cp.user_id = (select auth.uid())
          and cp.conversation_id::text = (storage.foldername(name))[2]
      )
    )
  );

drop policy if exists "chat_attach_update_own" on storage.objects;
create policy "chat_attach_update_own" on storage.objects
  for update using (
    bucket_id = 'chat-attachments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "chat_attach_delete_own" on storage.objects;
create policy "chat_attach_delete_own" on storage.objects
  for delete using (
    bucket_id = 'chat-attachments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
