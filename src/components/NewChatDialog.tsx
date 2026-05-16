import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getOrCreateDirectConversation, listOtherUsers } from "@/lib/chat-api";
import { UserAvatar } from "./UserAvatar";
import type { Profile } from "@/lib/chat-types";

export function NewChatDialog({
  open,
  onOpenChange,
  myId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  myId: string;
}) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listOtherUsers(myId)
      .then(setUsers)
      .catch((e) => toast.error(e.message ?? "Failed to load contacts"))
      .finally(() => setLoading(false));
  }, [open, myId]);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  });

  async function startChat(other: Profile) {
    try {
      setCreatingId(other.id);
      const convId = await getOrCreateDirectConversation(myId, other.id);
      onOpenChange(false);
      navigate(`/c/${convId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start chat");
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search contacts"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pb-2">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-8">No users found.</p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => startChat(u)}
                disabled={creatingId === u.id}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent transition-colors text-left disabled:opacity-50"
              >
                <UserAvatar profile={u} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.display_name ?? u.email ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.status_text ?? u.email}</div>
                </div>
                {creatingId === u.id && <Loader2 className="size-4 animate-spin" />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
