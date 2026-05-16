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

  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[65%] rounded-lg px-2 py-1.5 shadow-sm relative",
          mine ? "bubble-out rounded-tr-none" : "bubble-in rounded-tl-none",
        )}
      >
        {message.attachment_path && (
          <div className="mb-1 rounded-md overflow-hidden bg-black/5 min-h-32 flex items-center justify-center">
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
        {message.body && (
          <p className="text-sm whitespace-pre-wrap break-words pr-12 pl-1 dark:text-white">
            {message.body}
          </p>
        )}
        <div className="flex items-center justify-end gap-1 -mt-1 -mb-0.5 -mr-0.5 pl-2">
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
          {mine && (
            readByPeer ? (
              <CheckCheck className="size-3.5 text-[#34B7F1]" />
            ) : (
              <Check className="size-3.5 text-muted-foreground" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
