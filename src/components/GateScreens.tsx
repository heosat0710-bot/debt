import { useState } from "react";
import type { FirebaseOptions } from "firebase/app";
import { saveFirebaseConfig } from "@/lib/firebase";
import { useApp } from "@/context/AppProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogIn, ShieldAlert, Clock, Loader2 } from "lucide-react";

function Screen({
  icon,
  title,
  desc,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      {icon}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {desc ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{desc}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function SetupScreen() {
  const { refreshConfig } = useApp();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    try {
      const jsonish = raw
        .replace(/^[\s\S]*?firebaseConfig\s*=\s*/, "")
        .replace(/;\s*$/, "")
        .trim();
      const normalized = jsonish
        .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,(\s*[}\]])/g, "$1");
      const cfg = JSON.parse(normalized) as FirebaseOptions;
      if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
        setError("Thiếu apiKey / projectId / appId.");
        return;
      }
      saveFirebaseConfig(cfg);
      refreshConfig();
      window.location.reload();
    } catch {
      setError("Không đọc được cấu hình. Dán nguyên khối firebaseConfig từ Firebase Console.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Kết nối Firebase</h1>
      <p className="text-sm text-muted-foreground">
        Dán cấu hình Firebase Web app (Project settings → Your apps → SDK setup). Nhớ bật
        Google Sign-In trong Authentication và thêm domain vào Authorized domains.
      </p>
      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={10}
        className="font-mono text-xs"
        placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button size="lg" onClick={save} disabled={!raw.trim()}>
        Lưu cấu hình
      </Button>
    </div>
  );
}

const AUTH_ERRORS: Record<string, string> = {
  "auth/operation-not-allowed":
    "Google Sign-In chưa được bật trong Firebase Console. Vào Authentication → Sign-in method → bật Google, rồi thử lại.",
  "auth/unauthorized-domain":
    "Domain này chưa nằm trong Authorized domains của Firebase. Thêm domain preview vào Authentication → Settings → Authorized domains.",
  "auth/popup-blocked": "Trình duyệt chặn popup đăng nhập. Hãy cho phép popup rồi thử lại.",
  "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập.",
  "auth/invalid-api-key": "API key Firebase không hợp lệ.",
};

export function SignInScreen() {
  const { signIn } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(AUTH_ERRORS[code] ?? (e as Error).message ?? "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Screen
      title="Công nợ nội bộ"
      desc="Đăng nhập bằng tài khoản Google được cấp quyền để tiếp tục."
    >
      <Button size="lg" className="w-full max-w-xs" onClick={go} disabled={loading}>
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        Đăng nhập bằng Google
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </Screen>
  );
}

export function PendingScreen() {
  const { user, signOutUser } = useApp();
  return (
    <Screen
      icon={<Clock className="size-10 text-muted-foreground" />}
      title="Tài khoản chưa được cấp quyền"
      desc={`${user?.email ?? ""} đã đăng nhập nhưng chưa được quản trị viên duyệt. Vui lòng liên hệ quản trị viên.`}
    >
      <Button variant="outline" onClick={signOutUser}>
        Đăng xuất
      </Button>
    </Screen>
  );
}

export function BlockedScreen() {
  const { user, signOutUser } = useApp();
  return (
    <Screen
      icon={<ShieldAlert className="size-10 text-destructive" />}
      title="Tài khoản đã bị khóa"
      desc={`${user?.email ?? ""} không còn quyền truy cập dữ liệu công nợ.`}
    >
      <Button variant="outline" onClick={signOutUser}>
        Đăng xuất
      </Button>
    </Screen>
  );
}
