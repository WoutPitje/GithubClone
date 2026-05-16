import { useEffect, useState } from "react";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { signedUrl } from "@/lib/chat-api";
import type { Message } from "@/lib/chat-types";
import { formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message,
  mine,
  readByPeer,
}: {
  message: Message;
  mine: boolean;
  readByPeer: boolean;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (message.attachment_path) {
      setImgLoading(true);
      signedUrl(message.attachment_path).then((u) => {
        if (cancelled) return;
        setImgUrl(u);
        setImgLoading(false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [message.attachment_path]);

  const hasImage = !!message.attachment_path;
  const hasText = !!message.body;

  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[60%] rounded-3xl px-3.5 py-2 relative shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          mine ? "bubble-out rounded-br-md" : "bubble-in rounded-bl-md",
        )}
      >
        {hasImage && (
          <div
            className={cn(
              "rounded-2xl overflow-hidden bg-black/5 min-h-32 flex items-center justify-center",
              hasText ? "mb-1.5" : "",
            )}
          >
            {imgLoading || !imgUrl ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <img
                src={imgUrl}
                alt="attachment"
                className="max-w-full max-h-80 object-contain"
                loading="lazy"
              />
            )}
          </div>
        )}
        {hasText && (
          <p className="text-[14.5px] leading-snug whitespace-pre-wrap break-words pr-14 pl-0.5 text-foreground">
            {message.body}
          </p>
        )}
        <div className="absolute right-2.5 bottom-1 flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground/80">
            {formatMessageTime(message.created_at)}
          </span>
          {mine && (
            readByPeer ? (
              <CheckCheck className="size-3.5 text-[var(--wa-tick-read)]" />
            ) : (
              <Check className="size-3.5 text-muted-foreground/70" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
