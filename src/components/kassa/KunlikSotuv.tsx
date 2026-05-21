import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Search, CalendarDays, Pencil, Printer, Trash2, Plus, Minus } from "lucide-react";
import {
  MOCK_RECEIPTS,
  formatSom,
  type Receipt,
} from "@/lib/mock-data";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

function fmtDate(d: Date) {
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function KunlikSotuv() {
  const [query, setQuery] = React.useState("");
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [, force] = React.useState(0);
  const [editing, setEditing] = React.useState<Receipt | null>(null);
  const [deleting, setDeleting] = React.useState<Receipt | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_RECEIPTS.filter((r) => {
      if (q && !r.id.toLowerCase().includes(q)) return false;
      const d = new Date(r.date);
      if (range?.from && range?.to) {
        return d >= range.from && d <= new Date(range.to.getTime() + 86_400_000 - 1);
      }
      // default: bugun
      return isSameDay(d, new Date("2026-05-07"));
    });
  }, [query, range]);

  const total = filtered.reduce((s, r) => s + r.total, 0);

  const handlePrint = (r: Receipt) => {
    toast.success(`Chek #${r.id} chop etildi`);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const idx = MOCK_RECEIPTS.findIndex((x) => x.id === deleting.id);
    if (idx >= 0) MOCK_RECEIPTS.splice(idx, 1);
    setDeleting(null);
    force((n) => n + 1);
    toast.success("Chek o'chirildi");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chek raqami orqali qidirish..."
            className="h-10 pl-9 text-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {range?.from && range?.to
                ? `${fmtDate(range.from)} — ${fmtDate(range.to)}`
                : "Bugun"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="border-t p-2">
              <Button size="sm" variant="ghost" className="w-full"
                onClick={() => setRange(undefined)}>
                Tozalash (bugun)
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <div className="ml-auto rounded-md border bg-muted/30 px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase text-muted-foreground">Jami summa</div>
          <div className="text-sm font-bold tabular-nums text-primary">{formatSom(total)}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Sotuvchi</th>
              <th className="px-3 py-2 text-left font-semibold">Chek raqami</th>
              <th className="px-3 py-2 text-right font-semibold">Summa</th>
              <th className="px-3 py-2 text-left font-semibold">Sana</th>
              <th className="w-32 px-3 py-2 text-center font-semibold">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-b hover:bg-muted/40"
                onDoubleClick={() => setEditing(r)}
              >
                <td className="px-3 py-2 font-medium">{r.cashier}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSom(r.total)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(r.date).toLocaleString("uz-UZ")}
                  {r.editedAt && (
                    <div className="text-[10px] text-amber-600">tahrir: {new Date(r.editedAt).toLocaleString("uz-UZ")}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8"
                      onClick={() => setEditing(r)} aria-label="Tahrir">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8"
                      onClick={() => handlePrint(r)} aria-label="Print">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(r)} aria-label="O'chirish">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Cheklar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditReceiptDialog
        receipt={editing}
        onClose={() => { setEditing(null); force((n) => n + 1); }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chekni o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.id} — {deleting && formatSom(deleting.total)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditReceiptDialog({
  receipt, onClose,
}: { receipt: Receipt | null; onClose: () => void }) {
  const [items, setItems] = React.useState(receipt?.items ?? []);

  React.useEffect(() => {
    setItems(receipt?.items ? receipt.items.map((it) => ({ ...it })) : []);
  }, [receipt]);

  if (!receipt) return null;

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const total = Math.max(0, subtotal - receipt.discount);

  const setQty = (idx: number, qty: number) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(0, qty) } : it));
  };
  const removeRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = () => {
    const r = MOCK_RECEIPTS.find((x) => x.id === receipt.id);
    if (r) {
      r.items = items.filter((it) => it.qty > 0);
      r.subtotal = r.items.reduce((s, it) => s + it.price * it.qty, 0);
      r.total = Math.max(0, r.subtotal - r.discount);
      r.editedAt = new Date().toISOString();
    }
    toast.success("Chek tahrirlandi");
    onClose();
  };

  return (
    <Dialog open={!!receipt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chek tahrirlash — {receipt.id}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left">Tovar</th>
                <th className="px-3 py-2 text-right">Narx</th>
                <th className="px-3 py-2 text-center">Miqdor</th>
                <th className="px-3 py-2 text-right">Jami</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatSom(it.price)}</td>
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => setQty(idx, it.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) => setQty(idx, parseFloat(e.target.value) || 0)}
                        className="h-7 w-14 rounded border bg-background px-1 text-center text-xs tabular-nums"
                      />
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => setQty(idx, it.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatSom(it.price * it.qty)}
                  </td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="outline"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeRow(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between rounded-md bg-primary/5 px-4 py-2">
          <span className="text-sm text-muted-foreground">Yangi jami:</span>
          <span className="text-lg font-bold text-primary tabular-nums">{formatSom(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button onClick={save}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
