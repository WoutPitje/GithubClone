import { Outlet, useParams } from "react-router-dom";
import { ChatSidebar } from "./ChatSidebar";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { id } = useParams<{ id: string }>();
  const hasActive = !!id;
  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      <ChatSidebar
        className={cn(
          "w-full md:w-[360px] lg:w-[420px]",
          hasActive && "hidden md:flex",
        )}
      />
      <main className={cn("flex-1 min-w-0", !hasActive && "hidden md:block")}>
        <Outlet />
      </main>
    </div>
  );
}
