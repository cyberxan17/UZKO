import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  User,
  HandCoins,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  CalendarDays,
  Bot,
  Phone,
} from "lucide-react";
import {
  formatSom,
  type CreditCustomer,
  type CustomerType,
  type Currency,
  type RegularCustomer,
} from "@/lib/mock-data";
import { CustomerSearch } from "@/components/shared/CustomerSearch";
import {
  addCreditCustomer,
  addCreditSale,
  fullCustomerName,
  searchRegularCustomers,
  upsertRegularCustomer,
} from "@/lib/data-actions";
import { toast } from "sonner";
import type { FinalizeSaleDetails } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (details: FinalizeSaleDetails) => void;
};

const TYPE_OPTIONS: { value: CustomerType; label: string; icon: React.ReactNode }[] = [
  { value: "oddiy", label: "Oddiy", icon: <User className="h-4 w-4" /> },
  { value: "nasiya", label: "Nasiya", icon: <HandCoins className="h-4 w-4" /> },
];

export function FinalizeSaleDialog({ open, onOpenChange, total, onConfirm }: Props) {
  const [type, setType] = React.useState<CustomerType>("oddiy");
  const [search, setSearch] = React.useState("");
  const [picked, setPicked] = React.useState<CreditCustomer | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [showDueDate, setShowDueDate] = React.useState(false);
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [paidAmount, setPaidAmount] = React.useState("");

  const [sendBotUpdate, setSendBotUpdate] = React.useState(false);
  const [regularFirstName, setRegularFirstName] = React.useState("");
  const [regularLastName, setRegularLastName] = React.useState("");
  const [regularPhone, setRegularPhone] = React.useState("");
  const [selectedRegularId, setSelectedRegularId] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setType("oddiy");
      setSearch("");
      setPicked(null);
      setShowDueDate(false);
      setDueDate("");
      setNote("");
      setPaidAmount("");
      setSendBotUpdate(false);
      setRegularFirstName("");
      setRegularLastName("");
      setRegularPhone("");
      setSelectedRegularId("");
    }
  }, [open]);

  const paidNow = Math.min(Math.max(0, parseFloat(paidAmount) || 0), total);
  const debtAmount = Math.max(0, total - paidNow);
  const remaining = picked ? picked.limit - picked.currentDebt : 0;
  const newDebt = picked ? picked.currentDebt + debtAmount : 0;
  const overLimit = picked ? newDebt > picked.limit : false;

  const regularCandidates = React.useMemo(
    () => searchRegularCustomers(`${regularPhone} ${regularFirstName} ${regularLastName}`, 5),
    [regularFirstName, regularLastName, regularPhone],
  );

  const canConfirmRegular =
    !sendBotUpdate ||
    Boolean(regularFirstName.trim() && regularLastName.trim() && regularPhone.trim());
  const canConfirm =
    type === "oddiy" ? canConfirmRegular : !!picked && !overLimit && paidNow <= total;

  const handlePickRegular = (customer: RegularCustomer) => {
    setSelectedRegularId(customer.id);
    setRegularFirstName(customer.firstName);
    setRegularLastName(customer.lastName);
    setRegularPhone(customer.phone);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;

    if (type === "nasiya" && picked) {
      addCreditSale(picked, total, {
        note,
        dueDate: showDueDate && dueDate ? dueDate : undefined,
        paidAmount: paidNow,
      });
      toast.success(`Nasiyaga yozildi: ${fullCustomerName(picked)}`);
      onConfirm({
        customerType: type,
        customerId: picked.id,
        customerName: fullCustomerName(picked),
        customerPhone: picked.phone,
        paidAmount: paidNow,
        debtAmount,
      });
      onOpenChange(false);
      return;
    }

    let regularCustomer: RegularCustomer | null = null;
    if (sendBotUpdate) {
      regularCustomer = upsertRegularCustomer({
        firstName: regularFirstName,
        lastName: regularLastName,
        phone: regularPhone,
      });
      toast.success("Xaridor bot ro'yxatiga biriktirildi");
    }

    onConfirm({
      customerType: "oddiy",
      customerId: regularCustomer?.id,
      customerName: regularCustomer
        ? `${regularCustomer.firstName} ${regularCustomer.lastName}`
        : undefined,
      customerPhone: regularCustomer?.phone,
      paidAmount: total,
      debtAmount: 0,
      sendBotUpdate,
    });
    onOpenChange(false);
  };

  const handleNewCustomer = (customer: CreditCustomer) => {
    addCreditCustomer(customer);
    setPicked(customer);
    setSearch(fullCustomerName(customer));
    toast.success("Yangi nasiyachi qo'shildi");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[82dvh] max-w-3xl overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Savdoni yakunlash
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <div className="rounded-md bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground">To'lash uchun</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{formatSom(total)}</div>
            </div>

            <div className="space-y-2">
              <Label>Xaridor turi</Label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors",
                      type === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {type === "oddiy" && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Botga habar yuborish</div>
                  <div className="text-xs text-muted-foreground">
                    Ixtiyoriy: chek telefon raqami orqali yuboriladi
                  </div>
                </div>
                <Button
                  type="button"
                  variant={sendBotUpdate ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setSendBotUpdate((value) => !value)}
                  title="Botga xabar yuborish"
                  aria-label="Botga xabar yuborish"
                >
                  <Bot className="h-4 w-4" />
                </Button>
              </div>

              {sendBotUpdate && (
                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <div className="space-y-2">
                    <Label>Telefon raqami</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={regularPhone}
                        onChange={(event) => {
                          setRegularPhone(event.target.value);
                          setSelectedRegularId("");
                        }}
                        placeholder="+998 90 123 45 67"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {regularPhone.trim() && regularCandidates.length > 0 && (
                    <div className="space-y-2">
                      {regularCandidates.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handlePickRegular(customer)}
                          className={cn(
                            "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                            selectedRegularId === customer.id && "border-primary bg-primary/5",
                          )}
                        >
                          <div className="font-semibold">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="mb-1 block">Ism</Label>
                      <Input
                        value={regularFirstName}
                        onChange={(event) => setRegularFirstName(event.target.value)}
                        placeholder="Ism"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Familya</Label>
                      <Input
                        value={regularLastName}
                        onChange={(event) => setRegularLastName(event.target.value)}
                        placeholder="Familya"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === "nasiya" && (
            <div className="space-y-2 rounded-md border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Mijoz ism / familya</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setAddOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Yangi nasiyachi
                </Button>
              </div>

              <CustomerSearch
                value={search}
                onValueChange={(value) => {
                  setSearch(value);
                  setPicked(null);
                }}
                selectedId={picked?.id}
                onSelect={(customer) => {
                  setPicked(customer);
                  setSearch(fullCustomerName(customer));
                }}
                placeholder="Masalan: Olim Yusupov"
                limit={5}
                compact
              />

              {picked && (
                <div
                  className={cn(
                    "space-y-1 rounded-md border p-2 text-sm",
                    overLimit
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-success/30 bg-success/5",
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {overLimit ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {picked.firstName} {picked.lastName}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({picked.role})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    <Row label="Limit" value={formatSom(picked.limit)} />
                    <Row label="Joriy qarzi" value={formatSom(picked.currentDebt)} />
                    <Row label="Bo'sh limit" value={formatSom(remaining)} highlight />
                    <Row label="Bu olishi" value={formatSom(total)} />
                    <Row
                      label="Hozir berilgan"
                      value={formatSom(paidNow)}
                      highlight={paidNow > 0}
                    />
                    <Row label="Nasiyaga qoladi" value={formatSom(debtAmount)} danger={overLimit} />
                    <Row label="Yangi qarz" value={formatSom(newDebt)} danger={overLimit} />
                  </div>
                  {overLimit && (
                    <p className="text-xs font-medium text-destructive">
                      Limitdan oshib ketadi, mahsulot bera olmaysiz
                    </p>
                  )}
                </div>
              )}

              {picked && (
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-sm">Muddat</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                        <span className="text-xs font-medium text-muted-foreground">Berilgan</span>
                        <Input
                          type="number"
                          min={0}
                          max={total}
                          value={paidAmount}
                          onChange={(event) => setPaidAmount(event.target.value)}
                          placeholder="0"
                          className="h-7 w-28 border-0 p-0 text-right text-xs font-semibold shadow-none focus-visible:ring-0"
                        />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant={showDueDate ? "default" : "outline"}
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setShowDueDate((value) => !value)}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        Muddat belgilash
                      </Button>
                    </div>
                  </div>
                  {showDueDate && (
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {type === "nasiya" && picked && (
            <div className="space-y-2">
              <Label>Izoh</Label>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ixtiyoriy izoh..."
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Bekor
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Yakunlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleNewCustomer} />
    </>
  );
}

function Row({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}:</span>
      <span
        className={cn(
          "text-right font-medium tabular-nums",
          highlight && "text-success",
          danger && "font-semibold text-destructive",
        )}
      >
        {value}
      </span>
    </>
  );
}

function AddCustomerDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (c: CreditCustomer) => void;
}) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [phone2, setPhone2] = React.useState("");
  const [withLimit, setWithLimit] = React.useState(false);
  const [limit, setLimit] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>("UZS");

  React.useEffect(() => {
    if (!open) {
      setFirst("");
      setLast("");
      setPhone("");
      setPhone2("");
      setWithLimit(false);
      setLimit("");
      setCurrency("UZS");
    }
  }, [open]);

  const canSave = first.trim() && last.trim() && phone.trim();

  const save = () => {
    if (!canSave) return;
    const customer: CreditCustomer = {
      id: `c${Date.now()}`,
      firstName: first.trim(),
      lastName: last.trim(),
      phone: phone.trim(),
      role: "mijoz",
      limit: withLimit ? parseFloat(limit) || 0 : 0,
      limitCurrency: withLimit ? currency : "UZS",
      currentDebt: 0,
    };
    onSave(customer);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Yangi nasiyachi qo'shish
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Familya *</Label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="mb-1 block text-xs">Telefon raqami *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 ..." />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Telefon raqami 2 (ixtiyoriy)</Label>
          <Input
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
            placeholder="+998 ..."
          />
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Limit qo'yish</Label>
            <Button
              size="sm"
              variant={withLimit ? "default" : "outline"}
              onClick={() => setWithLimit((value) => !value)}
            >
              {withLimit ? "Qo'yiladi" : "Qo'ymaslik"}
            </Button>
          </div>
          {withLimit && (
            <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
              <div>
                <Label className="mb-1 block text-xs">Summa</Label>
                <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Valyuta</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">UZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
