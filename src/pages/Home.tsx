import { MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="hidden md:flex flex-col items-center justify-center h-full chat-bg text-center p-8">
      <div className="size-20 rounded-full bg-white/70 dark:bg-black/30 flex items-center justify-center mb-4">
        <MessageCircle className="size-10 text-[#128C7E]" />
      </div>
      <h2 className="text-xl font-medium">WhatsClone Web</h2>
      <p className="text-sm text-muted-foreground max-w-sm mt-2">
        Pick a conversation on the left, or start a new one. Messages sync across all your devices.
      </p>
    </div>
  );
}
