import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LogOut, MessageSquarePlus, Search, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyConversations } from "@/lib/chat-api";
import type { ConversationSummary } from "@/lib/chat-types";
import { formatChatTimestamp } from "@/lib/format";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "./UserAvatar";
import { NewChatDialog } from "./NewChatDialog";
import { cn } from "@/lib/utils";

export function ChatSidebar({ className }: { className?: string }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id: string }>();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listMyConversations(user.id);
      setItems(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: when new messages or participant rows come in, refresh the list.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sidebar:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  const filtered = items.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.other.display_name ?? "").toLowerCase().includes(q) ||
      (s.other.email ?? "").toLowerCase().includes(q) ||
      (s.conversation.last_message_preview ?? "").toLowerCase().includes(q)
    );
  });

  if (!user) return null;

  return (
    <aside className={cn("flex flex-col bg-card border-r min-h-0", className)}>
      <header className="flex items-center justify-between px-4 h-14 border-b bg-card">
        <h1 className="font-semibold text-base">Chats</h1>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" title="Profile">
            <Link to="/me"><UserIcon className="size-5" /></Link>
          </Button>
          <Button variant="ghost" size="icon" title="New chat" onClick={() => setNewOpen(true)}>
            <MessageSquarePlus className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Sign out" onClick={signOut}>
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search or start new chat"
            className="pl-9 bg-muted/40 border-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <p>No chats yet.</p>
            <Button
              variant="link"
              className="text-[#128C7E]"
              onClick={() => setNewOpen(true)}
            >
              Start a conversation
            </Button>
          </div>
        ) : (
          filtered.map((s) => (
            <Link
              key={s.conversation.id}
              to={`/c/${s.conversation.id}`}
              className={cn(
                "flex items-center gap-3 px-3 py-3 border-b border-border/50 hover:bg-accent transition-colors",
                activeId === s.conversation.id && "bg-accent",
              )}
            >
              <UserAvatar profile={s.other} className="size-12" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    {s.other.display_name ?? s.other.email ?? "Unknown"}
                  </span>
                  <span className={cn(
                    "text-[11px] shrink-0",
                    s.unreadCount > 0 ? "text-[#25D366] font-medium" : "text-muted-foreground",
                  )}>
                    {formatChatTimestamp(s.conversation.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-sm text-muted-foreground truncate">
                    {s.conversation.last_message_preview ?? "No messages yet"}
                  </span>
                  {s.unreadCount > 0 && (
                    <span className="bg-[#25D366] text-white text-[11px] font-medium rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shrink-0">
                      {s.unreadCount > 99 ? "99+" : s.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} myId={user.id} />
    </aside>
  );
}
