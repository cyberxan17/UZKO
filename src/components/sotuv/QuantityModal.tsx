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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Product } from "@/lib/mock-data";
import { formatSom, isProductAtLimit } from "@/lib/mock-data";
import { AlertTriangle, Package, Box } from "lucide-react";
import type { PriceMode } from "./types";

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: Product, quantity: number) => void;
  priceMode?: PriceMode;
};

export function QuantityModal({ product, open, onOpenChange, onAdd, priceMode = "retail" }: Props) {
  const [mode, setMode] = React.useState<"dona" | "karobka">("dona");
  const [qty, setQty] = React.useState("1");

  React.useEffect(() => {
    if (open && product) {
      setMode("dona");
      setQty("1");
    }
  }, [open, product]);

  if (!product) return null;

  const hasBox = !!product.perBox;
  const numQty = parseFloat(qty) || 0;
  const totalUnits = mode === "karobka" && hasBox ? numQty * product.perBox! : numQty;
  const totalPrice = totalUnits * salePrice(product, priceMode);
  const totalAvailable = product.vitrinaQty;
  const exceeds = totalUnits > totalAvailable;

  const handleAdd = () => {
    if (totalUnits > 0 && !exceeds) {
      onAdd(product, totalUnits);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Narxi:</span>
            <span className="font-medium">
              {formatSom(salePrice(product, priceMode))} / {product.unit}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Vitrinada:</span>
            <span
              className={"font-semibold " + (product.vitrinaQty === 0 ? "text-destructive" : "")}
            >
              {product.vitrinaQty} {product.unit}
            </span>
          </div>
          {isProductAtLimit(product) && (
            <div className="mt-2 flex items-center justify-between rounded-md bg-amber-50 px-2 py-1 text-amber-700">
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Limitga yetgan
              </span>
              <span className="text-xs font-bold">
                {product.minStockAlert} {product.unit}
              </span>
            </div>
          )}
          {hasBox && (
            <div className="mt-1 flex justify-between text-primary">
              <span>1 karobka:</span>
              <span className="font-medium">{product.perBox} dona</span>
            </div>
          )}
        </div>

        {hasBox && (
          <div>
            <Label className="mb-2 block">O'lchov turi</Label>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as "dona" | "karobka")}
              className="grid grid-cols-2"
            >
              <ToggleGroupItem value="dona" className="gap-2">
                <Package className="h-4 w-4" /> Dona
              </ToggleGroupItem>
              <ToggleGroupItem value="karobka" className="gap-2">
                <Box className="h-4 w-4" /> Karobka
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        <div>
          <Label className="mb-2 block">
            Miqdor ({mode === "karobka" ? "karobka" : product.unit})
          </Label>
          <Input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min={0}
            step="any"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          {mode === "karobka" && hasBox && (
            <p className="mt-1 text-xs text-muted-foreground">= {totalUnits} dona</p>
          )}
          {exceeds && (
            <p className="mt-1 text-xs font-medium text-destructive">
              Yetarli emas! Mavjud: {totalAvailable} {product.unit}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
          <span className="text-sm text-muted-foreground">Jami:</span>
          <span className="text-lg font-bold text-primary">{formatSom(totalPrice)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={handleAdd} disabled={totalUnits <= 0 || exceeds}>
            Savatchaga qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
