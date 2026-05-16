import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Image as ImageIcon, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage, uploadAttachment } from "@/lib/chat-api";

export function Composer({
  conversationId,
  myId,
  onSent,
  onTyping,
}: {
  conversationId: string;
  myId: string;
  onSent: () => void;
  onTyping: () => void;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Only images are supported in v1.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    e.target.value = "";
  }

  function clearFile() {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    const text = body.trim();
    if (!text && !file) return;
    setSending(true);
    try {
      let attachmentPath: string | null = null;
      if (file) {
        attachmentPath = await uploadAttachment({ myId, conversationId, file });
      }
      await sendMessage({ conversationId, senderId: myId, body: text || null, attachmentPath });
      setBody("");
      clearFile();
      onSent();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="glass border-t border-black/5 dark:border-white/10 px-3 sm:px-5 py-3 relative">
      {filePreview && (
        <div className="absolute -top-20 left-4 right-4 sm:right-auto bg-card border border-black/5 dark:border-white/10 rounded-2xl p-2 shadow-lg flex items-center gap-3 max-w-xs">
          <img src={filePreview} alt="" className="size-14 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file?.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {file ? `${Math.ceil(file.size / 1024)} KB` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={clearFile}
            className="rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="flex-1 flex items-end gap-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-3xl px-2 py-1.5 transition-all focus-within:bg-black/[0.06] dark:focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-[var(--wa-accent)]/30">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={pickFile}
            className="text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            title="Attach image"
          >
            <ImageIcon className="size-5" />
          </Button>

          <Textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              onTyping();
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a message"
            rows={1}
            className="resize-none min-h-9 max-h-40 bg-transparent border-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70 py-2 px-1"
          />
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={sending || (!body.trim() && !file)}
          className="accent-grad text-white shrink-0 rounded-full size-11 shadow-md shadow-[var(--wa-accent)]/30 hover:opacity-90 disabled:opacity-40 disabled:shadow-none transition-all"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </Button>
      </form>
    </div>
  );
}
