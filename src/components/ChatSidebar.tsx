import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LogOut, MessageSquarePlus, Search, Settings2 } from "lucide-react";
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
    <aside className={cn("flex flex-col min-h-0 bg-[var(--wa-surface)]", className)}>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="New chat"
            onClick={() => setNewOpen(true)}
            className="rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <MessageSquarePlus className="size-5" />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            title="Profile"
            className="rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Link to="/me"><Settings2 className="size-5" /></Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sign out"
            onClick={signOut}
            className="rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search chats"
            className="pl-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border-0 focus-visible:ring-2 focus-visible:ring-[var(--wa-accent)]/40"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-soft px-2 pb-3">
        {loading ? (
          <div className="space-y-2 px-2 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="size-12 rounded-full bg-black/5 dark:bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/5 rounded-full bg-black/5 dark:bg-white/5" />
                  <div className="h-3 w-3/5 rounded-full bg-black/5 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <div className="size-12 mx-auto rounded-2xl accent-grad opacity-80 mb-3 flex items-center justify-center text-white">
              <MessageSquarePlus className="size-6" />
            </div>
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new chat to say hi.</p>
            <Button
              variant="link"
              className="text-[var(--wa-accent-strong)] mt-2"
              onClick={() => setNewOpen(true)}
            >
              New chat
            </Button>
          </div>
        ) : (
          filtered.map((s) => (
            <Link
              key={s.conversation.id}
              to={`/c/${s.conversation.id}`}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors",
                activeId === s.conversation.id
                  ? "bg-black/[0.05] dark:bg-white/[0.06]"
                  : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
              )}
            >
              <UserAvatar profile={s.other} className="size-12" showPresence online />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    {s.other.display_name ?? s.other.email ?? "Unknown"}
                  </span>
                  <span className={cn(
                    "text-[11px] shrink-0 font-medium",
                    s.unreadCount > 0 ? "text-[var(--wa-accent-strong)]" : "text-muted-foreground",
                  )}>
                    {formatChatTimestamp(s.conversation.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-sm text-muted-foreground truncate">
                    {s.conversation.last_message_preview ?? "Say hi 👋"}
                  </span>
                  {s.unreadCount > 0 && (
                    <span className="accent-grad text-white text-[11px] font-semibold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shrink-0 shadow-sm">
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
