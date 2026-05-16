import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { publicAvatarUrl } from "@/lib/chat-api";
import { initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/chat-types";

export function UserAvatar({
  profile,
  className,
  showPresence,
  online,
}: {
  profile: Pick<Profile, "display_name" | "email" | "avatar_url"> | null | undefined;
  className?: string;
  showPresence?: boolean;
  online?: boolean;
}) {
  const url = publicAvatarUrl(profile?.avatar_url ?? null);
  return (
    <div className="relative shrink-0">
      <Avatar className={cn("size-10 ring-1 ring-black/5 dark:ring-white/5", className)}>
        {url ? <AvatarImage src={url} alt={profile?.display_name ?? ""} /> : null}
        <AvatarFallback className="accent-grad text-white font-semibold tracking-wide">
          {initialsFrom(profile?.display_name, profile?.email)}
        </AvatarFallback>
      </Avatar>
      {showPresence && (
        <span
          className={cn(
            "absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-[var(--wa-surface)]",
            online ? "bg-[var(--wa-accent)]" : "bg-muted-foreground/40",
          )}
        />
      )}
    </div>
  );
}
