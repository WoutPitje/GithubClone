import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  getConversationPeer,
  getPeerLastRead,
  listMessages,
  markRead,
} from "@/lib/chat-api";
import type { Message, Profile } from "@/lib/chat-types";
import { dayKey, formatDaySeparator } from "@/lib/format";
import { MessageBubble } from "@/components/MessageBubble";
import { Composer } from "@/components/Composer";
import { UserAvatar } from "@/components/UserAvatar";

export default function ConversationPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const { user } = useSession();
  const navigate = useNavigate();
  const [peer, setPeer] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [peerLastRead, setPeerLastRead] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  const refreshPeerLastRead = useCallback(async () => {
    if (!user || !conversationId) return;
    const lr = await getPeerLastRead(conversationId, user.id);
    setPeerLastRead(lr);
  }, [user, conversationId]);

  // Initial load
  useEffect(() => {
    if (!user || !conversationId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getConversationPeer(user.id, conversationId),
      listMessages(conversationId),
      getPeerLastRead(conversationId, user.id),
    ])
      .then(([p, msgs, lr]) => {
        if (cancelled) return;
        if (!p) {
          toast.error("Conversation not found");
          navigate("/", { replace: true });
          return;
        }
        setPeer(p);
        setMessages(msgs);
        setPeerLastRead(lr);
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Failed to load chat");
      });
    return () => {
      cancelled = true;
    };
  }, [user, conversationId, navigate, scrollToBottom]);

  // Mark read on mount + whenever messages array changes (covers realtime arrivals).
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) return;
    markRead(conversationId, user.id);
  }, [user, conversationId, messages.length]);

  // Realtime: new messages, peer last_read_at updates, typing broadcasts.
  useEffect(() => {
    if (!user || !conversationId) return;
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          setTimeout(() => scrollToBottom(true), 30);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => refreshPeerLastRead(),
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const fromId = (payload.payload as { userId?: string })?.userId;
        if (!fromId || fromId === user.id) return;
        setPeerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2500);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, conversationId, scrollToBottom, refreshPeerLastRead]);

  function broadcastTyping() {
    if (!user || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
  }

  const groups = useMemo(() => {
    const byDay = new Map<string, Message[]>();
    for (const m of messages) {
      const k = dayKey(m.created_at);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k)!.push(m);
    }
    return Array.from(byDay.entries()).map(([k, items]) => ({
      key: k,
      label: formatDaySeparator(items[0].created_at),
      items,
    }));
  }, [messages]);

  if (!user || !conversationId) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="h-14 bg-[#075E54] text-white flex items-center gap-3 px-2 sm:px-4 shrink-0">
        <Link to="/" className="md:hidden p-2 -ml-1 rounded hover:bg-white/10">
          <ArrowLeft className="size-5" />
        </Link>
        <UserAvatar profile={peer} className="size-9" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {peer?.display_name ?? peer?.email ?? "…"}
          </div>
          <div className="text-[11px] text-white/70 truncate">
            {peerTyping ? "typing…" : peer?.status_text ?? "online"}
          </div>
        </div>
        <button className="p-2 rounded hover:bg-white/10" title="More">
          <MoreVertical className="size-5" />
        </button>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto chat-bg px-3 sm:px-6 py-3 space-y-2 min-h-0">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <div className="bg-white/80 dark:bg-black/30 rounded-lg px-3 py-2 text-xs text-muted-foreground max-w-xs">
              Messages are end-to-end vibes only. Say hi 👋
            </div>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="space-y-1.5">
              <div className="flex justify-center">
                <span className="bg-white/80 dark:bg-black/30 text-[11px] text-muted-foreground rounded-md px-2 py-0.5 shadow-sm">
                  {g.label}
                </span>
              </div>
              {g.items.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  mine={m.sender_id === user.id}
                  readByPeer={
                    !!peerLastRead && new Date(m.created_at).getTime() <= new Date(peerLastRead).getTime()
                  }
                />
              ))}
            </div>
          ))
        )}
      </div>

      <Composer
        conversationId={conversationId}
        myId={user.id}
        onSent={() => scrollToBottom(true)}
        onTyping={broadcastTyping}
      />
    </div>
  );
}
