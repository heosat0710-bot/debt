import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useApp } from "@/context/AppProvider";
import {
  LoadingScreen,
  SetupScreen,
  SignInScreen,
  PendingScreen,
  BlockedScreen,
} from "@/components/GateScreens";
import { TransactionFlow } from "@/components/TransactionFlow";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Txn } from "@/types";
import { LayoutGrid, Users, Receipt, Plus, MoreHorizontal, UserCog, CloudOff } from "lucide-react";

interface SheetState {
  open: boolean;
  personId?: string;
  editing?: Txn;
}

const SheetCtx = createContext<{
  openTxn: (opts?: { personId?: string; editing?: Txn }) => void;
} | null>(null);

export function useTxnSheet() {
  const ctx = useContext(SheetCtx);
  if (!ctx) throw new Error("useTxnSheet outside provider");
  return ctx;
}

const NAV = [
  { to: "/", label: "Tổng quan", icon: LayoutGrid },
  { to: "/debts", label: "Công nợ", icon: Users },
  { to: "/transactions", label: "Giao dịch", icon: Receipt },
  { to: "/more", label: "Khác", icon: MoreHorizontal },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { access, isAdmin, offline } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const openTxn = useCallback(
    (opts?: { personId?: string; editing?: Txn }) =>
      setSheet({ open: true, ...opts }),
    [],
  );

  if (access === "LOADING") return <LoadingScreen />;
  if (access === "NO_CONFIG") return <SetupScreen />;
  if (access === "SIGNED_OUT") return <SignInScreen />;
  if (access === "PENDING") return <PendingScreen />;
  if (access === "BLOCKED") return <BlockedScreen />;

  const items = isAdmin
    ? [...NAV.slice(0, 3), { to: "/users", label: "Người dùng", icon: UserCog }, NAV[3]]
    : NAV;

  return (
    <SheetCtx.Provider value={{ openTxn }}>
      <div className="mx-auto min-h-screen w-full max-w-lg pb-28">
        {offline ? (
          <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-debit-soft py-1.5 text-xs font-medium" style={{ color: "var(--debit)" }}>
            <CloudOff className="size-3.5" /> Đang offline — hiển thị dữ liệu đã lưu
          </div>
        ) : null}
        {children}
      </div>

      <Button
        size="lg"
        onClick={() => openTxn()}
        className="fixed right-4 bottom-24 z-40 h-14 rounded-full pr-6 pl-5 shadow-lg"
      >
        <Plus className="size-5" /> Giao dịch
      </Button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur safe-bottom">
        <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
          {items.map((item) => {
            const activeTab =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  activeTab ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet
        open={sheet.open}
        onOpenChange={(o: boolean) => setSheet((s) => ({ ...s, open: o }))}
      >
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[88dvh] max-w-lg flex-col gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-4 text-left">
            <SheetTitle>
              {sheet.editing ? "Sửa giao dịch" : "Ghi nhận giao dịch"}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4">
            {sheet.open ? (
              <TransactionFlow
                initialPersonId={sheet.personId}
                editing={sheet.editing}
                onDone={() => setSheet({ open: false })}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </SheetCtx.Provider>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pt-6 pb-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
