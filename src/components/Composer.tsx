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
    <form
      onSubmit={onSubmit}
      className="bg-[#F0F2F5] dark:bg-[#1F2C33] border-t px-3 py-2 flex items-end gap-2"
    >
      {filePreview && (
        <div className="absolute bottom-[64px] left-3 bg-card border rounded-md p-2 shadow-md flex items-center gap-2">
          <img src={filePreview} alt="" className="size-14 rounded object-cover" />
          <Button variant="ghost" size="icon" type="button" onClick={clearFile}>
            <X className="size-4" />
          </Button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={pickFile}
        className="text-muted-foreground"
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
        className="resize-none min-h-10 max-h-40 bg-card rounded-2xl border-0 focus-visible:ring-1"
      />

      <Button
        type="submit"
        size="icon"
        disabled={sending || (!body.trim() && !file)}
        className="bg-[#25D366] hover:bg-[#1ebd5a] text-white shrink-0"
      >
        {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
      </Button>
    </form>
  );
}
