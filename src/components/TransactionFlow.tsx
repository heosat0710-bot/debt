import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { peopleService } from "@/services/people.service";
import { transactionService } from "@/services/transaction.service";
import { debtService } from "@/services/debt.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatVnd,
  formatAmountInput,
  parseAmount,
  formatDate,
  toDateInput,
} from "@/lib/format";
import {
  TXN_LABEL,
  TXN_HINT,
  PAYMENT_LABEL,
  isPayment,
  signedAmount,
  type PaymentMethod,
  type Person,
  type TransactionType,
  type Txn,
} from "@/types";
import { ArrowLeft, Check, Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

const TYPES: TransactionType[] = [
  "DEBT_I_OWE",
  "DEBT_THEY_OWE",
  "PAYMENT_I_PAID",
  "PAYMENT_THEY_PAID",
];
const METHODS: PaymentMethod[] = ["CASH", "TRANSFER", "OTHER"];

function BalanceLine({ balance }: { balance: number }) {
  if (balance === 0)
    return <p className="text-sm text-muted-foreground">Không có công nợ</p>;
  const they = balance > 0;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">
        {they ? "Đang nợ bạn " : "Bạn đang nợ "}
      </span>
      <span
        className="font-semibold tabular"
        style={{ color: they ? "var(--credit)" : "var(--debit)" }}
      >
        {formatVnd(balance)}
      </span>
    </p>
  );
}

export function TransactionFlow({
  initialPersonId,
  editing,
  onDone,
}: {
  initialPersonId?: string | undefined;
  editing?: Txn | undefined;
  onDone: () => void;
}) {
  const { people, txns, user } = useApp();
  const [personId, setPersonId] = useState<string | null>(
    editing?.personId ?? initialPersonId ?? null,
  );
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: "", phone: "", note: "" });
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<TransactionType | null>(editing?.type ?? null);
  const [amountRaw, setAmountRaw] = useState(
    editing ? formatAmountInput(String(editing.amount)) : "",
  );
  const [content, setContent] = useState(editing?.content ?? "");
  const [method, setMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "CASH");
  const [date, setDate] = useState(
    toDateInput(editing?.transactionDate ?? Date.now()),
  );

  const results = useMemo(
    () => peopleService.search(people, query).slice(0, 20),
    [people, query],
  );
  const person = people.find((p) => p.id === personId) ?? null;
  const balance = personId ? debtService.balanceOf(txns, personId) : 0;
  const amount = parseAmount(amountRaw);

  useEffect(() => {
    if (query.trim() && !results.length) setNewPerson((s) => ({ ...s, name: query }));
  }, [query, results.length]);

  const preview = useMemo(() => {
    if (!type || !amount) return null;
    let base = balance;
    if (editing) base -= signedAmount(editing.type, editing.amount);
    return { before: balance, after: base + signedAmount(type, amount) };
  }, [type, amount, balance, editing]);

  const addPerson = async () => {
    if (!newPerson.name.trim() || !user) return;
    setSaving(true);
    try {
      const id = await peopleService.create(newPerson, user.id);
      setPersonId(id);
      setCreating(false);
      setQuery("");
      setNewPerson({ name: "", phone: "", note: "" });
    } catch (e) {
      toast.error("Không thêm được người: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!user || !personId || !type || !amount) return;
    setSaving(true);
    const input = {
      personId,
      type,
      amount,
      content,
      paymentMethod: isPayment(type) ? method : null,
      transactionDate: new Date(date + "T00:00:00").getTime(),
    };
    try {
      if (editing) {
        await transactionService.update(editing, input, user);
        toast.success("Đã cập nhật giao dịch");
      } else {
        await transactionService.create(input, user);
        toast.success("Đã lưu giao dịch");
      }
      onDone();
    } catch (e) {
      toast.error("Lưu thất bại: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Step 1: chọn người ---------- */
  if (!person) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên người..."
            className="h-14 pl-11 text-lg"
            inputMode="search"
          />
        </div>

        {creating ? (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="space-y-1.5">
              <Label>Tên *</Label>
              <Input
                autoFocus
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input
                value={newPerson.phone}
                inputMode="tel"
                onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input
                value={newPerson.note}
                onChange={(e) => setNewPerson({ ...newPerson, note: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreating(false)}>
                Hủy
              </Button>
              <Button
                className="flex-1"
                onClick={addPerson}
                disabled={!newPerson.name.trim() || saving}
              >
                {saving ? <Loader2 className="animate-spin" /> : null}
                Tạo và chọn
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="-mx-1">
              {results.map((p) => (
                <PersonRow key={p.id} person={p} txnsBalance={debtService.balanceOf(txns, p.id)} onSelect={() => setPersonId(p.id)} />
              ))}
              {query.trim() && !results.length ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Không tìm thấy người này
                </p>
              ) : null}
              {!query.trim() && !people.length ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Chưa có ai trong danh sách
                </p>
              ) : null}
            </div>
            <Button variant="outline" size="lg" onClick={() => setCreating(true)}>
              <UserPlus className="size-4" /> Thêm người mới
            </Button>
          </>
        )}
      </div>
    );
  }

  /* ---------- Step 2: ghi nhận giao dịch ---------- */
  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      <div className="flex items-start gap-3">
        {!editing && !initialPersonId ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 shrink-0"
            onClick={() => setPersonId(null)}
          >
            <ArrowLeft className="size-5" />
          </Button>
        ) : null}
        <div>
          <p className="text-lg font-semibold">{person.name}</p>
          <BalanceLine balance={balance} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TYPES.map((t) => {
          const on = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                on ? "border-primary bg-accent" : "bg-surface hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-semibold">{TXN_LABEL[t]}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                {TXN_HINT[t]}
              </span>
            </button>
          );
        })}
      </div>

      {type ? (
        <>
          <div>
            <Label className="text-muted-foreground">Số tiền</Label>
            <div className="flex items-baseline gap-2">
              <input
                autoFocus={!editing}
                value={amountRaw}
                onChange={(e) => setAmountRaw(formatAmountInput(e.target.value))}
                inputMode="numeric"
                placeholder="0"
                className="w-full min-w-0 bg-transparent text-amount font-semibold tabular outline-none placeholder:text-muted-foreground/40"
              />
              <span className="text-xl font-medium text-muted-foreground">₫</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nội dung</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              placeholder="Ví dụ: Mua 2 bó hoa"
            />
          </div>

          {isPayment(type) ? (
            <div className="space-y-1.5">
              <Label>Phương thức thanh toán</Label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-lg border py-2.5 text-sm font-medium ${
                      method === m ? "border-primary bg-accent" : "bg-surface"
                    }`}
                  >
                    {PAYMENT_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Ngày giao dịch</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12"
            />
          </div>

          {preview ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số dư hiện tại</span>
                <span className="tabular">{formatVnd(preview.before)}</span>
              </div>
              <div className="mt-1 flex justify-between font-semibold">
                <span>Sau giao dịch</span>
                <span
                  className="tabular"
                  style={{
                    color: preview.after >= 0 ? "var(--credit)" : "var(--debit)",
                  }}
                >
                  {formatVnd(preview.after)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {preview.after > 0
                  ? `${person.name} nợ bạn`
                  : preview.after < 0
                    ? `Bạn nợ ${person.name}`
                    : "Hết nợ"}{" "}
                · {formatDate(new Date(date + "T00:00:00").getTime())}
              </p>
            </div>
          ) : null}

          <Button size="lg" className="h-14 text-base" onClick={save} disabled={!amount || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check className="size-5" />}
            {editing ? "Cập nhật giao dịch" : "Lưu giao dịch"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function PersonRow({
  person,
  txnsBalance,
  onSelect,
}: {
  person: Person;
  txnsBalance: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{person.name}</p>
        {person.phone ? (
          <p className="text-xs text-muted-foreground">{person.phone}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        {txnsBalance === 0 ? (
          <span className="text-xs text-muted-foreground">Không nợ</span>
        ) : (
          <>
            <span className="block text-[11px] text-muted-foreground">
              {txnsBalance > 0 ? "Còn nợ mình" : "Mình đang nợ"}
            </span>
            <span
              className="text-sm font-semibold tabular"
              style={{ color: txnsBalance > 0 ? "var(--credit)" : "var(--debit)" }}
            >
              {formatVnd(txnsBalance)}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
