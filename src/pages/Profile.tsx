import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getMyProfile } from "@/lib/chat-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserAvatar } from "@/components/UserAvatar";
import type { Profile } from "@/lib/chat-types";

const schema = z.object({
  display_name: z.string().min(1, "Required").max(40),
  status_text: z.string().max(140).optional().or(z.literal("")),
});

export default function ProfilePage() {
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: "", status_text: "" },
  });

  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id).then((p) => {
      setProfile(p);
      form.reset({
        display_name: p?.display_name ?? "",
        status_text: p?.status_text ?? "",
      });
    });
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: values.display_name,
        status_text: values.status_text || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Pick an image");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) throw upErr;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (profErr) throw profErr;
      const fresh = await getMyProfile(user.id);
      setProfile(fresh);
      toast.success("Avatar updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <header className="h-14 bg-[#075E54] text-white flex items-center gap-3 px-2 sm:px-4 shrink-0">
        <Link to="/" className="p-2 -ml-1 rounded hover:bg-white/10">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-medium">Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 max-w-xl w-full mx-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <UserAvatar profile={profile} className="size-28" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 size-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-md disabled:opacity-60"
              title="Change avatar"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3">{profile?.email}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About</FormLabel>
                  <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="bg-[#25D366] hover:bg-[#1ebd5a]"
              disabled={form.formState.isSubmitting}
            >
              Save
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
