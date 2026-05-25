import { useEffect, useState } from "react";
import type { UserRole } from "../../shared/types";
import { AuthScreen } from "./screens/AuthScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { MonitorScreen } from "./screens/MonitorScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { FuturisticBackground } from "./components/ui/FuturisticBackground";
import { api } from "./lib/api";
import { requestNotificationPermission } from "./lib/notifications";

type Screen = "auth" | "admin" | "monitor" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const routeAfterLogin = (username: string, userRole: UserRole) => {
    setUser(username);
    setRole(userRole);
    setBootError(null);
    setScreen(userRole === "admin" ? "admin" : "monitor");
    void requestNotificationPermission();
  };

  useEffect(() => {
    (async () => {
      try {
        const { session } = await api.auth.getSession();
        if (!session) {
          setScreen("auth");
          return;
        }
        routeAfterLogin(session.username, session.role);
      } catch (e) {
        setBootError(e instanceof Error ? e.message : "Sessiya xatosi");
        setScreen("auth");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#020408]">
        <FuturisticBackground variant="login" />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-cyan-500/30 border-t-amber-400" />
          <p className="text-sm tracking-widest text-cyan-400">YUKLANMOQDA</p>
        </div>
      </div>
    );
  }

  if (screen === "auth") {
    return (
      <>
        {bootError && (
          <div className="fixed inset-x-0 top-0 z-50 bg-red-950/90 px-4 py-2 text-center text-xs text-red-200">
            {bootError}
          </div>
        )}
        <AuthScreen
          onLogin={(username, userRole) => {
            routeAfterLogin(username, userRole);
          }}
        />
      </>
    );
  }

  if (screen === "admin") {
    return (
      <AdminScreen
        username={user ?? ""}
        onOpenMonitor={() => setScreen("monitor")}
        onLogout={async () => {
          await api.auth.logout();
          setUser(null);
          setRole(null);
          setScreen("auth");
        }}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        username={user ?? ""}
        onBack={() => setScreen("monitor")}
      />
    );
  }

  return (
    <MonitorScreen
      username={user ?? ""}
      isAdmin={role === "admin"}
      onOpenAdmin={() => setScreen("admin")}
      onOpenSettings={() => setScreen("settings")}
      onLogout={async () => {
        await api.auth.logout();
        setUser(null);
        setRole(null);
        setScreen("auth");
      }}
    />
  );
}
