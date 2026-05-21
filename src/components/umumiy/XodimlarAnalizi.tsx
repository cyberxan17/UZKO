import * as React from "react";
import { Clock3, GitCompareArrows, ReceiptText, TrendingUp, UsersRound, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MOCK_EMPLOYEES,
  MOCK_RECEIPTS,
  MOCK_RETURN_RECEIPTS,
  formatSom,
  type Employee,
} from "@/lib/mock-data";

type AttendanceRecord = { in: string; out: string; off?: boolean };
type AttendanceState = Record<string, Record<string, AttendanceRecord>>;
type EmployeeMetric = {
  employee: Employee;
  roles: string[];
  isSeller: boolean;
  totalMinutes: number;
  workedDays: number;
  restDays: number;
  absentDays: number;
  receiptCount: number;
  salesTotal: number;
  returnTotal: number;
  netSales: number;
  avgCheck: number;
};

export function XodimlarAnalizi() {
  const [selectedMonth, setSelectedMonth] = React.useState(() => currentMonthKey());
  const days = React.useMemo(() => currentMonthDays(selectedMonth), [selectedMonth]);
  const [attendance, setAttendance] = React.useState<AttendanceState>(() =>
    seedAttendance(MOCK_EMPLOYEES, currentMonthDays(currentMonthKey())),
  );

  React.useEffect(() => {
    setAttendance((current) => {
      const next = { ...current };
      MOCK_EMPLOYEES.forEach((employee) => {
        next[employee.id] = next[employee.id] ?? {};
        days.forEach((day) => {
          if (!next[employee.id][day.key]) {
            const seeded = seedAttendance([employee], days)[employee.id]?.[day.key];
            if (seeded) next[employee.id][day.key] = seeded;
          }
        });
      });
      return next;
    });
  }, [days]);

  const metrics = React.useMemo(
    () => MOCK_EMPLOYEES.map((employee) => buildEmployeeMetric(employee, days, attendance)),
    [attendance, days],
  );
  const sellerMetrics = React.useMemo(
    () => metrics.filter((metric) => metric.isSeller),
    [metrics],
  );
  const [compareA, setCompareA] = React.useState(() => sellerMetrics[0]?.employee.id ?? "");
  const [compareB, setCompareB] = React.useState(() => sellerMetrics[1]?.employee.id ?? sellerMetrics[0]?.employee.id ?? "");

  React.useEffect(() => {
    if (!sellerMetrics.some((metric) => metric.employee.id === compareA)) {
      setCompareA(sellerMetrics[0]?.employee.id ?? "");
    }
    if (!sellerMetrics.some((metric) => metric.employee.id === compareB)) {
      setCompareB(sellerMetrics[1]?.employee.id ?? sellerMetrics[0]?.employee.id ?? "");
    }
  }, [compareA, compareB, sellerMetrics]);

  const compareMetricA = sellerMetrics.find((metric) => metric.employee.id === compareA) ?? null;
  const compareMetricB = sellerMetrics.find((metric) => metric.employee.id === compareB) ?? null;

  const totalWorkedMinutes = metrics.reduce((sum, metric) => sum + metric.totalMinutes, 0);
  const totalSalaries = metrics.reduce((sum, metric) => sum + metric.employee.monthlySalary, 0);
  const totalReceipts = sellerMetrics.reduce((sum, metric) => sum + metric.receiptCount, 0);
  const totalSellerSales = sellerMetrics.reduce((sum, metric) => sum + metric.netSales, 0);
  const averageCheck = totalReceipts > 0 ? Math.round(totalSellerSales / totalReceipts) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="min-w-[180px] space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Oy</Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value || currentMonthKey())}
            className="h-9"
          />
        </div>
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Taqqoslash 1</Label>
          <Select value={compareA} onValueChange={setCompareA}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sotuvchini tanlang" />
            </SelectTrigger>
            <SelectContent>
              {sellerMetrics.map((metric) => (
                <SelectItem key={metric.employee.id} value={metric.employee.id}>
                  {metric.employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Taqqoslash 2</Label>
          <Select value={compareB} onValueChange={setCompareB}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sotuvchini tanlang" />
            </SelectTrigger>
            <SelectContent>
              {sellerMetrics.map((metric) => (
                <SelectItem key={metric.employee.id} value={metric.employee.id}>
                  {metric.employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Jami ishlagan vaqt" value={formatWorkedTime(totalWorkedMinutes)} icon={Clock3} />
        <MetricCard title="O'rtacha chek" value={formatSom(averageCheck)} icon={ReceiptText} />
        <MetricCard title="Xodimlar soni" value={`${metrics.length} ta`} icon={UsersRound} />
        <MetricCard title="Oylik fondi" value={formatSom(totalSalaries)} icon={Wallet} />
        <MetricCard title="Sotuvchilar net sotuv" value={formatSom(totalSellerSales)} icon={TrendingUp} accent />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="font-semibold">Sotuvchilar analizi</div>
            <div className="text-xs text-muted-foreground">
              Faqat `Sotuvchi` roli bor xodimlar bo'yicha чеклар, o'rtacha чек va net sotuv.
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Xodim</th>
                  <th className="px-4 py-2 text-right">Cheklar</th>
                  <th className="px-4 py-2 text-right">O'rtacha чек</th>
                  <th className="px-4 py-2 text-right">Net sotuv</th>
                  <th className="px-4 py-2 text-right">Ishlagan vaqt</th>
                </tr>
              </thead>
              <tbody>
                {sellerMetrics.map((metric) => (
                  <tr key={metric.employee.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{metric.employee.name}</div>
                      <div className="text-xs text-muted-foreground">{metric.employee.id}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{metric.receiptCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatSom(metric.avgCheck)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">{formatSom(metric.netSales)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatWorkedTime(metric.totalMinutes)}</td>
                  </tr>
                ))}
                {sellerMetrics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Sotuvchi statusidagi xodim topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-primary" />
            <div className="font-semibold">Sotuvchilarni taqqoslash</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <CompareSellerCard title="1-xodim" metric={compareMetricA} />
            <CompareSellerCard title="2-xodim" metric={compareMetricB} />
          </div>
          {compareMetricA && compareMetricB && (
            <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="font-semibold">Farq</div>
              <div className="mt-2 space-y-1 text-xs">
                <InfoLine
                  label="Cheklar farqi"
                  value={`${compareMetricA.receiptCount - compareMetricB.receiptCount} ta`}
                />
                <InfoLine
                  label="O'rtacha чек farqi"
                  value={formatSom(compareMetricA.avgCheck - compareMetricB.avgCheck)}
                />
                <InfoLine
                  label="Net sotuv farqi"
                  value={formatSom(compareMetricA.netSales - compareMetricB.netSales)}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="font-semibold">Barcha xodimlar ish holati</div>
          <div className="text-xs text-muted-foreground">
            Ishlagan kunlari, dam olgan kunlari, sababsiz kelmagan kunlari va individual sotuv holati.
          </div>
        </div>
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Xodim</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-right">Ishlagan kun</th>
                <th className="px-4 py-2 text-right">Dam kuni</th>
                <th className="px-4 py-2 text-right">Kelmagan kun</th>
                <th className="px-4 py-2 text-right">Ish vaqti</th>
                <th className="px-4 py-2 text-right">Sotuv</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.employee.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{metric.employee.name}</div>
                    <div className="text-xs text-muted-foreground">{metric.employee.id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{metric.roles.join(", ")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{metric.workedDays}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{metric.restDays}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-destructive">{metric.absentDays}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatWorkedTime(metric.totalMinutes)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {metric.isSeller ? formatSom(metric.netSales) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CompareSellerCard({ title, metric }: { title: string; metric: EmployeeMetric | null }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      {metric ? (
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="font-semibold">{metric.employee.name}</div>
          <InfoLine label="Cheklar soni" value={`${metric.receiptCount} ta`} />
          <InfoLine label="O'rtacha чек" value={formatSom(metric.avgCheck)} />
          <InfoLine label="Net sotuv" value={formatSom(metric.netSales)} />
          <InfoLine label="Ishlagan vaqt" value={formatWorkedTime(metric.totalMinutes)} />
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">Sotuvchi tanlanmagan</div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 shadow-sm ${accent ? "border-primary/30 bg-primary/5" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase text-muted-foreground">{title}</div>
          <div className={`mt-2 text-lg font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${accent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function buildEmployeeMetric(
  employee: Employee,
  days: ReturnType<typeof currentMonthDays>,
  attendance: AttendanceState,
): EmployeeMetric {
  const roles = employeeRoles(employee);
  const isSeller = roles.includes("Sotuvchi");
  let totalMinutes = 0;
  let workedDays = 0;
  let restDays = 0;

  days.forEach((day) => {
    const record = attendance[employee.id]?.[day.key];
    const minutes = workedMinutes(record);
    totalMinutes += minutes;
    if (minutes > 0) workedDays += 1;
    if (record?.off) restDays += 1;
  });

  const receipts = MOCK_RECEIPTS.filter(
    (receipt) => isInMonthDays(receipt.date, days) && employeeMatchesCashier(employee, receipt.cashier),
  );
  const returns = MOCK_RETURN_RECEIPTS.filter(
    (receipt) => isInMonthDays(receipt.date, days) && employeeMatchesCashier(employee, receipt.cashier),
  );
  const salesTotal = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
  const returnTotal = returns.reduce((sum, receipt) => sum + receipt.total, 0);
  const netSales = Math.max(0, salesTotal - returnTotal);
  const absentDays = Math.max(0, days.length - workedDays - restDays);

  return {
    employee,
    roles,
    isSeller,
    totalMinutes,
    workedDays,
    restDays,
    absentDays,
    receiptCount: receipts.length,
    salesTotal,
    returnTotal,
    netSales,
    avgCheck: receipts.length > 0 ? Math.round(salesTotal / receipts.length) : 0,
  };
}

function employeeRoles(employee: Employee) {
  if (employee.roles?.length) return employee.roles;
  return employee.role
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function employeeMatchesCashier(employee: Employee, cashier: string) {
  const cashierName = normalizeName(cashier);
  const parts = employee.name.split(/\s+/).filter(Boolean);
  const aliases = [
    employee.name,
    parts[0],
    employee.deviceLogin,
    employee.firstName,
    employee.lastName,
  ].filter((value): value is string => Boolean(value));
  return aliases.some((alias) => normalizeName(alias) === cashierName);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function seedAttendance(
  employees: Employee[],
  days: ReturnType<typeof currentMonthDays>,
): AttendanceState {
  return employees.reduce<AttendanceState>((state, employee, employeeIndex) => {
    state[employee.id] = {};
    days.slice(0, 7).forEach((day, dayIndex) => {
      const inMinute = 9 * 60 + ((employeeIndex + dayIndex) % 3) * 5;
      const outMinute = 18 * 60;
      state[employee.id][day.key] = {
        in: minutesToTime(inMinute),
        out: minutesToTime(outMinute),
      };
    });
    return state;
  }, {});
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthDays(monthKey = currentMonthKey()) {
  const [yearValue, monthValue] = monthKey.split("-").map((part) => Number(part));
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
  const month = Number.isFinite(monthValue) ? monthValue - 1 : new Date().getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return {
      key: date.toISOString().slice(0, 10),
      day: index + 1,
      weekday: date.toLocaleDateString("uz-UZ", { weekday: "short" }),
    };
  });
}

function isInMonthDays(dateIso: string, days: ReturnType<typeof currentMonthDays>) {
  const dayKey = new Date(dateIso).toISOString().slice(0, 10);
  return days.some((day) => day.key === dayKey);
}

function workedMinutes(record?: AttendanceRecord) {
  if (record?.off) return 0;
  if (!record?.in || !record.out) return 0;
  return Math.max(0, timeToMinutes(record.out) - timeToMinutes(record.in));
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatWorkedTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} soat ${minutes} daq`;
}
