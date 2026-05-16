import { Link, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "your email";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[oklch(0.97_0.01_140)]">
      <div className="w-full max-w-md bg-card border rounded-2xl p-8 text-center">
        <div className="size-14 rounded-2xl bg-[#25D366] flex items-center justify-center text-white mx-auto mb-4">
          <Mail className="size-7" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Check your inbox</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.
        </p>
        <Button asChild className="w-full bg-[#25D366] hover:bg-[#1ebd5a]">
          <Link to="/auth">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
