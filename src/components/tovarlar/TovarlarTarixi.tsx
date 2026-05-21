import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MOCK_EDIT_HISTORY,
  MOCK_PRODUCT_HISTORY,
  MOCK_RETURN_RECEIPTS,
  formatSom,
  type ProductHistory,
  type ReturnReceipt,
} from "@/lib/mock-data";
import {
  ReturnReceiptDetailDialog,
  returnedByLabel,
} from "@/components/shared/ReturnReceiptDetailDialog";
import { useApp } from "@/lib/app-context";
import { CalendarDays, Eye, Filter, PackagePlus, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type Tab = "added" | "edited" | "returned";
type EditChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};
type FlexibleEditHistory = (typeof MOCK_EDIT_HISTORY)[number] & Record<string, unknown>;
type DateMode = "all" | "today" | "month" | "custom";

export function TovarlarTarixi() {
  const [tab, setTab] = React.useState<Tab>("added");
  const { t } = useApp();
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b bg-card p-3">
        <Button size="sm" variant={tab === "added" ? "default" : "outline"} onClick={() => setTab("added")}>{t("added_products")}</Button>
        <Button size="sm" variant={tab === "edited" ? "default" : "outline"} onClick={() => setTab("edited")}>{t("edited_products")}</Button>
        <Button size="sm" variant={tab === "returned" ? "default" : "outline"} onClick={() => setTab("returned")} className="gap-2"><RotateCcw className="h-4 w-4" /> Qaytgan tovarlar tarixi</Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "added" ? <AddedTable /> : tab === "edited" ? <EditedTable /> : <ReturnedTable />}
      </div>
    </div>
  );
}

function AddedTable() {
  const { t } = useApp();
  const [productQuery, setProductQuery] = React.useState("");
  const [dateMode, setDateMode] = React.useState<DateMode>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [detailRow, setDetailRow] = React.useState<ProductHistory | null>(null);

  const filtered = React.useMemo(
    () =>
      MOCK_PRODUCT_HISTORY.filter(
        (h) => matchesProductName(h.productName, productQuery) && matchesDateFilter(h.date, dateMode, from, to),
      ),
    [productQuery, dateMode, from, to],
  );

  return (
    <div className="flex h-full flex-col">
      <HistoryFilters
        productQuery={productQuery}
        onProductQueryChange={setProductQuery}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        summaryLabel="Jami kirim"
        summaryValue={formatSom(filtered.reduce((sum, h) => sum + h.qty * h.costPrice, 0))}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr className="border-b text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 text-left">{t("date")}</th>
              <th className="px-4 py-2 text-left">{t("product")}</th>
              <th className="px-4 py-2 text-right">{t("qty")}</th>
              <th className="px-4 py-2 text-right">{t("sale_price")}</th>
              <th className="px-4 py-2 text-right">{t("cost_price")}</th>
              <th className="px-4 py-2 text-left">{t("warehouse")}</th>
              <th className="px-4 py-2 text-left">{t("agent")}</th>
              <th className="px-4 py-2 text-left">{t("added_by")}</th>
              <th className="px-4 py-2 text-center">Ko'rish</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr
                key={h.id}
                className="cursor-pointer border-b hover:bg-muted/40"
                onClick={() => setDetailRow(h)}
              >
                <td className="px-4 py-2 text-muted-foreground">{fmtDate(h.date)}</td>
                <td className="px-4 py-2 font-medium">{h.productName}</td>
                <td className="px-4 py-2 text-right tabular-nums">{h.qty} {h.unit}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatSom(h.price)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatSom(h.costPrice)}</td>
                <td className="px-4 py-2">{h.warehouse}</td>
                <td className="px-4 py-2">{h.agentName || "-"}</td>
                <td className="px-4 py-2"><Badge variant="outline">{h.addedBy}</Badge></td>
                <td className="px-4 py-2 text-center">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Batafsil ko'rish">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  Tovar qo'shish tarixi topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductHistoryDetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}

function EditedTable() {
  const { t } = useApp();
  const [productQuery, setProductQuery] = React.useState("");
  const [dateMode, setDateMode] = React.useState<DateMode>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const filtered = React.useMemo(
    () =>
      MOCK_EDIT_HISTORY.filter(
        (h) => matchesProductName(h.productName, productQuery) && matchesDateFilter(h.date, dateMode, from, to),
      ),
    [productQuery, dateMode, from, to],
  );

  return (
    <div className="flex h-full flex-col">
      <HistoryFilters
        productQuery={productQuery}
        onProductQueryChange={setProductQuery}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        summaryLabel="Tahrirlar"
        summaryValue={`${filtered.length} ta`}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr className="border-b text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 text-left">{t("date")}</th>
              <th className="px-4 py-2 text-left">{t("product")}</th>
              <th className="px-4 py-2 text-left">O'zgarishlar</th>
              <th className="px-4 py-2 text-left">{t("action")}</th>
              <th className="px-4 py-2 text-left">{t("edited_by")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((history) => {
              const h = history as FlexibleEditHistory;
              const changes = getEditChanges(h);
              return (
                <tr key={h.id} className="border-b hover:bg-muted/40">
                  <td className="px-4 py-2 text-muted-foreground">{fmtDate(h.date)}</td>
                  <td className="px-4 py-2 font-medium">{h.productName}</td>
                  <td className="px-4 py-2">
                    <div className="flex max-w-3xl flex-wrap gap-1.5">
                      {changes.map((change) => (
                        <ChangeBadge key={`${h.id}-${change.field}`} change={change} unit={h.unit} />
                      ))}
                      {changes.length === 0 && (
                        <span className="text-muted-foreground">O'zgarish ma'lumoti yo'q</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant="outline"
                      className={h.action === "delete" ? "border-destructive/40 text-destructive" : ""}
                    >
                      {h.action === "delete" ? t("deleted") : t("edited")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{h.editedBy}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Tahrirlangan tovarlar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryFilters({
  productQuery,
  onProductQueryChange,
  dateMode,
  onDateModeChange,
  from,
  onFromChange,
  to,
  onToChange,
  summaryLabel,
  summaryValue,
}: {
  productQuery: string;
  onProductQueryChange: (value: string) => void;
  dateMode: DateMode;
  onDateModeChange: (value: DateMode) => void;
  from: string;
  onFromChange: (value: string) => void;
  to: string;
  onToChange: (value: string) => void;
  summaryLabel: string;
  summaryValue: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b bg-card p-3">
      <div className="min-w-[240px] flex-1">
        <Label className="mb-1 block text-xs">Tovar nomi bo'yicha qidirish</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={productQuery}
            onChange={(e) => onProductQueryChange(e.target.value)}
            placeholder="Masalan: sement, armatura..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="w-44">
        <Label className="mb-1 block text-xs">Sana filter</Label>
        <Select value={dateMode} onValueChange={(value) => onDateModeChange(value as DateMode)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha davr</SelectItem>
            <SelectItem value="today">Bugun</SelectItem>
            <SelectItem value="month">Bu oy</SelectItem>
            <SelectItem value="custom">Istalgan davr</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dateMode === "custom" && (
        <>
          <div>
            <Label className="mb-1 block text-xs">Boshlanish</Label>
            <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Tugash</Label>
            <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
          </div>
        </>
      )}

      <div className="ml-auto rounded-xl bg-primary/10 px-4 py-2 text-right text-sm text-primary">
        <div className="flex items-center gap-1 text-xs">
          <Filter className="h-3 w-3" />
          {summaryLabel}
        </div>
        <b>{summaryValue}</b>
      </div>
    </div>
  );
}

function ProductHistoryDetailDialog({
  row,
  onClose,
}: {
  row: ProductHistory | null;
  onClose: () => void;
}) {
  const hasSource = Boolean(row?.agentName || row?.agentId || row?.agentPhone);

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Tovar qo'shish ma'lumotlari
          </DialogTitle>
        </DialogHeader>

        {row && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Tovar</div>
                  <div className="text-lg font-bold">{row.productName}</div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {fmtDate(row.date)}
                </Badge>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Info label="Miqdor" value={`${row.qty} ${row.unit}`} />
              <Info label="Ombor" value={row.warehouse} />
              <Info label="Sotuv narxi" value={formatSom(row.price)} />
              <Info label="Tan narx" value={formatSom(row.costPrice)} />
              <Info label="Jami tan narx" value={formatSom(row.qty * row.costPrice)} />
              <Info label="Qo'shgan" value={row.addedBy} />
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-semibold">Qayerdan kelgani</div>
              {hasSource ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Info label="Agent kodi" value={row.agentId || "-"} />
                  <Info label="Agent ismi" value={row.agentName || "-"} />
                  <Info label="Telefon raqami" value={row.agentPhone || "-"} />
                  <Info label="Berilgan pul" value={formatSom(row.paidAmount ?? 0)} />
                  <Info label="Qarz summasi" value={formatSom(row.remainingDebt ?? 0)} />
                  <Info label="Izoh" value={row.note || "-"} />
                </div>
              ) : (
                <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  Bu kirimda agent yoki nasiya manbasi kiritilmagan.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function matchesProductName(productName: string, query: string) {
  const q = query.trim().toLowerCase();
  return !q || productName.toLowerCase().includes(q);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function matchesDateFilter(value: string, mode: DateMode, from: string, to: string) {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (mode === "today") return date >= startOfToday;
  if (mode === "month") return date >= startOfMonth;
  if (mode === "custom") {
    return (!from || date >= new Date(`${from}T00:00:00`)) && (!to || date <= new Date(`${to}T23:59:59`));
  }
  return true;
}

function ReturnedTable() {
  const [rows, setRows] = React.useState<ReturnReceipt[]>(() => [...MOCK_RETURN_RECEIPTS]);
  const [receiptQuery, setReceiptQuery] = React.useState("");
  const [dateMode, setDateMode] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [editRow, setEditRow] = React.useState<ReturnReceipt | null>(null);
  const [detailRow, setDetailRow] = React.useState<ReturnReceipt | null>(null);
  const [editTotal, setEditTotal] = React.useState(0);
  const [editReason, setEditReason] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = receiptQuery.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return rows.filter((r) => {
      const d = new Date(r.date);
      const byReceipt = !q || `${r.id} ${r.customerName}`.toLowerCase().includes(q);
      let byDate = true;
      if (dateMode === "today") byDate = d >= startOfToday;
      if (dateMode === "month") byDate = d >= startOfMonth;
      if (dateMode === "custom") {
        byDate = (!from || d >= new Date(`${from}T00:00:00`)) && (!to || d <= new Date(`${to}T23:59:59`));
      }
      return byReceipt && byDate;
    });
  }, [rows, receiptQuery, dateMode, from, to]);

  const deleteRow = (id: string) => {
    const ok = window.confirm("Qaytgan tovar tarixini o'chirasizmi?");
    if (!ok) return;
    const idx = MOCK_RETURN_RECEIPTS.findIndex((r) => r.id === id);
    if (idx >= 0) MOCK_RETURN_RECEIPTS.splice(idx, 1);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Qaytgan tovar tarixi o'chirildi");
  };

  const openEdit = (r: ReturnReceipt) => {
    setEditRow(r);
    setEditTotal(r.total);
    setEditReason(r.reason ?? "");
  };

  const saveEdit = () => {
    if (!editRow) return;
    editRow.total = Math.max(0, Number(editTotal) || 0);
    editRow.reason = editReason;
    editRow.editedAt = new Date().toISOString();
    editRow.editedBy = "Joriy foydalanuvchi";
    setRows([...MOCK_RETURN_RECEIPTS]);
    setEditRow(null);
    toast.success("Qaytgan tovar tarixi tahrirlandi", { description: "Tahrir vaqti qayd qilindi" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end gap-3 border-b bg-card p-3">
        <div className="min-w-[240px] flex-1">
          <Label className="mb-1 block text-xs">Chek raqami yoki mijoz bo'yicha qidirish</Label>
          <Input value={receiptQuery} onChange={(e) => setReceiptQuery(e.target.value)} placeholder="QT-0001 yoki Dilshod..." />
        </div>
        <div className="w-44">
          <Label className="mb-1 block text-xs">Sana filter</Label>
          <Select value={dateMode} onValueChange={setDateMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha davr</SelectItem>
              <SelectItem value="today">Bugun</SelectItem>
              <SelectItem value="month">Bu oy</SelectItem>
              <SelectItem value="custom">Istalgan davr</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {dateMode === "custom" && (
          <>
            <div><Label className="mb-1 block text-xs">Boshlanish</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label className="mb-1 block text-xs">Tugash</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </>
        )}
        <div className="ml-auto rounded-xl bg-primary/10 px-4 py-2 text-right text-sm text-primary">
          <div className="flex items-center gap-1 text-xs"><Filter className="h-3 w-3" /> Jami qaytgan</div>
          <b>{formatSom(filtered.reduce((s, r) => s + r.total, 0))}</b>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr className="border-b text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 text-left">Sana</th>
              <th className="px-4 py-2 text-left">Chek</th>
              <th className="px-4 py-2 text-left">Kim qaytargan</th>
              <th className="px-4 py-2 text-left">Qabul qilgan</th>
              <th className="px-4 py-2 text-left">Tovarlar</th>
              <th className="px-4 py-2 text-right">Summa</th>
              <th className="px-4 py-2 text-left">Tahrir vaqti</th>
              <th className="px-4 py-2 text-center">Amal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const returnedBy = returnedByLabel(r);
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b hover:bg-muted/40"
                  onClick={() => setDetailRow(r)}
                >
                  <td className="px-4 py-2 text-muted-foreground">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2 font-mono font-semibold">{r.id}</td>
                  <td className="px-4 py-2">
                    {returnedBy.name}
                    <div className="text-xs text-muted-foreground">{returnedBy.meta}</div>
                  </td>
                  <td className="px-4 py-2">{r.cashier}</td>
                  <td className="px-4 py-2">
                    <div className="max-w-[260px] truncate">{r.items.map((i) => `${i.name} (${i.qty} ${i.unit})`).join(", ")}</div>
                    <div className="text-xs text-muted-foreground">{r.reason ?? "—"}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{formatSom(r.total)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.editedAt ? fmtDate(r.editedAt) : "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(r);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteRow(r.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Qaytgan tovar tarixini tahrirlash</DialogTitle></DialogHeader>
          {editRow && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <b>{editRow.id}</b>
                <div className="text-muted-foreground">{editRow.customerName} · {fmtDate(editRow.date)}</div>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Qaytgan summa</Label>
                <Input type="number" value={editTotal} onChange={(e) => setEditTotal(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Izoh</Label>
                <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} />
              </div>
              <p className="rounded-lg bg-orange-50 p-2 text-xs text-orange-700">Saqlanganda tahrir vaqti avtomatik qayd qilinadi.</p>
              <Button onClick={saveEdit} className="w-full gap-2"><Pencil className="h-4 w-4" /> Saqlash</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ReturnReceiptDetailDialog receipt={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}

function getEditChanges(history: FlexibleEditHistory): EditChange[] {
  const directChanges = normalizeChanges(history.changes);
  if (directChanges.length > 0) return directChanges;

  const field = stringValue(history.field) || stringValue(history.fieldName) || stringValue(history.key);
  if (field && ("oldValue" in history || "newValue" in history)) {
    return [{ field, oldValue: history.oldValue, newValue: history.newValue }];
  }

  const pairs: Array<[string, string, string]> = [
    ["qty", "oldQty", "newQty"],
    ["price", "oldPrice", "newPrice"],
    ["salePrice", "oldSalePrice", "newSalePrice"],
    ["costPrice", "oldCostPrice", "newCostPrice"],
    ["unit", "oldUnit", "newUnit"],
    ["warehouse", "oldWarehouse", "newWarehouse"],
  ];

  return pairs
    .filter(([, oldKey, newKey]) => oldKey in history || newKey in history)
    .map(([changeField, oldKey, newKey]) => ({
      field: changeField,
      oldValue: history[oldKey],
      newValue: history[newKey],
    }));
}

function normalizeChanges(value: unknown): EditChange[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const field = stringValue(record.field) || stringValue(record.fieldName) || stringValue(record.key);
        if (!field) return null;
        return {
          field,
          oldValue: record.oldValue ?? record.old,
          newValue: record.newValue ?? record.new,
        };
      })
      .filter((item): item is EditChange => Boolean(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([field, change]) => {
      if (change && typeof change === "object") {
        const record = change as Record<string, unknown>;
        return {
          field,
          oldValue: record.oldValue ?? record.old,
          newValue: record.newValue ?? record.new,
        };
      }
      return { field, oldValue: undefined, newValue: change };
    });
  }

  return [];
}

function ChangeBadge({ change, unit }: { change: EditChange; unit?: string }) {
  return (
    <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
      <span className="font-semibold">{fieldLabel(change.field)}: </span>
      <span className="text-muted-foreground">{formatChangeValue(change.field, change.oldValue, unit)}</span>
      <span className="px-1 text-muted-foreground">-&gt;</span>
      <span className="font-semibold">{formatChangeValue(change.field, change.newValue, unit)}</span>
    </span>
  );
}

function fieldLabel(field: string) {
  const normalized = normalizeFieldName(field);
  if (["qty", "quantity", "amount", "miqdor"].includes(normalized)) return "Miqdor";
  if (["price", "saleprice", "narx"].includes(normalized)) return "Narx";
  if (["costprice", "cost", "tannarx"].includes(normalized)) return "Tan narx";
  if (["unit", "birlik"].includes(normalized)) return "Birlik";
  if (["warehouse", "ombor"].includes(normalized)) return "Ombor";
  return field;
}

function formatChangeValue(field: string, value: unknown, unit?: string) {
  if (value === undefined || value === null || value === "") return "-";
  const normalized = normalizeFieldName(field);
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numeric) && ["price", "saleprice", "costprice", "cost"].includes(normalized)) {
    return formatSom(numeric);
  }
  if (Number.isFinite(numeric) && ["qty", "quantity", "amount"].includes(normalized)) {
    return `${numeric} ${unit ?? ""}`.trim();
  }
  return String(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeFieldName(field: string) {
  return field.toLowerCase().replace(/[\s_-]/g, "");
}
