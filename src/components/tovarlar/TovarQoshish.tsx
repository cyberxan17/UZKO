import * as React from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Barcode,
  ImagePlus,
  Search,
  Plus,
  Minus,
  Check,
  Database,
  FileSpreadsheet,
  Upload,
  Truck,
  Lock,
  PackageCheck,
} from "lucide-react";
import {
  MOCK_PRODUCTS,
  MOCK_RATES,
  MOCK_PRODUCT_HISTORY,
  MOCK_SUPPLIER_REPORTS,
  MOCK_RECEIPT_DISPATCHES,
  formatSom,
  costInSom,
} from "@/lib/mock-data";
import type { Currency, Product } from "@/lib/mock-data";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { dispatchSupplierReceipt } from "@/lib/data-actions";
import type { ProductCreateMode } from "@/routes/tovarlar";

type ImportProductRow = {
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  unit: string;
  warehouse: string;
};

type NewProductRow = {
  id: string;
  name: string;
  barcode: string;
  qty: string;
  costCurrency: Currency;
  costPrice: string;
  price: string;
  wholesalePrice: string;
  unit: string;
  shelfLocation: string;
};

type SupplierSource = {
  enabled: boolean;
  agentId: string;
  agentName: string;
  agentPhone: string;
  paidAmount: string;
  note: string;
  sendBotUpdate: boolean;
};

const makeNewProductRow = (unit = "dona"): NewProductRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  barcode: "",
  qty: "",
  costCurrency: "UZS",
  costPrice: "",
  price: "",
  wholesalePrice: "",
  unit,
  shelfLocation: "",
});

function readCell(row: Record<string, unknown>, keys: string[]) {
  const normalized = new Map(
    Object.entries(row).map(([key, value]) => [
      key.trim().toLowerCase().replace(/\s+/g, " "),
      value,
    ]),
  );
  for (const key of keys) {
    const value = normalized.get(key.trim().toLowerCase().replace(/\s+/g, " "));
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function toNumber(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function makeProductCode(name: string) {
  return (
    name
      .trim()
      .slice(0, 4)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") + Math.floor(Math.random() * 99)
  );
}

function makeBarcode() {
  return "8690" + String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
}

function makeUniqueBarcode(used: Iterable<string> = []) {
  const usedSet = new Set(
    [
      ...MOCK_PRODUCTS.flatMap((product) => splitBarcodes(product.barcode)),
      ...Array.from(used).flatMap((value) => splitBarcodes(value)),
    ].filter(Boolean),
  );
  let barcode = makeBarcode();
  while (usedSet.has(barcode)) barcode = makeBarcode();
  return barcode;
}

function splitBarcodes(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinBarcodes(values: string[]) {
  return values
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" | ");
}

function makeAgentId() {
  const next = MOCK_SUPPLIER_REPORTS.length + 1;
  return `AG-${String(next).padStart(4, "0")}`;
}

function getAgents() {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      phone: string;
      botEnabled: boolean;
      totalAmount: number;
      paidAmount: number;
      remainingDebt: number;
    }
  >();
  MOCK_SUPPLIER_REPORTS.forEach((row) => {
    if (!row.agentId) return;
    const current = map.get(row.agentId);
    map.set(row.agentId, {
      id: row.agentId,
      name: row.agentName || "Nomsiz agent",
      phone: row.agentPhone || "",
      botEnabled: (current?.botEnabled ?? false) || Boolean(row.botEnabled),
      totalAmount: (current?.totalAmount ?? 0) + row.totalAmount,
      paidAmount: (current?.paidAmount ?? 0) + row.paidAmount,
      remainingDebt: (current?.remainingDebt ?? 0) + row.remainingDebt,
    });
  });
  return Array.from(map.values());
}

function recordProductAddition(input: {
  productName: string;
  qty: number;
  unit: string;
  price: number;
  costPrice: number;
  warehouse: string;
  addedBy: string;
  source?: SupplierSource;
}) {
  const sourceEnabled = Boolean(input.source?.enabled && input.source.agentName.trim());
  const totalAmount = input.qty * input.costPrice;
  const paidAmount = sourceEnabled ? Math.max(0, Number(input.source?.paidAmount) || 0) : undefined;
  MOCK_PRODUCT_HISTORY.unshift({
    id: `ph${Date.now()}-${Math.random()}`,
    date: new Date().toISOString(),
    addedBy: input.addedBy,
    productName: input.productName,
    qty: input.qty,
    unit: input.unit,
    price: input.price,
    costPrice: input.costPrice,
    warehouse: input.warehouse,
    agentName: sourceEnabled ? input.source?.agentName.trim() : undefined,
    agentId: sourceEnabled ? input.source?.agentId || makeAgentId() : undefined,
    agentPhone: sourceEnabled ? input.source?.agentPhone.trim() : undefined,
    paidAmount,
    remainingDebt: sourceEnabled ? Math.max(0, totalAmount - (paidAmount ?? 0)) : undefined,
    totalAmount: sourceEnabled ? totalAmount : undefined,
    note: sourceEnabled ? input.source?.note.trim() : undefined,
  });
  if (input.source?.enabled && input.source.agentName.trim()) {
    MOCK_SUPPLIER_REPORTS.unshift({
      id: `sr${Date.now()}-${Math.random()}`,
      date: new Date().toISOString(),
      addedBy: input.addedBy,
      agentId: input.source.agentId || makeAgentId(),
      agentName: input.source.agentName.trim(),
      agentPhone: input.source.agentPhone.trim(),
      botEnabled: input.source.sendBotUpdate,
      items: [
        { productName: input.productName, qty: input.qty, unit: input.unit, amount: totalAmount },
      ],
      totalAmount,
      paidAmount: paidAmount ?? 0,
      remainingDebt: Math.max(0, totalAmount - (paidAmount ?? 0)),
      note: input.source.note.trim(),
    });
  }
}

export function TovarQoshish({ mode, onDone }: { mode: ProductCreateMode; onDone: () => void }) {
  if (mode === "baza") return <LoadFromBase onDone={onDone} />;
  return <CreateNew mode={mode} onDone={onDone} />;
}

function LoadFromBase({ onDone }: { onDone: () => void }) {
  const { settings } = useApp();
  const [baseId, setBaseId] = React.useState("");
  const [connectedBaseId, setConnectedBaseId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [sourceProducts, setSourceProducts] = React.useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const connected = Boolean(connectedBaseId);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceProducts.filter((product) => {
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.customCode.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q)
      );
    });
  }, [query, sourceProducts]);

  const selectedProducts = React.useMemo(
    () => sourceProducts.filter((product) => selectedIds.has(product.id)),
    [selectedIds, sourceProducts],
  );
  const allRowsSelected = rows.length > 0 && rows.every((product) => selectedIds.has(product.id));

  const connectBase = () => {
    const id = baseId.trim();
    if (!id) return toast.error("Baza ID kiriting");
    const products = MOCK_PRODUCTS.map((product) => ({
      ...product,
      id: `remote-${id}-${product.id}`,
      shelfLocation: undefined,
    }));
    setConnectedBaseId(id);
    setSourceProducts(products);
    setSelectedIds(new Set());
    toast.success("Baza tasdiqlandi", {
      description: `${id} bazasidan ${products.length} ta mahsulot topildi`,
    });
  };

  const toggleProduct = (productId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAllRows = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allRowsSelected) {
        rows.forEach((product) => next.delete(product.id));
      } else {
        rows.forEach((product) => next.add(product.id));
      }
      return next;
    });
  };

  const submit = () => {
    if (!connected) return toast.error("Avval baza ID ni tasdiqlang");
    if (selectedProducts.length === 0) return toast.error("Yuklab olinadigan mahsulot tanlang");

    const importedAt = Date.now();
    selectedProducts.forEach((product, index) => {
      const originalId = product.id.replace(`remote-${connectedBaseId}-`, "");
      const newProduct: Product = {
        ...product,
        id: `base-${connectedBaseId}-${originalId}-${importedAt}-${index}`,
        barcode: makeUniqueBarcode([product.barcode]),
        customCode: product.customCode,
        shelfLocation: undefined,
      };
      MOCK_PRODUCTS.push(newProduct);
      MOCK_PRODUCT_HISTORY.unshift({
        id: `ph-base-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toISOString(),
        addedBy: settings.username,
        productName: newProduct.name,
        qty: newProduct.omborQty + newProduct.vitrinaQty,
        unit: newProduct.unit,
        price: newProduct.price,
        costPrice: costInSom(newProduct),
        warehouse: newProduct.warehouse,
        note: `${connectedBaseId} bazasidan yuklandi`,
      });
    });

    toast.success("Bazadan mahsulot yuklandi", {
      description: `${selectedProducts.length} xil mahsulot ${connectedBaseId} bazasidan olindi`,
    });
    onDone();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Bazadan mahsulot yuklash</div>
            <div className="text-xs text-muted-foreground">
              Baza ID orqali ulanib, tanlangan mahsulotlarni narxlari va ombori bilan yuklab oling.
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onDone}>
          Bekor
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col gap-3 rounded-lg border bg-card p-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-primary" /> Baza ulash
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Qaysi bazadan yuklanishini baza ID orqali tasdiqlang.
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Baza ID</Label>
            <Input
              value={baseId}
              onChange={(event) => {
                setBaseId(event.target.value);
                if (connectedBaseId) {
                  setConnectedBaseId("");
                  setSourceProducts([]);
                  setSelectedIds(new Set());
                }
              }}
              onKeyDown={(event) => event.key === "Enter" && connectBase()}
              placeholder="Masalan: MCHJ-2026-ABC123"
              className="font-mono"
            />
            <Button type="button" onClick={connectBase} className="w-full gap-2">
              <Check className="h-4 w-4" />
              Bazani tasdiqlash
            </Button>
          </div>

          <div className={connected ? "rounded-lg border border-success/30 bg-success/10 p-3" : "rounded-lg border bg-muted/20 p-3"}>
            <div className="text-xs font-semibold">
              {connected ? "Baza tasdiqlandi" : "Baza ulanmagan"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {connected
                ? `${connectedBaseId} bazasidan ${sourceProducts.length} ta mahsulot o'qildi.`
                : "ID tasdiqlangandan keyin mahsulotlar chiqadi."}
            </div>
          </div>

          <div className="mt-auto rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            Yuklab olishda mahsulot nomi, tan narx, oddiy sotuv narxi, optom narx va ombor
            ko'chiriladi. Polka raqami yuklab olinmaydi.
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
            <div>
              <div className="text-sm font-semibold">Mahsulotlarni tanlash</div>
              <div className="text-xs text-muted-foreground">
                {connected
                  ? `${selectedProducts.length} ta mahsulot tanlandi`
                  : "Avval A blokda baza ID ni tasdiqlang"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Mahsulot nomi, kodi yoki shtrix kodi..."
                  disabled={!connected}
                  className="h-9 pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={toggleAllRows}
                disabled={!connected || rows.length === 0}
                className="h-9 gap-2"
              >
                <Checkbox checked={allRowsSelected} aria-label="Hammasini belgilash" />
                Hammasini belgilash
              </Button>
              <Button onClick={submit} disabled={!connected || selectedProducts.length === 0} className="h-9 gap-2">
                <Database className="h-4 w-4" />
                Yuklab olish
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {!connected ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Mahsulotlarni ko'rish uchun A blokda baza ID ni kiriting va tasdiqlang.
              </div>
            ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr className="border-b">
                  <th className="w-12 px-4 py-2.5 text-left font-semibold">Tanlash</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Mahsulot</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Tan narx</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Oddiy narx</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Optom narx</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Ombor</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Miqdor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={
                      "cursor-pointer border-b hover:bg-muted/30 " +
                      (selectedIds.has(product.id) ? "bg-primary/5" : "")
                    }
                  >
                    <td className="px-4 py-2.5">
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Mahsulotni tanlash"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.customCode} · {product.barcode || "barcode yo'q"}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatSom(costInSom(product))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatSom(product.price)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {product.wholesalePrice ? formatSom(product.wholesalePrice) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{product.warehouse}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {product.omborQty + product.vitrinaQty} {product.unit}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Mahsulot topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function CreateNew({ mode, onDone }: { mode: "yangi" | "xarid"; onDone: () => void }) {
  const { settings, updateSettings, t } = useApp();
  const [warehouse, setWarehouse] = React.useState(settings.warehouses[0] ?? "Asosiy ombor");
  const [source, setSource] = React.useState<SupplierSource>({
    enabled: mode === "xarid",
    agentId: makeAgentId(),
    agentName: "",
    agentPhone: "",
    paidAmount: "0",
    note: "",
    sendBotUpdate: false,
  });
  const [confirmCode, setConfirmCode] = React.useState("");
  const [rows, setRows] = React.useState<NewProductRow[]>(() => [
    makeNewProductRow(settings.units[0] ?? "dona"),
  ]);
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string>>(new Set());
  const [agentSearch, setAgentSearch] = React.useState("");
  const [imageName, setImageName] = React.useState("");
  const [newShelfName, setNewShelfName] = React.useState("");
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const agents = React.useMemo(() => getAgents(), [source.enabled]);

  const matchedAgents = React.useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) =>
      `${agent.id} ${agent.name} ${agent.phone}`.toLowerCase().includes(q),
    );
  }, [agentSearch, agents]);

  const pickedAgent =
    source.enabled && source.agentId
      ? agents.find((agent) => agent.id === source.agentId)
      : undefined;
  const showAgentForm = Boolean(source.agentId || source.agentName.trim());

  const updateRow = (id: string, patch: Partial<NewProductRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => [...current, makeNewProductRow(settings.units[0] ?? "dona")]);
  };

  const removeRow = (id: string) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllRows = () => {
    if (selectedRowIds.size === rows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rows.map((r) => r.id)));
    }
  };

  const bulkUpdateShelf = (shelf: string) => {
    if (selectedRowIds.size === 0) return;
    setRows((current) =>
      current.map((row) =>
        selectedRowIds.has(row.id) ? { ...row, shelfLocation: shelf === "NONE" ? "" : shelf } : row,
      ),
    );
  };

  const addNewShelf = () => {
    const name = newShelfName.trim();
    if (!name) return;
    if (settings.shelfLocations.includes(name)) {
      toast.error("Bu " + t("shelf_location").toLowerCase() + " allaqachon mavjud");
      return;
    }
    updateSettings({ shelfLocations: [...settings.shelfLocations, name] });
    setNewShelfName("");
    toast.success("Yangi " + t("shelf_location").toLowerCase() + " qo'shildi: " + name);
  };

  const toggleSource = () => {
    setSource((current) =>
      current.enabled
        ? { ...current, enabled: false }
        : {
            ...current,
            enabled: true,
            agentId: "",
            agentName: "",
            agentPhone: "",
            paidAmount: current.paidAmount || "0",
            sendBotUpdate: current.sendBotUpdate,
          },
    );
    setAgentSearch("");
  };

  const assignBarcode = (id: string) => {
    const row = rows.find((item) => item.id === id);
    const used = rows.filter((item) => item.id !== id).map((item) => item.barcode);
    const nextCode = makeUniqueBarcode(used);
    const currentCodes = splitBarcodes(row?.barcode ?? "");
    updateRow(id, { barcode: joinBarcodes([...currentCodes, nextCode]) });
  };

  const appendBarcodeSlot = (id: string) => {
    const row = rows.find((item) => item.id === id);
    const current = row?.barcode ?? "";
    if (!current.trim()) return;
    if (/\|\s*$/.test(current)) return;
    updateRow(id, { barcode: `${current.trim()} | ` });
  };

  const selectAgent = (agent: NonNullable<typeof pickedAgent>) => {
    setSource({
      ...source,
      enabled: true,
      agentId: agent.id,
      agentName: agent.name,
      agentPhone: agent.phone,
      paidAmount: source.paidAmount || "0",
      sendBotUpdate: agent.botEnabled,
      note: source.note,
    });
    setAgentSearch(`${agent.id} ${agent.name}`);
  };

  const validRows = rows
    .map((row) => ({
      ...row,
      name: row.name.trim(),
      qtyNumber: Math.max(0, Number(row.qty) || 0),
      costNumber: Math.max(0, Number(row.costPrice) || 0),
      priceNumber: Math.max(0, Number(row.price) || 0),
      wholesalePriceNumber: Math.max(0, Number(row.wholesalePrice) || 0),
      unitValue: (row.unit.trim() || settings.units[0]) ?? "dona",
      barcodeValue: joinBarcodes(splitBarcodes(row.barcode)),
    }))
    .filter((row) => row.name && row.qtyNumber > 0);

  const totalCostSom = validRows.reduce(
    (sum, row) => sum + row.qtyNumber * row.costNumber * (MOCK_RATES[row.costCurrency] ?? 1),
    0,
  );
  const codeConfirmed = confirmCode.trim() === settings.confirmCode.trim();

  const submit = () => {
    if (!codeConfirmed) return toast.error("Tasdiqlash kodi noto'g'ri");
    if (validRows.length === 0) return toast.error("Kamida bitta tovar nomi va sonini kiriting");
    if (source.enabled && !source.agentName.trim()) return toast.error("Agent ismini kiriting");

    const totalPaid = Math.max(0, Number(source.paidAmount) || 0);
    const usedBarcodes = new Set(
      MOCK_PRODUCTS.flatMap((product) => splitBarcodes(product.barcode)),
    );
    rows.forEach((row) => {
      splitBarcodes(row.barcode).forEach((barcode) => usedBarcodes.add(barcode));
    });

    validRows.forEach((row, index) => {
      const rowBarcodes = splitBarcodes(row.barcodeValue);
      const nextBarcodes = rowBarcodes.length > 0 ? rowBarcodes : [makeUniqueBarcode(usedBarcodes)];
      nextBarcodes.forEach((barcode) => usedBarcodes.add(barcode));
      const barcode = joinBarcodes(nextBarcodes);
      const newProd: Product = {
        id: `p${Date.now()}-${index}`,
        name: row.name,
        price: row.priceNumber,
        wholesalePrice: row.wholesalePriceNumber,
        costPrice: row.costNumber,
        costCurrency: row.costCurrency,
        barcode,
        customCode: makeProductCode(row.name),
        unit: row.unitValue,
        warehouse,
        shelfLocation: row.shelfLocation,
        vitrinaQty: 0,
        omborQty: row.qtyNumber,
        salesHistory: [],
      };
      MOCK_PRODUCTS.push(newProd);

      const rowCostSom = row.qtyNumber * row.costNumber * (MOCK_RATES[row.costCurrency] ?? 1);
      const paidShare =
        source.enabled && totalCostSom > 0
          ? Math.round((totalPaid * rowCostSom) / totalCostSom)
          : 0;

      recordProductAddition({
        productName: newProd.name,
        qty: newProd.omborQty,
        unit: newProd.unit,
        price: newProd.price,
        costPrice: costInSom(newProd),
        warehouse: newProd.warehouse,
        addedBy: settings.username,
        source: source.enabled
          ? {
              ...source,
              paidAmount: String(paidShare),
              note: source.note,
            }
          : source,
      });
    });

    if (
      source.enabled &&
      source.sendBotUpdate &&
      source.agentPhone.trim() &&
      source.agentName.trim()
    ) {
      dispatchSupplierReceipt({
        receiptId: `AGENT-${Date.now()}`,
        report: {
          agentId: source.agentId || makeAgentId(),
          agentName: source.agentName.trim(),
          agentPhone: source.agentPhone.trim(),
          totalAmount: totalCostSom,
          paidAmount: totalPaid,
          remainingDebt: Math.max(0, totalCostSom - totalPaid),
        },
        note: source.note.trim() || `${validRows.length} ta tovar bo'yicha prixod`,
      });
    }

    toast.success("Yangi tovarlar qo'shildi", {
      description: `${validRows.length} xil tovar ${warehouse} omboriga qo'shildi`,
    });
    onDone();
  };

  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm xl:order-1">
        <div className="text-sm font-semibold">Qabul ma'lumotlari</div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/20 text-muted-foreground hover:bg-muted/40 transition-colors"
            title="Rasm qo'shish"
          >
            <ImagePlus className="h-5 w-5 text-primary" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-muted-foreground">
              {imageName || "Rasm tanlanmagan"}
            </div>
            <div className="text-[10px] text-primary/70">PNG, JPG (max 2MB)</div>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setImageName(event.target.files?.[0]?.name ?? "")}
          />
        </div>

        <div className="rounded-lg border bg-muted/10 p-2 space-y-2">
          <Label className="text-[11px] font-bold uppercase text-muted-foreground">
            {t("shelf_location")} boshqaruvi
          </Label>
          <div className="flex gap-1.5">
            <Input
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="Polka raqami..."
              className="h-8 text-xs"
            />
            <Button type="button" size="icon" className="h-8 w-8 shrink-0" onClick={addNewShelf}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Select onValueChange={bulkUpdateShelf}>
            <SelectTrigger className="h-8 text-xs bg-card">
              <SelectValue placeholder={`Tanlanganlarga ${t("shelf_location").toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">— Tozalash —</SelectItem>
              {settings.shelfLocations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            O'ngdagi jadvaldan tovarlarni tanlab, bir yo'la polka raqamini biriktiring.
          </p>
        </div>

        <div>
          <Label className="mb-1 block text-xs">Qaysi omborga qo'shiladi</Label>
          <Select value={warehouse} onValueChange={setWarehouse}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {settings.warehouses.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-muted/20 p-2.5">
          <Button
            type="button"
            variant={source.enabled ? "default" : "outline"}
            onClick={toggleSource}
            className="h-8 w-full justify-start gap-2 text-xs"
          >
            <Truck className="h-4 w-4" />
            Agentlar
          </Button>

          {source.enabled && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={agentSearch}
                    onChange={(event) => setAgentSearch(event.target.value)}
                    placeholder="Agent qidirish..."
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Yangi agent qo'shish endi Mijozlar sahifasida amalga oshiriladi.
              </div>

              {matchedAgents.length > 0 && !source.agentName.trim() && !showAgentForm && (
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border bg-card p-1">
                  {matchedAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => selectAgent(agent)}
                      className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                    >
                      <span className="font-semibold">{agent.name}</span>
                      <span className="ml-1 text-muted-foreground">{agent.id}</span>
                      <div className="text-[11px] text-muted-foreground">
                        Qoldiq: {formatSom(agent.remainingDebt)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showAgentForm && (
                <div className="space-y-2">
                  {pickedAgent && (
                    <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-card p-2 text-xs">
                      <Info label="Joriy qarzimiz" value={formatSom(pickedAgent.totalAmount)} />
                      <Info label="To'laganimiz" value={formatSom(pickedAgent.paidAmount)} />
                      <Info label="Qoldiq" value={formatSom(pickedAgent.remainingDebt)} />
                      <Info
                        label="Hozir berilyapti"
                        value={formatSom(Math.max(0, Number(source.paidAmount) || 0))}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="mb-1 block text-xs">Agent kodi</Label>
                      <Input
                        value={source.agentId}
                        readOnly
                        className="h-8 bg-muted text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Agent ismi *</Label>
                      <Input
                        value={source.agentName}
                        onChange={(e) => setSource({ ...source, agentName: e.target.value })}
                        placeholder="Agent ismi"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="mb-1 block text-xs">Telefon raqami</Label>
                      <Input
                        value={source.agentPhone}
                        onChange={(e) => setSource({ ...source, agentPhone: e.target.value })}
                        placeholder="+998..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">Berilgan pul</Label>
                    <Input
                      type="number"
                      value={source.paidAmount}
                      onChange={(e) => setSource({ ...source, paidAmount: e.target.value })}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="rounded-md border bg-muted/20 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold">Botga habar yuborish</div>
                        <div className="text-[11px] text-muted-foreground">
                          Agentga prixod va to'lov cheki yuboriladi
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={source.sendBotUpdate ? "default" : "outline"}
                        onClick={() =>
                          setSource({ ...source, sendBotUpdate: !source.sendBotUpdate })
                        }
                      >
                        {source.sendBotUpdate ? "Yoqilgan" : "Yoqish"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <Label className="mb-1 block text-xs">Izoh</Label>
          <Input
            value={source.note}
            onChange={(e) => setSource({ ...source, note: e.target.value })}
            placeholder="Ixtiyoriy izoh"
            className="h-8 text-xs"
          />
        </div>

        <div className="mt-auto space-y-2 rounded-lg border bg-muted/20 p-2.5">
          <div>
            <Label className="mb-1 flex items-center gap-1 text-xs">
              <Lock className="h-3.5 w-3.5" />
              Tasdiqlash kodi
            </Label>
            <Input
              type="password"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmCode.trim() && submit()}
              placeholder="••••"
              className={codeConfirmed ? "h-8 border-success text-xs" : "h-8 text-xs"}
            />
          </div>
          <Button
            onClick={submit}
            disabled={!confirmCode.trim()}
            className="h-8 w-full gap-2 text-xs"
          >
            <Check className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-lg border bg-card shadow-sm xl:order-2">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <div className="text-sm font-semibold">Tovar ma'lumotlari</div>
          {selectedRowIds.size > 0 && (
            <div className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/20">
              {selectedRowIds.size} ta tovar tanlandi
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              Qator ko'rinishida to'ldiring, ko'paysa pastga scroll bo'ladi.
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedRowIds.size === rows.length}
                onCheckedChange={toggleAllRows}
                aria-label="Hammasini tanlash"
              />
              <span className="text-xs font-semibold text-muted-foreground">Hammasini tanlash</span>
            </div>
          </div>

          <div className="overflow-auto">
            <div className="min-w-[800px] space-y-2 pr-1">
              {rows.map((row) => {
                const tanInSom = (Number(row.costPrice) || 0) * (MOCK_RATES[row.costCurrency] ?? 1);
                return (
                  <div
                    key={row.id}
                    className={
                      "w-max min-w-full rounded-lg border p-2.5 transition-colors " +
                      (selectedRowIds.has(row.id)
                        ? "border-primary/40 bg-primary/5"
                        : "bg-muted/10")
                    }
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedRowIds.has(row.id)}
                          onCheckedChange={() => toggleRowSelection(row.id)}
                          aria-label="Tanlash"
                        />
                        <span className="text-xs font-semibold text-muted-foreground">
                          Tovar #{rows.indexOf(row) + 1}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-[minmax(140px,1.15fr)_56px_76px_minmax(122px,0.95fr)_minmax(92px,0.75fr)_minmax(92px,0.75fr)_minmax(110px,0.65fr)_64px] gap-1.5">
                      <Field label="Tovar nomi">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          placeholder="Yangi tovar nomi"
                          className="h-7 text-xs"
                        />
                      </Field>

                      <Field label="Soni">
                        <Input
                          type="number"
                          value={row.qty}
                          onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                          placeholder="0"
                          className="h-7 text-xs"
                        />
                      </Field>

                      <Field label="Birligi">
                        <Select
                          value={row.unit}
                          onValueChange={(value) => updateRow(row.id, { unit: value })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.units.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Tan narxi">
                        <div className="space-y-1">
                          <div className="grid grid-cols-[1fr_64px] gap-1.5">
                            <Input
                              type="number"
                              value={row.costPrice}
                              onChange={(e) => updateRow(row.id, { costPrice: e.target.value })}
                              placeholder="0"
                              className="h-7 text-xs"
                            />
                            <Select
                              value={row.costCurrency}
                              onValueChange={(value) =>
                                updateRow(row.id, { costCurrency: value as Currency })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {settings.currencies.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {row.costCurrency !== "UZS" && (
                            <div className="text-[11px] text-muted-foreground">
                              ≈ {formatSom(tanInSom)}
                            </div>
                          )}
                        </div>
                      </Field>

                      <Field label="Sotuv narxi">
                        <div className="space-y-1">
                          <Input
                            type="number"
                            value={row.price}
                            onChange={(e) => updateRow(row.id, { price: e.target.value })}
                            placeholder="SUM"
                            className="h-7 text-xs"
                          />
                          <div className="px-1 text-[10px] text-muted-foreground">Oddiy mijoz</div>
                        </div>
                      </Field>

                      <Field label="Sotuv narxi">
                        <div className="space-y-1">
                          <Input
                            type="number"
                            value={row.wholesalePrice}
                            onChange={(e) => updateRow(row.id, { wholesalePrice: e.target.value })}
                            placeholder="SUM"
                            className="h-7 text-xs"
                          />
                          <div className="px-1 text-[10px] text-muted-foreground">Optom mijoz</div>
                        </div>
                      </Field>

                      <Field label="Shtrix kod">
                        <div className="flex gap-1">
                          <Input
                            value={row.barcode}
                            onChange={(e) => updateRow(row.id, { barcode: e.target.value })}
                            className="h-7 min-w-0 flex-1 text-xs"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 shrink-0"
                            onClick={() => appendBarcodeSlot(row.id)}
                            title="Yana bir barcode qo'shish"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 shrink-0"
                            onClick={() => assignBarcode(row.id)}
                            title="Avtomatik shtrix kod"
                          >
                            <Barcode className="h-4 w-4" />
                          </Button>
                        </div>
                      </Field>

                      <Field label="Amal">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={addRow}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SupplierSourcePanel({
  value,
  onChange,
}: {
  value: SupplierSource;
  onChange: (next: SupplierSource) => void;
}) {
  const { t } = useApp();
  const patch = (patch: Partial<SupplierSource>) => onChange({ ...value, ...patch });
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold">{t("source_details")}</div>
          <div className="text-[11px] text-muted-foreground">
            Bosilmasa tovar qayerdan kelgani yozilmaydi
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={value.enabled ? "default" : "outline"}
          onClick={() =>
            patch({ enabled: !value.enabled, agentId: value.agentId || makeAgentId() })
          }
          className="gap-2"
        >
          <Truck className="h-4 w-4" /> {value.enabled ? "Yoqilgan" : t("source_details")}
        </Button>
      </div>
      {value.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 block text-xs">{t("agent_id")}</Label>
            <Input value={value.agentId} readOnly className="bg-muted font-semibold" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">{t("agent_name")}</Label>
            <Input
              value={value.agentName}
              onChange={(e) => patch({ agentName: e.target.value })}
              placeholder="Agent nomi"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">{t("agent_phone")}</Label>
            <Input
              value={value.agentPhone}
              onChange={(e) => patch({ agentPhone: e.target.value })}
              placeholder="+998..."
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">{t("paid_now")}</Label>
            <Input
              type="number"
              value={value.paidAmount}
              onChange={(e) => patch({ paidAmount: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">{t("supplier_note")}</Label>
            <Input
              value={value.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder="Izoh"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  status,
}: {
  label: string;
  value: string;
  accent?: boolean;
  status?: "ok" | "error";
}) {
  const className =
    "rounded-lg border p-2 " +
    (accent ? "border-primary/30 bg-primary/5 " : "bg-card ") +
    (status === "ok" ? "border-success/40 bg-success/5 " : "") +
    (status === "error" ? "border-destructive/40 bg-destructive/5 " : "");

  return (
    <div className={className}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          (accent ? "text-primary " : "") + "mt-1 truncate text-base font-bold tabular-nums"
        }
      >
        {value}
      </div>
    </div>
  );
}

function FieldCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <Label className="text-sm font-semibold">{title}</Label>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
