import { Link, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "your email";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 chat-bg">
      <div className="w-full max-w-md glass border border-black/5 dark:border-white/10 rounded-3xl p-8 text-center shadow-xl shadow-black/5">
        <div className="relative mx-auto mb-5 size-16">
          <div className="absolute inset-0 accent-grad blur-2xl opacity-50 rounded-full" />
          <div className="relative size-16 rounded-2xl accent-grad flex items-center justify-center text-white shadow-lg shadow-[var(--wa-accent)]/30">
            <Mail className="size-8" strokeWidth={1.75} />
          </div>
        </div>
        <h1 className="text-xl font-semibold tracking-tight mb-2">Check your inbox</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account, then come back to sign in.
        </p>
        <Button asChild className="w-full accent-grad text-white rounded-full h-11 shadow-md shadow-[var(--wa-accent)]/30 hover:opacity-90">
          <Link to="/auth">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
