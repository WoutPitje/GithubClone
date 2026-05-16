import { MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="hidden md:flex flex-col items-center justify-center h-full chat-bg text-center p-10">
      <div className="relative mb-6">
        <div className="absolute inset-0 accent-grad blur-2xl opacity-50 rounded-full" />
        <div className="relative size-24 rounded-3xl accent-grad flex items-center justify-center text-white shadow-xl shadow-[var(--wa-accent)]/30">
          <MessageCircle className="size-12" strokeWidth={1.5} />
        </div>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">
        <span className="accent-grad-text">WhatsClone</span> Web
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mt-3 leading-relaxed">
        Pick a conversation on the left, or start a new one. Messages sync across all your devices in real-time.
      </p>
      <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-[var(--wa-accent)] animate-pulse" />
        End-to-end vibes — your data, your servers
      </div>
    </div>
  );
}
