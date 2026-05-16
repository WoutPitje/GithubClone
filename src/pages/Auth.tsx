import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(2, "Enter a display name").max(40),
});

export default function AuthPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 chat-bg relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative mb-1">
            <div className="absolute inset-0 accent-grad blur-2xl opacity-50 rounded-full" />
            <div className="relative size-16 rounded-2xl accent-grad flex items-center justify-center text-white shadow-xl shadow-[var(--wa-accent)]/30">
              <MessageCircle className="size-8" strokeWidth={1.75} />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="accent-grad-text">WhatsClone</span>
          </h1>
          <p className="text-sm text-muted-foreground">Simple, fast, real-time messaging.</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 rounded-full p-1 bg-black/[0.04] dark:bg-white/[0.06] h-11">
            <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <SignInForm />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="glass border border-black/5 dark:border-white/10 rounded-3xl p-6 mt-4 shadow-xl shadow-black/5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full accent-grad text-white rounded-full h-11 shadow-md shadow-[var(--wa-accent)]/30 hover:opacity-90" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </Form>
    </div>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { display_name: values.displayName } },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    // Email confirmation is on → no session yet. Persist display name to profile
    // only when the user actually verifies and signs in. For now route to the
    // verify-email screen.
    if (!data.session) {
      navigate(`/auth/verify?email=${encodeURIComponent(values.email)}&name=${encodeURIComponent(values.displayName)}`, { replace: true });
      return;
    }
    // Autoconfirmed (some envs): set the display name on the profile and go in.
    await supabase.from("profiles").update({ display_name: values.displayName }).eq("id", data.session.user.id);
    navigate("/", { replace: true });
  }

  return (
    <div className="glass border border-black/5 dark:border-white/10 rounded-3xl p-6 mt-4 shadow-xl shadow-black/5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl><Input autoComplete="name" placeholder="Jane Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full accent-grad text-white rounded-full h-11 shadow-md shadow-[var(--wa-accent)]/30 hover:opacity-90" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Create account
          </Button>
        </form>
      </Form>
    </div>
  );
}
