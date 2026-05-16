import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { publicAvatarUrl } from "@/lib/chat-api";
import { initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/chat-types";

export function UserAvatar({
  profile,
  className,
}: {
  profile: Pick<Profile, "display_name" | "email" | "avatar_url"> | null | undefined;
  className?: string;
}) {
  const url = publicAvatarUrl(profile?.avatar_url ?? null);
  return (
    <Avatar className={cn("size-10", className)}>
      {url ? <AvatarImage src={url} alt={profile?.display_name ?? ""} /> : null}
      <AvatarFallback className="bg-[#25D366]/15 text-[#075E54] font-medium">
        {initialsFrom(profile?.display_name, profile?.email)}
      </AvatarFallback>
    </Avatar>
  );
}
