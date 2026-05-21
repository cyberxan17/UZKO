import * as React from "react";
import { Button } from "@/components/ui/button";
import { Activity, HandCoins, RefreshCw, ClipboardList, PieChart, TrendingUp, UsersRound } from "lucide-react";
import { TovarlarHolati } from "@/components/tovarlar/TovarlarHolati";
import { QarzdorlikniYopish } from "@/components/kassa/QarzdorlikniYopish";
import { KursYangilash } from "@/components/shared/KursYangilash";
import { Hisobot } from "@/components/umumiy/Hisobot";
import { KirimChiqimAnalizi } from "@/components/umumiy/KirimChiqimAnalizi";
import { SavdoAnalizi } from "@/components/umumiy/SavdoAnalizi";
import { XodimlarAnalizi } from "@/components/umumiy/XodimlarAnalizi";
import { useApp } from "@/lib/app-context";

const TABS = [
  { id: "savdo", label: "Savdo analizi", icon: TrendingUp },
  { id: "holati", label: "Tovarlar holati", icon: Activity },
  { id: "xodimlar", label: "Xodimlar analizi", icon: UsersRound },
  { id: "hisobot", label: "Agentlar", icon: ClipboardList },
  { id: "analiz", labelKey: "income_expense_analysis", icon: PieChart },
  { id: "qarz", labelKey: "business_receivable", icon: HandCoins },
  { id: "kurs", label: "Kursni yangilash", icon: RefreshCw },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function UmumiyDashboard() {
  const [tab, setTab] = React.useState<Tab>("savdo");
  const { t } = useApp();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap gap-2 border-b bg-card p-3">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <Button
              key={item.id}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(item.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {"labelKey" in item ? t(item.labelKey) : item.label}
            </Button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "savdo" && <SavdoAnalizi />}
        {tab === "holati" && <TovarlarHolati />}
        {tab === "xodimlar" && <XodimlarAnalizi />}
        {tab === "hisobot" && <Hisobot />}
        {tab === "analiz" && <KirimChiqimAnalizi />}
        {tab === "qarz" && <QarzdorlikniYopish mode="debtors" />}
        {tab === "kurs" && <KursYangilash />}
      </div>
    </div>
  );
}
