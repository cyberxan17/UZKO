import * as React from "react";
import { Bot, HandCoins, Phone, ReceiptText, Search, Truck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import { addCreditCustomer, dispatchReceiptMessage, fullCustomerName } from "@/lib/data-actions";
import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_RECEIPT_DISPATCHES,
  MOCK_RECEIPTS,
  MOCK_REGULAR_CUSTOMERS,
  MOCK_SUPPLIER_REPORTS,
  formatSom,
  type CreditCustomer,
  type Currency,
  type CustomerDebtReceipt,
  type Receipt,
  type SupplierReport,
} from "@/lib/mock-data";
import { toast } from "sonner";

type Tab = "oddiy" | "nasiya" | "agent";
type Period = PeriodFilterValue;

type RegularRow = {
  id: string;
  name: string;
  phone: string;
  receiptCount: number;
  total: number;
  receipts: Receipt[];
  sentCount: number;
};

type CreditRow = {
  id: string;
  name: string;
  phone: string;
  botEnabled: boolean;
  debt: number;
  total: number;
  receipts: CustomerDebtReceipt[];
};

type AgentRow = {
  id: string;
  name: string;
  phone: string;
  botEnabled: boolean;
  total: number;
  paid: number;
  remaining: number;
  receipts: SupplierReport[];
};

type DetailState =
  | { type: "oddiy-customers"; title: string; rows: RegularRow[] }
  | { type: "oddiy-receipts"; title: string; rows: Receipt[] }
  | { type: "nasiya-debts"; title: string; rows: CreditRow[] }
  | { type: "nasiya-receipts"; title: string; rows: CustomerDebtReceipt[] }
  | {
      type: "agent-groups";
      title: string;
      rows: AgentRow[];
      metric: "count" | "total" | "remaining";
    }
  | { type: "agent-receipts"; title: string; rows: SupplierReport[] }
  | null;

type SelectedReceiptState =
  | { type: "oddiy"; receipt: Receipt }
  | { type: "nasiya"; receipt: CustomerDebtReceipt }
  | { type: "agent"; receipt: SupplierReport }
  | null;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isInside(dateIso: string, period: Period, from: string, to: string) {
  const d = new Date(dateIso);
  const now = new Date();
  if (period === "all") return true;
  if (period === "today") return d >= startOfDay(now);
  if (period === "week") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return d >= start;
  }
  if (period === "month") return d >= new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year") return d >= new Date(now.getFullYear(), 0, 1);
  const fromDate = from ? startOfDay(new Date(from)) : new Date("1970-01-01");
  const toDate = to ? new Date(`${to}T23:59:59`) : new Date("2999-12-31");
  return d >= fromDate && d <= toDate;
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ");
}

function nextAgentId() {
  const max = MOCK_SUPPLIER_REPORTS.reduce((acc, row) => {
    const parsed = Number.parseInt(row.agentId.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) && parsed > acc ? parsed : acc;
  }, 0);
  return `AG-${String(max + 1).padStart(4, "0")}`;
}

export function MijozlarPage() {
  const [tab, setTab] = React.useState<Tab>("oddiy");
  const [detail, setDetail] = React.useState<DetailState>(null);
  const [selectedReceipt, setSelectedReceipt] = React.useState<SelectedReceiptState>(null);
  const [period, setPeriod] = React.useState<Period>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [nameFilter, setNameFilter] = React.useState("");
  const [idFilter, setIdFilter] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [addCreditOpen, setAddCreditOpen] = React.useState(false);
  const [addAgentOpen, setAddAgentOpen] = React.useState(false);

  const regularRows = React.useMemo(() => {
    return MOCK_REGULAR_CUSTOMERS.map((customer) => {
      const receipts = MOCK_RECEIPTS.filter(
        (receipt) =>
          receipt.customerType === "oddiy" &&
          (receipt.customerId === customer.id || receipt.customerPhone === customer.phone) &&
          isInside(receipt.date, period, from, to),
      );
      const total = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
      return {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        phone: customer.phone,
        receiptCount: receipts.length,
        total,
        receipts,
        sentCount: MOCK_RECEIPT_DISPATCHES.filter(
          (item) =>
            item.recipientCategory === "oddiy" &&
            item.recipientId === customer.id &&
            isInside(item.date, period, from, to),
        ).length,
      };
    })
      .filter((row) => {
        if (nameFilter && !matches(row.name, nameFilter)) return false;
        if (idFilter && !matches(row.id, idFilter)) return false;
        return row.receiptCount > 0;
      })
      .sort((a, b) => b.total - a.total);
  }, [from, idFilter, nameFilter, period, refreshKey, to]);

  const creditRows = React.useMemo(() => {
    return MOCK_CREDIT_CUSTOMERS.map((customer) => {
      const receipts = (customer.receipts ?? []).filter((receipt) =>
        isInside(receipt.date, period, from, to),
      );
      const salesTotal = receipts
        .filter((receipt) => receipt.type === "sale")
        .reduce((sum, receipt) => sum + Math.max(receipt.amount, 0), 0);
      return {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        phone: customer.phone ?? "—",
        botEnabled: Boolean(customer.botEnabled),
        debt: customer.currentDebt,
        total: salesTotal,
        receipts,
      };
    })
      .filter((row) => {
        if (nameFilter && !matches(row.name, nameFilter)) return false;
        if (idFilter && !matches(row.id, idFilter)) return false;
        return row.debt > 0 || row.receipts.length > 0;
      })
      .sort((a, b) => b.debt - a.debt);
  }, [from, idFilter, nameFilter, period, refreshKey, to]);

  const agentRows = React.useMemo(() => {
    const map = new Map<string, AgentRow>();

    MOCK_SUPPLIER_REPORTS.forEach((report) => {
      if (!isInside(report.date, period, from, to)) return;
      const current = map.get(report.agentId) ?? {
        id: report.agentId,
        name: report.agentName,
        phone: report.agentPhone,
        botEnabled: false,
        total: 0,
        paid: 0,
        remaining: 0,
        receipts: [],
      };
      current.total += report.totalAmount;
      current.paid += report.paidAmount;
      current.remaining += report.remainingDebt;
      current.botEnabled = current.botEnabled || Boolean(report.botEnabled);
      current.receipts.push(report);
      map.set(report.agentId, current);
    });

    return Array.from(map.values())
      .filter((row) => {
        if (nameFilter && !matches(row.name, nameFilter)) return false;
        if (idFilter && !matches(row.id, idFilter)) return false;
        return true;
      })
      .sort((a, b) => b.total - a.total);
  }, [from, idFilter, nameFilter, period, refreshKey, to]);

  const regularSummary = {
    customers: regularRows.length,
    total: regularRows.reduce((sum, row) => sum + row.total, 0),
    receipts: regularRows.reduce((sum, row) => sum + row.receiptCount, 0),
  };

  const creditSummary = {
    customers: creditRows.length,
    totalDebt: creditRows.reduce((sum, row) => sum + row.debt, 0),
    totalSales: creditRows.reduce((sum, row) => sum + row.total, 0),
  };

  const agentSummary = {
    customers: agentRows.length,
    total: agentRows.reduce((sum, row) => sum + row.total, 0),
    remaining: agentRows.reduce((sum, row) => sum + row.remaining, 0),
  };

  const triggerRefresh = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const openRegularReceipts = React.useCallback((row: RegularRow) => {
    setDetail({
      type: "oddiy-receipts",
      title: `${row.name} savdo cheklari`,
      rows: row.receipts,
    });
  }, []);

  const openCreditReceipts = React.useCallback((row: CreditRow) => {
    setDetail({
      type: "nasiya-receipts",
      title: `${row.name} nasiya cheklari`,
      rows: row.receipts,
    });
  }, []);

  const openAgentReceipts = React.useCallback((row: AgentRow) => {
    setDetail({
      type: "agent-receipts",
      title: `${row.name} agent cheklari`,
      rows: row.receipts,
    });
  }, []);

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b bg-card p-3">
          <Button
            variant={tab === "oddiy" ? "default" : "outline"}
            onClick={() => setTab("oddiy")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Oddiy xaridorlar
          </Button>
          <Button
            variant={tab === "nasiya" ? "default" : "outline"}
            onClick={() => setTab("nasiya")}
            className="gap-2"
          >
            <HandCoins className="h-4 w-4" />
            Nasiyachilar
          </Button>
          <Button
            variant={tab === "agent" ? "default" : "outline"}
            onClick={() => setTab("agent")}
            className="gap-2"
          >
            <Truck className="h-4 w-4" />
            Agentlar
          </Button>
        </div>

        <div className="border-b bg-card/70 p-3">
          <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)_220px]">
            <PeriodFilter
              value={period}
              onValueChange={setPeriod}
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
            <Field label="Ism">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder="Mijoz yoki agent ismi"
                  className="pl-9"
                />
              </div>
            </Field>
            <Field label="ID">
              <Input
                value={idFilter}
                onChange={(event) => setIdFilter(event.target.value)}
                placeholder={tab === "agent" ? "AG-0001" : "ID orqali qidirish"}
              />
            </Field>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {tab === "oddiy" && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Kpi
                  title="Xizmat ko'rsatilgan xaridor"
                  value={`${regularSummary.customers} ta`}
                  onClick={() =>
                    setDetail({
                      type: "oddiy-customers",
                      title: "Xizmat ko'rsatilgan oddiy xaridorlar",
                      rows: regularRows,
                    })
                  }
                />
                <Kpi
                  title="Umumiy savdo summasi"
                  value={formatSom(regularSummary.total)}
                  accent
                  onClick={() =>
                    setDetail({
                      type: "oddiy-receipts",
                      title: "Oddiy xaridorlar cheklari",
                      rows: regularRows.flatMap((row) => row.receipts),
                    })
                  }
                />
                <Kpi
                  title="Cheklar soni"
                  value={`${regularSummary.receipts} ta`}
                  onClick={() =>
                    setDetail({
                      type: "oddiy-receipts",
                      title: "Oddiy xaridorlar cheklari",
                      rows: regularRows.flatMap((row) => row.receipts),
                    })
                  }
                />
              </div>

              <Card>
                <CardHeader className="border-b py-3">
                  <CardTitle className="text-base">Oddiy xaridorlar ro'yxati</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto p-0">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Mijoz</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-center">Cheklar</th>
                        <th className="px-4 py-3 text-center">Botga yuborilgan</th>
                        <th className="px-4 py-3 text-right">Savdo summasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regularRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{row.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline">{row.id}</Badge>
                              {row.botEnabled && (
                                <Badge variant="secondary" className="gap-1">
                                  <Bot className="h-3 w-3" />
                                  Bot
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {row.phone}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => openRegularReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {row.receiptCount}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">{row.sentCount}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openRegularReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.total)}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {regularRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "nasiya" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid flex-1 gap-3 md:grid-cols-3">
                  <Kpi title="Nasiyachi soni" value={`${creditSummary.customers} ta`} />
                  <Kpi title="Nasiya savdo summasi" value={formatSom(creditSummary.totalSales)} />
                  <Kpi
                    title="Joriy qarzdorlik"
                    value={formatSom(creditSummary.totalDebt)}
                    accent
                    onClick={() =>
                      setDetail({
                        type: "nasiya-debts",
                        title: "Nasiyachilar bo'yicha joriy qarz",
                        rows: creditRows.filter((row) => row.debt > 0),
                      })
                    }
                  />
                </div>
                <Button className="gap-2" onClick={() => setAddCreditOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Yangi nasiyachi
                </Button>
              </div>

              <Card>
                <CardHeader className="border-b py-3">
                  <CardTitle className="text-base">Nasiyachilar</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto p-0">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Mijoz</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-right">Savdo summasi</th>
                        <th className="px-4 py-3 text-right">Joriy qarz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-semibold">{row.name}</td>
                          <td className="px-4 py-3">{row.phone}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openCreditReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.total)}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openCreditReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.debt)}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {creditRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "agent" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid flex-1 gap-3 md:grid-cols-3">
                  <Kpi
                    title="Agentlar soni"
                    value={`${agentSummary.customers} ta`}
                    onClick={() =>
                      setDetail({
                        type: "agent-groups",
                        title: "Agentlar ro'yxati",
                        rows: agentRows,
                        metric: "count",
                      })
                    }
                  />
                  <Kpi
                    title="Umumiy aylanma"
                    value={formatSom(agentSummary.total)}
                    accent
                    onClick={() =>
                      setDetail({
                        type: "agent-groups",
                        title: "Agentlar bo'yicha umumiy aylanma",
                        rows: agentRows,
                        metric: "total",
                      })
                    }
                  />
                  <Kpi
                    title="Qolgan qarzimiz"
                    value={formatSom(agentSummary.remaining)}
                    onClick={() =>
                      setDetail({
                        type: "agent-groups",
                        title: "Agentlar bo'yicha qolgan qarz",
                        rows: agentRows.filter((row) => row.remaining > 0),
                        metric: "remaining",
                      })
                    }
                  />
                </div>
                <Button className="gap-2" onClick={() => setAddAgentOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Yangi agent
                </Button>
              </div>

              <Card>
                <CardHeader className="border-b py-3">
                  <CardTitle className="text-base">Agentlar ro'yxati</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto p-0">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Agent</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-center">Cheklar</th>
                        <th className="px-4 py-3 text-right">Umumiy summa</th>
                        <th className="px-4 py-3 text-right">Qoldiq</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{row.name}</div>
                            <Badge variant="outline" className="mt-1">
                              {row.id}
                            </Badge>
                            {row.botEnabled && (
                              <Badge variant="secondary" className="ml-1 mt-1 gap-1">
                                <Bot className="h-3 w-3" />
                                Bot
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">{row.phone || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => openAgentReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {row.receipts.length}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openAgentReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.total)}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openAgentReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.remaining)}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {agentRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[84dvh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {detail?.title}
            </DialogTitle>
          </DialogHeader>

          {detail?.type === "oddiy-customers" && (
            <div className="space-y-3">
              {detail.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openRegularReceipts(row)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-muted-foreground">{row.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Cheklar</div>
                    <div className="font-bold text-primary">{row.receiptCount} ta</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "oddiy-receipts" && (
            <div className="space-y-3">
              {detail.rows.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => setSelectedReceipt({ type: "oddiy", receipt })}
                  className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{receipt.id}</div>
                      <div className="text-sm text-muted-foreground">{fmtDate(receipt.date)}</div>
                    </div>
                    <div className="font-bold text-primary">{formatSom(receipt.total)}</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {receipt.customerName || "Oddiy xaridor"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "nasiya-debts" && (
            <div className="space-y-3">
              {detail.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openCreditReceipts(row)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {row.id} {row.phone !== "—" ? `· ${row.phone}` : ""}
                    </div>
                  </div>
                  <div className="font-bold text-primary">{formatSom(row.debt)}</div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "nasiya-receipts" && (
            <div className="space-y-3">
              {detail.rows.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => setSelectedReceipt({ type: "nasiya", receipt })}
                  className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{receipt.id}</div>
                      <div className="text-sm text-muted-foreground">{receipt.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{fmtDate(receipt.date)}</div>
                      <div className="font-bold text-primary">{formatSom(receipt.amount)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "agent-groups" && (
            <div className="space-y-3">
              {detail.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openAgentReceipts(row)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {row.id} {row.phone ? `· ${row.phone}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {detail.metric === "count"
                        ? "Cheklar soni"
                        : detail.metric === "remaining"
                          ? "Qoldiq"
                          : "Aylanma"}
                    </div>
                    <div className="font-bold text-primary">
                      {detail.metric === "count"
                        ? `${row.receipts.length} ta`
                        : formatSom(detail.metric === "remaining" ? row.remaining : row.total)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "agent-receipts" && (
            <div className="space-y-3">
              {detail.rows.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReceipt({ type: "agent", receipt: report })}
                  className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{report.id}</div>
                      <div className="text-sm text-muted-foreground">{fmtDate(report.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{formatSom(report.totalAmount)}</div>
                      <div className="text-sm text-muted-foreground">
                        Qoldiq: {formatSom(report.remainingDebt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-h-[84dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {selectedReceipt?.receipt.id}
            </DialogTitle>
          </DialogHeader>

          {selectedReceipt?.type === "oddiy" && (
            <div className="space-y-3 rounded-lg border p-4">
              <InfoRow label="Sana" value={fmtDate(selectedReceipt.receipt.date)} />
              <InfoRow
                label="Mijoz"
                value={selectedReceipt.receipt.customerName || "Oddiy xaridor"}
              />
              <div className="space-y-2">
                {selectedReceipt.receipt.items.map((item, index) => (
                  <div
                    key={`${selectedReceipt.receipt.id}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                  >
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.qty} x {formatSom(item.price)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-right text-lg font-bold text-primary">
                {formatSom(selectedReceipt.receipt.total)}
              </div>
            </div>
          )}

          {selectedReceipt?.type === "nasiya" && (
            <div className="space-y-3 rounded-lg border p-4">
              <InfoRow label="Sana" value={fmtDate(selectedReceipt.receipt.date)} />
              <InfoRow label="Turi" value={selectedReceipt.receipt.title} />
              <InfoRow label="Summa" value={formatSom(selectedReceipt.receipt.amount)} />
              {selectedReceipt.receipt.note && (
                <div className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {selectedReceipt.receipt.note}
                </div>
              )}
              {selectedReceipt.receipt.items.length > 0 && (
                <div className="space-y-2">
                  {selectedReceipt.receipt.items.map((item, index) => (
                    <div
                      key={`${selectedReceipt.receipt.id}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{formatSom(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedReceipt?.type === "agent" && (
            <div className="space-y-3 rounded-lg border p-4">
              <InfoRow label="Sana" value={fmtDate(selectedReceipt.receipt.date)} />
              <InfoRow label="Agent" value={selectedReceipt.receipt.agentName} />
              <InfoRow label="Agent ID" value={selectedReceipt.receipt.agentId} />
              <InfoRow
                label="Umumiy summa"
                value={formatSom(selectedReceipt.receipt.totalAmount)}
              />
              <InfoRow label="Berilgan" value={formatSom(selectedReceipt.receipt.paidAmount)} />
              <InfoRow label="Qoldiq" value={formatSom(selectedReceipt.receipt.remainingDebt)} />
              <div className="space-y-2">
                {selectedReceipt.receipt.items.map((item, index) => (
                  <div
                    key={`${selectedReceipt.receipt.id}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                  >
                    <span>{item.productName}</span>
                    <span className="text-muted-foreground">
                      {item.qty} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
              {selectedReceipt.receipt.note && (
                <div className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {selectedReceipt.receipt.note}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddCreditCustomerDialog
        open={addCreditOpen}
        onOpenChange={setAddCreditOpen}
        onSaved={() => {
          triggerRefresh();
          setTab("nasiya");
        }}
      />

      <AddAgentDialog
        open={addAgentOpen}
        onOpenChange={setAddAgentOpen}
        onSaved={() => {
          triggerRefresh();
          setTab("agent");
        }}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({
  title,
  value,
  accent,
  onClick,
}: {
  title: string;
  value: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const className = accent
    ? "rounded-lg border border-primary/30 bg-primary/5 p-4 text-left"
    : "rounded-lg border bg-card p-4 text-left";

  if (!onClick) {
    return (
      <div className={className}>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div
          className={accent ? "mt-2 text-2xl font-bold text-primary" : "mt-2 text-2xl font-bold"}
        >
          {value}
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${className} transition hover:bg-muted/30`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className={accent ? "mt-2 text-2xl font-bold text-primary" : "mt-2 text-2xl font-bold"}>
        {value}
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/20 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function AddCreditCustomerDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [phone2, setPhone2] = React.useState("");
  const [withLimit, setWithLimit] = React.useState(false);
  const [limit, setLimit] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>("UZS");
  const [sendBotUpdate, setSendBotUpdate] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFirst("");
      setLast("");
      setPhone("");
      setPhone2("");
      setWithLimit(false);
      setLimit("");
      setCurrency("UZS");
      setSendBotUpdate(false);
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
      botEnabled: sendBotUpdate,
      role: "mijoz",
      limit: withLimit ? Number.parseFloat(limit) || 0 : 0,
      limitCurrency: withLimit ? currency : "UZS",
      currentDebt: 0,
    };
    addCreditCustomer(customer);
    if (sendBotUpdate) {
      dispatchReceiptMessage({
        recipientCategory: "nasiya",
        recipientId: customer.id,
        recipientName: fullCustomerName(customer),
        phone: customer.phone,
        receiptId: customer.id,
        title: "Nasiyachi ro'yxatdan o'tdi",
        total: 0,
        note: `Nasiyachi kodi: ${customer.id}`,
      });
    }
    toast.success(`Yangi nasiyachi qo'shildi: ${fullCustomerName(customer)}`);
    onOpenChange(false);
    onSaved();
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
          <Label className="mb-1 block text-xs">Telefon raqami 2</Label>
          <Input
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
            placeholder="+998 ..."
          />
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Botga habar yuborish</div>
              <div className="text-xs text-muted-foreground">
                Yoqilganda nasiya savdo va qarz to'lovlari nasiyachi kodi orqali avtomatik yuboriladi
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={sendBotUpdate ? "default" : "outline"}
              onClick={() => setSendBotUpdate((value) => !value)}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              {sendBotUpdate ? "Yoqilgan" : "Yoqish"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
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

function AddAgentDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [note, setNote] = React.useState("");
  const [sendBotUpdate, setSendBotUpdate] = React.useState(false);
  const agentId = React.useMemo(() => nextAgentId(), [open]);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setPhone("");
      setNote("");
      setSendBotUpdate(false);
    }
  }, [open]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Agent ismini kiriting");
      return;
    }
    if (sendBotUpdate && !phone.trim()) {
      toast.error("Botga yuborish uchun agent telefonini kiriting");
      return;
    }
    const report: SupplierReport = {
      id: `sr-${Date.now()}`,
      date: new Date().toISOString(),
      addedBy: "Joriy foydalanuvchi",
      agentId,
      agentName: name.trim(),
      agentPhone: phone.trim(),
      botEnabled: sendBotUpdate,
      items: [],
      totalAmount: 0,
      paidAmount: 0,
      remainingDebt: 0,
      note: note.trim() || undefined,
    };
    MOCK_SUPPLIER_REPORTS.unshift(report);
    if (sendBotUpdate) {
      dispatchReceiptMessage({
        recipientCategory: "agent",
        recipientId: agentId,
        recipientName: report.agentName,
        phone: report.agentPhone,
        receiptId: agentId,
        title: "Agent ro'yxatdan o'tdi",
        total: 0,
        note: `Agent kodi: ${agentId}`,
      });
    }
    toast.success(`Yangi agent qo'shildi: ${agentId}`);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Yangi agent qo'shish
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs">Agent ID</Label>
            <Input value={agentId} readOnly className="font-mono font-semibold" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ism familiya"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998" />
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Botga habar yuborish</div>
                <div className="text-xs text-muted-foreground">
                  Yoqilganda agent prixod va to'lov cheklari agent kodi orqali avtomatik yuboriladi
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={sendBotUpdate ? "default" : "outline"}
                onClick={() => setSendBotUpdate((value) => !value)}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                {sendBotUpdate ? "Yoqilgan" : "Yoqish"}
              </Button>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Izoh</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Qo'shimcha ma'lumot"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={save}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
