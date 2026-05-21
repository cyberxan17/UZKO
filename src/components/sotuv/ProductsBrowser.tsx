import * as React from "react";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search } from "lucide-react";
import { MOCK_PRODUCTS, formatSom, isProductAtLimit } from "@/lib/mock-data";
import type { Product } from "@/lib/mock-data";
import type { PriceMode } from "./types";

type Props = { onPick: (p: Product) => void; priceMode?: PriceMode };

export function ProductsBrowser({ onPick, priceMode = "retail" }: Props) {
  const [query, setQuery] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);

  const products = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_PRODUCTS.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.customCode.toLowerCase().includes(q)
      );
    });
  }, [query]);

  React.useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, products.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && products[activeIdx]) {
      e.preventDefault();
      onPick(products[activeIdx]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-card p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Mahsulotni nomi, shtrix kodi yoki maxsus kodi orqali toping..."
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {products.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Hech narsa topilmadi
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-1.5 text-left font-semibold">Nomi</th>
                <th className="px-3 py-1.5 text-right font-semibold">Narxi</th>
                <th className="px-3 py-1.5 text-right font-semibold">Vitrinada</th>
                <th className="px-3 py-1.5 text-left font-semibold">Birlik</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const isActive = query && i === activeIdx;
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => query && setActiveIdx(i)}
                    onClick={() => onPick(p)}
                    className={
                      "cursor-pointer border-b transition-colors " +
                      (isActive
                        ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                        : "hover:bg-muted/40")
                    }
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{p.name}</div>
                        {isProductAtLimit(p) && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700"
                            title={`Limit: ${p.minStockAlert} ${p.unit}`}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Limit
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.customCode}</div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                      {formatSom(salePrice(p, priceMode))}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      <span className={p.vitrinaQty < 10 ? "font-semibold text-destructive" : ""}>
                        {p.vitrinaQty}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{p.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function salePrice(product: unknown, priceMode: PriceMode = "retail") {
  const record = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  if (priceMode === "wholesale") {
    const wholesale = firstPositiveNumber(record.wholesalePrice);
    if (wholesale > 0) return wholesale;
  }
  return firstPositiveNumber(
    record.price,
    record.salePrice,
    record.sellPrice,
    record.sotuvNarx,
    record.sotuvNarxi,
    record.narx,
  );
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const number = safeNumber(value);
    if (number > 0) return number;
  }
  return 0;
}

function safeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}
