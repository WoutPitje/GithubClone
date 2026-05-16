import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "@/hooks/use-session";
import { AuthGate, GuestOnly } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import AuthPage from "@/pages/Auth";
import VerifyEmailPage from "@/pages/VerifyEmail";
import HomePage from "@/pages/Home";
import ConversationPage from "@/pages/Conversation";
import ProfilePage from "@/pages/Profile";

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<GuestOnly><AuthPage /></GuestOnly>} />
          <Route path="/auth/verify" element={<GuestOnly><VerifyEmailPage /></GuestOnly>} />
          <Route element={<AuthGate><AppShell /></AuthGate>}>
            <Route index element={<HomePage />} />
            <Route path="c/:id" element={<ConversationPage />} />
          </Route>
          <Route path="/me" element={<AuthGate><ProfilePage /></AuthGate>} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
