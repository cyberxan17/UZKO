import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import {
  MOCK_EMPLOYEES,
  MOCK_RECEIPTS,
  MOCK_RETURN_RECEIPTS,
  MOCK_WITHDRAWALS,
  formatSom,
  type CashWithdrawal,
  type Employee,
  type Receipt,
  type ReceiptItem,
  type ReturnReceipt,
} from "@/lib/mock-data";
import { useApp, type Permission } from "@/lib/app-context";
import {
  CalendarX,
  Calculator,
  Clock3,
  Edit3,
  IdCard,
  LockKeyhole,
  LogIn,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  ScanBarcode,
  Search,
  TrendingUp,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_ROLES = [
  "Sotuvchi",
  "Omborchi",
  "Kassir",
  "Direktor",
  "SysAdmin",
  "Hisobchi",
  "Yetkazuvchi",
] as const;
const SYSTEM_ROLES = new Set(["Sotuvchi", "Omborchi", "Kassir", "Direktor", "SysAdmin"]);

type PayType = NonNullable<Employee["payType"]>;
type PageMode = "list" | "work-time" | "salary";
type SalaryStatusFilter = "all" | "paid" | "unpaid";
type WorkSchedule = { start: string; end: string };
type AttendanceRecord = { in: string; out: string; off?: boolean };
type AttendanceState = Record<string, Record<string, AttendanceRecord>>;
type FineRule = { id: string; minutes: number; amount: number };
type ScanResult = {
  employeeId: string;
  employeeName: string;
  action: "in" | "out";
  time: string;
};
type SalaryMetric = {
  employee: Employee;
  expected: WorkSchedule;
  totalMinutes: number;
  workedDays: number;
  lateDays: number;
  restDays: number;
  totalFine: number;
  baseSalary: number;
  sales: Receipt[];
  returns: ReturnReceipt[];
  salesTotal: number;
  returnTotal: number;
  commission: number;
  totalSalary: number;
};

type EmployeeFormState = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  roles: string[];
  customRole: string;
  birthDate: string;
  phone: string;
  phone2: string;
  passport: string;
  hasSystemAccess: boolean;
  login: string;
  password: string;
  payType: PayType;
  workDays: string;
  workHoursPerDay: string;
  monthlySalary: string;
  salesPercent: string;
};

export function XodimlarPage() {
  const { settings, updateSettings } = useApp();
  const [mode, setMode] = React.useState<PageMode>("list");
  const [query, setQuery] = React.useState("");
  const [employees, setEmployees] = React.useState<Employee[]>(() => [...MOCK_EMPLOYEES]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | null>(null);
  const [historyEmployee, setHistoryEmployee] = React.useState<Employee | null>(null);
  const [deleting, setDeleting] = React.useState<Employee | null>(null);

  const q = query.trim().toLowerCase();
  const rows = employees.filter((employee) => {
    if (!q) return true;
    return `${employee.id} ${employee.name} ${employee.role} ${employee.phone ?? ""} ${employee.phone2 ?? ""} ${employee.deviceLogin ?? ""}`
      .toLowerCase()
      .includes(q);
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setFormOpen(true);
  };

  const handleSave = (employee: Employee, previous?: Employee | null) => {
    if (previous) {
      const index = MOCK_EMPLOYEES.findIndex((item) => item.id === previous.id);
      if (index >= 0) MOCK_EMPLOYEES[index] = employee;
    } else {
      MOCK_EMPLOYEES.unshift(employee);
    }

    syncEmployeeDevice(employee, previous ?? null, settings, updateSettings);
    setEmployees([...MOCK_EMPLOYEES]);
    toast.success(previous ? "Xodim ma'lumotlari yangilandi" : "Yangi xodim qo'shildi");
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const index = MOCK_EMPLOYEES.findIndex((item) => item.id === deleting.id);
    if (index >= 0) MOCK_EMPLOYEES.splice(index, 1);
    removeEmployeeDevice(deleting, settings, updateSettings);
    setEmployees([...MOCK_EMPLOYEES]);
    toast.success("Xodim o'chirildi", { description: deleting.name });
    setDeleting(null);
  };

  return (
    <div className="xodimlar-page flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="border-b bg-card p-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <UsersRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight">Xodimlar</h1>
              <p className="text-sm text-muted-foreground">
                Xodimlar bazasi, tizimga kirish va oylik/avans cheklari
              </p>
            </div>
          </div>

          <div className="xodimlar-page-actions flex min-w-0 flex-wrap items-center gap-2">
            <Button variant="default" onClick={() => setMode("list")} className="gap-2">
              <UsersRound className="h-4 w-4" />
              Xodimlar
            </Button>
            <Button variant="default" onClick={() => setMode("work-time")} className="gap-2">
              <Clock3 className="h-4 w-4" />
              Ish vaqti
            </Button>
            <Button variant="default" onClick={() => setMode("salary")} className="gap-2">
              <Calculator className="h-4 w-4" />
              Oylik hisoblash
            </Button>
            {mode === "list" && (
              <Button onClick={openAdd} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Yangi xodim
              </Button>
            )}
          </div>
        </div>

        {mode === "list" && (
          <div className="xodimlar-search-row mt-4 flex min-w-0 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ID, ism, telefon yoki login orqali qidirish..."
                className="h-10 pl-9"
              />
            </div>
            <Badge variant="secondary" className="h-9 px-3">
              {rows.length} ta xodim
            </Badge>
          </div>
        )}
      </div>

      {mode === "work-time" || mode === "salary" ? (
        <WorkTimeCalculator employees={employees} mode={mode} cashierName={settings.username} />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Xodim ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Nomi</th>
                  <th className="px-4 py-3 text-left font-semibold">Raqami</th>
                  <th className="px-4 py-3 text-left font-semibold">Tug'ilgan kuni</th>
                  <th className="w-36 px-4 py-3 text-center font-semibold">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-mono font-semibold">{employee.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{employee.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {employeeRoles(employee).map((role) => (
                          <Badge key={role} variant="outline" className="text-[10px]">
                            {role}
                          </Badge>
                        ))}
                        {employee.deviceLogin && (
                          <Badge className="gap-1 text-[10px]">
                            <LockKeyhole className="h-3 w-3" />
                            {employee.deviceLogin}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{employee.phone || "-"}</div>
                      {employee.phone2 && (
                        <div className="text-xs text-muted-foreground">{employee.phone2}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(employee.birthDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(employee)}
                          aria-label="Xodimni tahrirlash"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(employee)}
                          aria-label="Xodimni o'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setHistoryEmployee(employee)}
                          aria-label="Oylik va avans cheklari"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Bu qidiruv bo'yicha xodim topilmadi
              </div>
            )}
          </div>
        </div>
      )}

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editing}
        onSave={handleSave}
      />
      <EmployeeReceiptsDialog employee={historyEmployee} onClose={() => setHistoryEmployee(null)} />
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xodimni o'chirish</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <b className="text-foreground">{deleting?.name}</b> bazadan o'chiriladi. Agar bu xodimga
            login berilgan bo'lsa, tizimdagi device/user yozuvi ham olib tashlanadi.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Bekor
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkTimeCalculator({
  employees,
  mode,
  cashierName,
}: {
  employees: Employee[];
  mode: "work-time" | "salary";
  cashierName: string;
}) {
  const [workQuery, setWorkQuery] = React.useState("");
  const [scanCode, setScanCode] = React.useState("");
  const [scanAction, setScanAction] = React.useState<ScanResult["action"]>("in");
  const [lastScanResult, setLastScanResult] = React.useState<ScanResult | null>(null);
  const scanInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedMonth, setSelectedMonth] = React.useState(() => currentMonthKey());
  const [exceptionAddOpen, setExceptionAddOpen] = React.useState(false);
  const [exceptionListOpen, setExceptionListOpen] = React.useState(false);
  const [exceptionQuery, setExceptionQuery] = React.useState("");
  const [selectedExceptionId, setSelectedExceptionId] = React.useState("");
  const [fineDialogOpen, setFineDialogOpen] = React.useState(false);
  const [scanDialogOpen, setScanDialogOpen] = React.useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [calendarEmployee, setCalendarEmployee] = React.useState<Employee | null>(null);
  const [salesEmployee, setSalesEmployee] = React.useState<Employee | null>(null);
  const [salaryStatus, setSalaryStatus] = React.useState<SalaryStatusFilter>("all");
  const [paymentVersion, setPaymentVersion] = React.useState(0);
  const [fineRules, setFineRules] = React.useState<FineRule[]>([
    { id: "fine-10", minutes: 10, amount: 10000 },
    { id: "fine-30", minutes: 30, amount: 50000 },
  ]);
  const [fineMinutes, setFineMinutes] = React.useState("");
  const [fineAmount, setFineAmount] = React.useState("");
  const [defaultSchedule, setDefaultSchedule] = React.useState<WorkSchedule>({
    start: "09:00",
    end: "18:00",
  });
  const [exceptions, setExceptions] = React.useState<Record<string, WorkSchedule>>({});
  const [attendance, setAttendance] = React.useState<AttendanceState>(() =>
    seedAttendance(employees, currentMonthDays(currentMonthKey())),
  );
  const days = React.useMemo(() => currentMonthDays(selectedMonth), [selectedMonth]);
  const isEditablePeriod = selectedMonth === currentMonthKey();
  const isSalaryMode = mode === "salary";
  const todayAttendanceDay = React.useMemo(() => {
    if (selectedMonth !== currentMonthKey()) return null;
    const today = new Date().getDate();
    return days.find((day) => day.day === today) ?? null;
  }, [days, selectedMonth]);
  const calculatorTitle = isSalaryMode ? "Oylik hisoblash" : "Oy bo'yicha ish vaqti";
  const filterTitle = isSalaryMode ? "Xodim filteri" : "Ish vaqtini filterlash";
  const filterPlaceholder = isSalaryMode
    ? "Xodim ID yoki ismi orqali filter..."
    : "Xodim ID, ism yoki status orqali filter...";

  React.useEffect(() => {
    setAttendance((current) => {
      const next = { ...current };
      employees.forEach((employee) => {
        next[employee.id] = next[employee.id] ?? {};
        days.forEach((day) => {
          if (!next[employee.id][day.key]) {
            const generated = seedAttendance([employee], days)[employee.id]?.[day.key];
            if (generated) next[employee.id][day.key] = generated;
          }
        });
      });
      return next;
    });
  }, [employees, days]);

  React.useEffect(() => {
    if (scanDialogOpen) scanInputRef.current?.focus();
  }, [scanDialogOpen]);

  const monthLabel = React.useMemo(() => {
    const [year, month] = selectedMonth.split("-").map((part) => Number(part));
    return new Date(year, month - 1, 1).toLocaleDateString("uz-UZ", {
      month: "long",
      year: "numeric",
    });
  }, [selectedMonth]);
  const filteredEmployees = React.useMemo(() => {
    const q = workQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) => {
      const searchable = isSalaryMode
        ? `${employee.id} ${employee.name}`
        : `${employee.id} ${employee.name} ${employee.role} ${employee.phone ?? ""} ${employee.deviceLogin ?? ""}`;
      return searchable.toLowerCase().includes(q);
    });
  }, [employees, isSalaryMode, workQuery]);
  const paidEmployeeIds = React.useMemo(
    () =>
      new Set(
        MOCK_WITHDRAWALS.filter(
          (withdrawal) =>
            withdrawal.category === "Oylik" &&
            withdrawal.employeeId &&
            isInMonthDays(withdrawal.date, days),
        ).map((withdrawal) => withdrawal.employeeId as string),
      ),
    [days, paymentVersion],
  );
  const salaryMetrics = React.useMemo(
    () =>
      filteredEmployees
        .map((employee) =>
          buildSalaryMetric(employee, days, attendance, defaultSchedule, exceptions, fineRules),
        )
        .filter((metric) => {
          if (salaryStatus === "all") return true;
          const isPaid = paidEmployeeIds.has(metric.employee.id);
          return salaryStatus === "paid" ? isPaid : !isPaid;
        }),
    [
      filteredEmployees,
      days,
      attendance,
      defaultSchedule,
      exceptions,
      fineRules,
      salaryStatus,
      paidEmployeeIds,
    ],
  );
  const calendarMetric = React.useMemo(() => {
    if (!calendarEmployee) return null;
    return buildSalaryMetric(
      calendarEmployee,
      days,
      attendance,
      defaultSchedule,
      exceptions,
      fineRules,
    );
  }, [calendarEmployee, days, attendance, defaultSchedule, exceptions, fineRules]);
  const salesMetric = React.useMemo(() => {
    if (!salesEmployee) return null;
    return buildSalaryMetric(
      salesEmployee,
      days,
      attendance,
      defaultSchedule,
      exceptions,
      fineRules,
    );
  }, [salesEmployee, days, attendance, defaultSchedule, exceptions, fineRules]);
  const exceptionEmployees = React.useMemo(
    () =>
      employees.filter((employee) => Object.prototype.hasOwnProperty.call(exceptions, employee.id)),
    [employees, exceptions],
  );
  const exceptionSearchRows = React.useMemo(() => {
    const q = exceptionQuery.trim().toLowerCase();
    return employees
      .filter((employee) => !Object.prototype.hasOwnProperty.call(exceptions, employee.id))
      .filter((employee) => {
        if (!q) return true;
        return `${employee.id} ${employee.name} ${employee.role}`.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [employees, exceptions, exceptionQuery]);

  const setException = (employeeId: string, field: keyof WorkSchedule, value: string) => {
    setExceptions((current) => ({
      ...current,
      [employeeId]: {
        start: current[employeeId]?.start ?? "",
        end: current[employeeId]?.end ?? "",
        [field]: value,
      },
    }));
  };

  const addExceptionEmployee = () => {
    if (!selectedExceptionId) return;
    setExceptions((current) => ({
      ...current,
      [selectedExceptionId]: current[selectedExceptionId] ?? { start: "", end: "" },
    }));
    setSelectedExceptionId("");
    setExceptionQuery("");
    setExceptionAddOpen(false);
    setExceptionListOpen(true);
  };

  const removeExceptionEmployee = (employeeId: string) => {
    setExceptions((current) => {
      const next = { ...current };
      delete next[employeeId];
      return next;
    });
  };

  const addFineRule = () => {
    const minutes = Math.max(0, Number(fineMinutes) || 0);
    const amount = Math.max(0, Number(fineAmount) || 0);
    if (!minutes || !amount) {
      toast.error("Jarima uchun daqiqa va summa kiriting");
      return;
    }
    setFineRules((current) =>
      [...current, { id: `fine-${Date.now()}`, minutes, amount }].sort(
        (a, b) => a.minutes - b.minutes,
      ),
    );
    setFineMinutes("");
    setFineAmount("");
  };

  const removeFineRule = (id: string) => {
    setFineRules((current) => current.filter((rule) => rule.id !== id));
  };

  const setTime = (
    employeeId: string,
    dayKey: string,
    field: keyof AttendanceRecord,
    value: string,
  ) => {
    setAttendance((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] ?? {}),
        [dayKey]: {
          in: current[employeeId]?.[dayKey]?.in ?? "",
          out: current[employeeId]?.[dayKey]?.out ?? "",
          off: current[employeeId]?.[dayKey]?.off,
          [field]: value,
        },
      },
    }));
  };

  const setDayOff = (employeeId: string, dayKey: string) => {
    if (!isEditablePeriod) return;
    setAttendance((current) => {
      const old = current[employeeId]?.[dayKey] ?? { in: "", out: "" };
      return {
        ...current,
        [employeeId]: {
          ...(current[employeeId] ?? {}),
          [dayKey]: {
            ...old,
            off: !old.off,
          },
        },
      };
    });
  };

  const handleScanAttendance = (event: React.FormEvent) => {
    event.preventDefault();
    const code = scanCode.trim();
    if (!code) {
      toast.error("Skaner uchun xodim ID kiriting");
      return;
    }
    if (!isEditablePeriod || !todayAttendanceDay) {
      toast.error("Skaner faqat joriy oy va bugungi kun uchun ishlaydi");
      return;
    }

    const employee = findEmployeeByScanCode(code, employees);
    if (!employee) {
      toast.error("Xodim topilmadi", { description: code });
      return;
    }

    const dayKey = todayAttendanceDay.key;
    const record = attendance[employee.id]?.[dayKey] ?? { in: "", out: "" };
    if (record.off) {
      toast.error("Bu xodim bugun dam kuni sifatida belgilangan", {
        description: employee.name,
      });
      return;
    }
    if (scanAction === "in" && record.in) {
      toast.info("Bugungi kelish vaqti allaqachon kiritilgan", {
        description: `${employee.name}: ${record.in}`,
      });
      setScanCode("");
      scanInputRef.current?.focus();
      return;
    }
    if (scanAction === "out" && record.out) {
      toast.info("Bugungi ketish vaqti allaqachon kiritilgan", {
        description: `${employee.name}: ${record.out}`,
      });
      setScanCode("");
      scanInputRef.current?.focus();
      return;
    }

    const action = scanAction;
    const time = currentTimeValue();
    setAttendance((current) => ({
      ...current,
      [employee.id]: {
        ...(current[employee.id] ?? {}),
        [dayKey]: {
          in: record.in,
          out: record.out,
          off: record.off,
          [action]: time,
        },
      },
    }));
    setLastScanResult({
      employeeId: employee.id,
      employeeName: employee.name,
      action,
      time,
    });
    setScanCode("");
    scanInputRef.current?.focus();
    toast.success(
      action === "in" ? "Ishga kelish vaqti qo'shildi" : "Ishdan ketish vaqti qo'shildi",
      {
        description: `${employee.name} - ${time}`,
      },
    );
  };

  const confirmSalary = (metric: SalaryMetric) => {
    if (paidEmployeeIds.has(metric.employee.id)) return;
    const amount = Math.round(metric.totalSalary);
    if (amount <= 0) {
      toast.error(
        "Oylik summasi 0 so'm. Tasdiqlash uchun ishlagan vaqt yoki oylik ma'lumotini tekshiring.",
      );
      return;
    }

    MOCK_WITHDRAWALS.unshift({
      id: nextWithdrawalId(),
      date: new Date().toISOString(),
      cashier: cashierName || "Admin",
      category: "Oylik",
      cash: amount,
      cardAmount: 0,
      currencies: [],
      note: `${monthLabel} uchun oylik`,
      employeeId: metric.employee.id,
      employeeName: metric.employee.name,
    });
    setPaymentVersion((version) => version + 1);
    toast.success("Oylik berildi", {
      description: `${metric.employee.name} - ${formatSom(amount)}`,
    });
  };

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20 ${
        isSalaryMode ? "p-2" : "p-4"
      }`}
    >
      <div
        className={`flex-shrink-0 rounded-lg border bg-card ${
          isSalaryMode ? "mb-2 p-2" : "mb-3 p-2.5"
        }`}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className={isSalaryMode ? "min-w-[220px] flex-1" : "min-w-[260px] flex-1"}>
            <div className="mb-1 text-xs font-bold">{filterTitle}</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={workQuery}
                onChange={(event) => setWorkQuery(event.target.value)}
                placeholder={filterPlaceholder}
                className="h-8 pl-9 text-xs"
              />
            </div>
            {!isSalaryMode && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScheduleDialogOpen(true)}
                  className="h-8 w-8 shrink-0"
                  title="Qatiy ish vaqti"
                  aria-label="Qatiy ish vaqti"
                >
                  <Clock3 className="h-4 w-4 text-primary" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScanDialogOpen(true)}
                  className="h-8 w-8 shrink-0"
                  title="ID skaner orqali kirim/chiqim"
                  aria-label="ID skaner orqali kirim/chiqim"
                >
                  <ScanBarcode className="h-4 w-4 text-primary" />
                </Button>
                <Badge variant="secondary" className="h-8 px-2">
                  {defaultSchedule.start || "--:--"} - {defaultSchedule.end || "--:--"}
                </Badge>
                {lastScanResult && (
                  <Badge variant="outline" className="h-8 gap-1 px-2">
                    {lastScanResult.action === "in" ? (
                      <LogIn className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <LogOut className="h-3 w-3 text-primary" />
                    )}
                    {lastScanResult.employeeId} - {lastScanResult.time}
                  </Badge>
                )}
              </div>
            )}
          </div>
          {isSalaryMode && (
            <div className="min-w-[180px] space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
              <Select
                value={salaryStatus}
                onValueChange={(value) => setSalaryStatus(value as SalaryStatusFilter)}
              >
                <SelectTrigger className="h-8 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hammasi</SelectItem>
                  <SelectItem value="unpaid">Hali berilmagan</SelectItem>
                  <SelectItem value="paid">Oylik berildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div
            className={
              isSalaryMode
                ? "min-w-[170px] space-y-1.5"
                : "-mt-2 min-w-[220px] space-y-1.5"
            }
          >
            <Label className="text-xs font-semibold text-muted-foreground">Davr</Label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value || currentMonthKey())}
              className={
                isSalaryMode
                  ? "h-8 w-full bg-background text-xs"
                  : "h-9 w-full min-w-[220px] bg-background text-sm"
              }
            />
          </div>
          {!isEditablePeriod && (
            <Badge variant="secondary" className="h-8 px-3">
              Faqat ko'rish
            </Badge>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4">
        {isSalaryMode ? (
          <SalarySummary
            metrics={salaryMetrics}
            monthLabel={monthLabel}
            paidEmployeeIds={paidEmployeeIds}
            onOpenCalendar={setCalendarEmployee}
            onOpenSales={setSalesEmployee}
            onConfirm={confirmSalary}
          />
        ) : (
          <section className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-card">
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
              <div>
                <h2 className="font-bold">
                  {calculatorTitle} - {monthLabel}
                </h2>
                <div className="text-xs text-muted-foreground">
                  Filter bo'yicha jadvaldagi xodimlar va jami hisoblar o'zgaradi.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{days.length} kun</Badge>
                <Badge variant="outline">{filteredEmployees.length} xodim</Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-max min-w-full table-fixed text-xs">
                <thead className="sticky top-0 z-30 bg-muted/95 text-muted-foreground shadow-sm">
                  <tr className="border-b">
                    <th className="sticky left-0 z-20 w-44 bg-muted/90 px-3 py-2 text-left">
                      Ismi
                    </th>
                    {days.map((day) => (
                      <th key={day.key} className="w-28 border-l px-2 py-2 text-center">
                        <div className="font-bold text-foreground">{day.day}</div>
                        <div className="text-[10px]">{day.weekday}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const expected = expectedSchedule(employee.id, defaultSchedule, exceptions);
                    const hourly = hourlyRateForEmployee(employee, defaultSchedule);
                    const totalMinutes = days.reduce(
                      (sum, day) => sum + workedMinutes(attendance[employee.id]?.[day.key]),
                      0,
                    );
                    const totalFine = days.reduce((sum, day) => {
                      const record = attendance[employee.id]?.[day.key];
                      if (record?.off) return sum;
                      return sum + fineForArrival(record?.in ?? "", expected.start, fineRules);
                    }, 0);
                    const restDays = days.reduce(
                      (sum, day) => sum + (attendance[employee.id]?.[day.key]?.off ? 1 : 0),
                      0,
                    );
                    const grossAmount = (totalMinutes / 60) * hourly;
                    const netAmount = Math.max(0, grossAmount - totalFine);
                    return (
                      <tr key={employee.id} className="border-b align-top last:border-b-0">
                        <td className="sticky left-0 z-10 w-44 bg-card px-3 py-3">
                          <div className="max-w-36 truncate font-semibold" title={employee.name}>
                            {employee.name}
                          </div>
                          <div className="mt-2 space-y-1 text-[11px] leading-tight">
                            <div className="text-muted-foreground">
                              {formatWorkedTime(totalMinutes)}
                            </div>
                            <div className="text-muted-foreground">Dam: {restDays} kun</div>
                            <div className="font-bold text-primary tabular-nums">
                              {formatSom(netAmount)}
                            </div>
                            {totalFine > 0 && (
                              <div className="font-semibold text-destructive tabular-nums">
                                Jarima: {formatSom(totalFine)}
                              </div>
                            )}
                          </div>
                        </td>
                        {days.map((day) => {
                          const record = attendance[employee.id]?.[day.key] ?? {
                            in: "",
                            out: "",
                            off: false,
                          };
                          const tone = record.off
                            ? {
                                className: "",
                                textClass: "text-muted-foreground",
                                label: "Dam kuni",
                              }
                            : arrivalTone(record.in, expected.start, fineRules);
                          return (
                            <td
                              key={day.key}
                              className={`border-l p-1.5 ${record.off ? "bg-muted/40" : ""}`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="time"
                                    value={record.in}
                                    disabled={!isEditablePeriod || record.off}
                                    onChange={(event) =>
                                      setTime(employee.id, day.key, "in", event.target.value)
                                    }
                                    className={`h-8 min-w-[86px] px-1 text-center text-[11px] ${tone.className}`}
                                  />
                                  <Button
                                    type="button"
                                    variant={record.off ? "default" : "outline"}
                                    size="icon"
                                    disabled={!isEditablePeriod}
                                    onClick={() => setDayOff(employee.id, day.key)}
                                    className="h-8 w-8 shrink-0"
                                    title="Dam kuni"
                                  >
                                    <CalendarX className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <Input
                                  type="time"
                                  value={record.out}
                                  disabled={!isEditablePeriod || record.off}
                                  onChange={(event) =>
                                    setTime(employee.id, day.key, "out", event.target.value)
                                  }
                                  className="h-8 min-w-[86px] px-1 text-center text-[11px]"
                                />
                                {tone.label && (
                                  <div
                                    className={`text-center text-[10px] font-semibold ${tone.textClass}`}
                                  >
                                    {tone.label}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <AttendanceCalendarDialog
        metric={calendarMetric}
        days={days}
        attendance={attendance}
        fineRules={fineRules}
        onClose={() => setCalendarEmployee(null)}
      />
      <SalesCommissionDialog metric={salesMetric} onClose={() => setSalesEmployee(null)} />

      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-primary" />
              ID skaner orqali kirim/chiqim
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
              Xodim ID, QR yoki shtrix kod qiymati yuborilganda tizim bugungi kelish yoki ketish
              vaqtini avtomatik yozadi.
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-1">
              <Button
                type="button"
                variant={scanAction === "in" ? "default" : "ghost"}
                onClick={() => setScanAction("in")}
                className="h-9 gap-2"
              >
                <LogIn className="h-4 w-4" />
                Kirish
              </Button>
              <Button
                type="button"
                variant={scanAction === "out" ? "default" : "ghost"}
                onClick={() => setScanAction("out")}
                className="h-9 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Chiqish
              </Button>
            </div>

            <form className="flex flex-wrap gap-2" onSubmit={handleScanAttendance}>
              <div className="relative min-w-[190px] flex-1">
                <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={scanInputRef}
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="Masalan: X-001"
                  disabled={!isEditablePeriod || !todayAttendanceDay}
                  className="h-9 bg-background pl-9"
                />
              </div>
              <Button
                type="submit"
                disabled={!isEditablePeriod || !todayAttendanceDay || !scanCode.trim()}
                className="h-9 gap-2"
              >
                <ScanBarcode className="h-4 w-4" />
                Skanerlash
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={todayAttendanceDay ? "secondary" : "outline"}>
                {todayAttendanceDay
                  ? `Bugun: ${todayAttendanceDay.day}-${monthLabel}`
                  : "Faqat joriy oyda ishlaydi"}
              </Badge>
              {lastScanResult && (
                <Badge variant="outline" className="gap-1">
                  {lastScanResult.action === "in" ? (
                    <LogIn className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <LogOut className="h-3 w-3 text-primary" />
                  )}
                  {lastScanResult.employeeId} - {lastScanResult.time}
                </Badge>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Qatiy ish vaqti
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ishga kelish">
                <Input
                  type="time"
                  value={defaultSchedule.start}
                  onChange={(event) =>
                    setDefaultSchedule((current) => ({
                      ...current,
                      start: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Ishdan ketish">
                <Input
                  type="time"
                  value={defaultSchedule.end}
                  onChange={(event) =>
                    setDefaultSchedule((current) => ({
                      ...current,
                      end: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              Belgilangan vaqt:{" "}
              <b>
                {defaultSchedule.start || "--:--"} - {defaultSchedule.end || "--:--"}
              </b>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFineDialogOpen(true)}
                className="gap-2"
              >
                <ReceiptText className="h-4 w-4" />
                Jarima
                <Badge variant="secondary" className="ml-1">
                  {fineRules.length}
                </Badge>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExceptionAddOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Istisno xodim qo'shish
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setExceptionListOpen(true)}
                className="gap-2"
              >
                <UsersRound className="h-4 w-4" />
                Istisno xodimlar list
                <Badge variant="outline" className="ml-1">
                  {exceptionEmployees.length}
                </Badge>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fineDialogOpen} onOpenChange={setFineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Jarima qoidalari</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Kechikish daqiqasi">
                <Input
                  type="number"
                  min={1}
                  value={fineMinutes}
                  onChange={(event) => setFineMinutes(event.target.value)}
                  placeholder="10"
                />
              </Field>
              <Field label="Jarima summasi">
                <Input
                  type="number"
                  min={1}
                  value={fineAmount}
                  onChange={(event) => setFineAmount(event.target.value)}
                  placeholder="10000"
                />
              </Field>
              <Button type="button" onClick={addFineRule} className="self-end gap-2">
                <Plus className="h-4 w-4" />
                Qo'shish
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left">Kechikish</th>
                    <th className="px-3 py-2 text-right">Jarima</th>
                    <th className="w-20 px-3 py-2 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {fineRules.map((rule) => (
                    <tr key={rule.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-semibold">{rule.minutes} minutdan</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-primary">
                        {formatSom(rule.amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeFineRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fineRules.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Jarima qoidasi qo'shilmagan.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exceptionAddOpen} onOpenChange={setExceptionAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Istisno xodim qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={exceptionQuery}
                onChange={(event) => {
                  setExceptionQuery(event.target.value);
                  setSelectedExceptionId("");
                }}
                placeholder="Xodim ID yoki ismi orqali qidirish..."
                className="pl-9"
              />
            </div>
            <Select value={selectedExceptionId} onValueChange={setSelectedExceptionId}>
              <SelectTrigger>
                <SelectValue placeholder="Xodim tanlang" />
              </SelectTrigger>
              <SelectContent>
                {exceptionSearchRows.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.id} - {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {exceptionSearchRows.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Qo'shish uchun xodim topilmadi yoki hammasi listda bor.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionAddOpen(false)}>
              Bekor
            </Button>
            <Button onClick={addExceptionEmployee} disabled={!selectedExceptionId}>
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exceptionListOpen} onOpenChange={setExceptionListOpen}>
        <DialogContent className="max-h-[82dvh] max-w-4xl overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Istisno xodimlar list</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Xodim</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Kelish</th>
                  <th className="px-3 py-2 text-left">Ketish</th>
                  <th className="w-20 px-3 py-2 text-center">Amal</th>
                </tr>
              </thead>
              <tbody>
                {exceptionEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs font-semibold">{employee.id}</div>
                      <div className="font-medium">{employee.name}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {employeeRoles(employee).join(", ")}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="time"
                        value={exceptions[employee.id]?.start ?? ""}
                        onChange={(event) => setException(employee.id, "start", event.target.value)}
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="time"
                        value={exceptions[employee.id]?.end ?? ""}
                        onChange={(event) => setException(employee.id, "end", event.target.value)}
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeExceptionEmployee(employee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {exceptionEmployees.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Hali istisno xodim qo'shilmagan.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SalarySummary({
  metrics,
  monthLabel,
  paidEmployeeIds,
  onOpenCalendar,
  onOpenSales,
  onConfirm,
}: {
  metrics: SalaryMetric[];
  monthLabel: string;
  paidEmployeeIds: Set<string>;
  onOpenCalendar: (employee: Employee) => void;
  onOpenSales: (employee: Employee) => void;
  onConfirm: (metric: SalaryMetric) => void;
}) {
  const totals = metrics.reduce(
    (sum, metric) => ({
      commission: sum.commission + metric.commission,
      totalSalary: sum.totalSalary + metric.totalSalary,
    }),
    { commission: 0, totalSalary: 0 },
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-card">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
        <div>
          <h2 className="font-bold">Oylik hisoblash - {monthLabel}</h2>
          <div className="text-xs text-muted-foreground">
            Filter orqali xodimni toping, hisoblangan summani tekshiring va oylikni tasdiqlang.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{metrics.length} xodim</Badge>
          <Badge variant="outline">Savdo foizi: {formatSom(totals.commission)}</Badge>
          <Badge className="bg-primary text-primary-foreground">
            Jami: {formatSom(totals.totalSalary)}
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-semibold">Xodim</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Ishlagan vaqti</th>
              <th className="px-3 py-2 text-right font-semibold">Savdo foizi</th>
              <th className="px-3 py-2 text-right font-semibold">Umumiy summa</th>
              <th className="w-36 px-3 py-2 text-center font-semibold">Tasdiqlash</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const hasCommission = employeeRoles(metric.employee).includes("Sotuvchi");
              const isPaid = paidEmployeeIds.has(metric.employee.id);
              return (
                <tr key={metric.employee.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{metric.employee.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {employeeRoles(metric.employee).map((role) => (
                        <Badge key={role} variant="outline" className="text-[10px]">
                          {role}
                        </Badge>
                      ))}
                      {hasCommission && (
                        <Badge className="text-[10px]">
                          {metric.employee.salesPercent ?? 0}% foiz
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      className={
                        isPaid
                          ? "border-transparent bg-emerald-600 text-white hover:bg-emerald-600"
                          : "border-transparent bg-primary text-primary-foreground hover:bg-primary"
                      }
                    >
                      {isPaid ? "Oylik berildi" : "Hali berilmagan"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenCalendar(metric.employee)}
                      className="h-8 gap-2"
                    >
                      <Clock3 className="h-4 w-4 text-primary" />
                      {formatWorkedTime(metric.totalMinutes)}
                    </Button>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {hasCommission ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSales(metric.employee)}
                        className="h-8 gap-2"
                      >
                        <TrendingUp className="h-4 w-4 text-primary" />
                        {formatSom(metric.commission)}
                      </Button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary">
                    {formatSom(metric.totalSalary)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPaid}
                      onClick={() => onConfirm(metric)}
                      className={
                        isPaid
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : "bg-primary text-primary-foreground"
                      }
                    >
                      {isPaid ? "Tasdiqlandi" : "Tasdiqlash"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {metrics.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Bu filter bo'yicha xodim topilmadi
          </div>
        )}
      </div>
    </section>
  );
}

function AttendanceCalendarDialog({
  metric,
  days,
  attendance,
  fineRules,
  onClose,
}: {
  metric: SalaryMetric | null;
  days: ReturnType<typeof currentMonthDays>;
  attendance: AttendanceState;
  fineRules: FineRule[];
  onClose: () => void;
}) {
  return (
    <Dialog open={!!metric} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[82dvh] max-w-2xl overflow-y-auto p-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock3 className="h-4 w-4 text-primary" />
            {metric?.employee.name} - ishlagan kunlar
          </DialogTitle>
        </DialogHeader>

        {metric && (
          <div className="space-y-3">
            <div className="grid gap-1.5 sm:grid-cols-4">
              <MiniStat label="Ishlagan" value={`${metric.workedDays} kun`} />
              <MiniStat label="Jami vaqt" value={formatWorkedTime(metric.totalMinutes)} />
              <MiniStat label="Kech kelgan" value={`${metric.lateDays} kun`} danger />
              <MiniStat label="Dam olgan" value={`${metric.restDays} kun`} />
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day) => {
                const record = attendance[metric.employee.id]?.[day.key];
                const worked = workedMinutes(record);
                const lateFine = record?.off
                  ? 0
                  : fineForArrival(record?.in ?? "", metric.expected.start, fineRules);
                const isLate =
                  !record?.off &&
                  !!record?.in &&
                  timeToMinutes(record.in) > timeToMinutes(metric.expected.start);
                const tone = record?.off
                  ? "border-muted bg-muted/60 text-muted-foreground"
                  : isLate
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : worked > 0
                      ? "border-emerald-500/40 bg-emerald-50 text-emerald-800"
                      : "border-dashed bg-background text-muted-foreground";
                return (
                  <div key={day.key} className={`min-h-16 rounded-md border p-1.5 ${tone}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold">{day.day}</span>
                      <span className="text-[9px] uppercase">{day.weekday}</span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-[9px] leading-tight">
                      {record?.off ? (
                        <div className="font-semibold">Dam kuni</div>
                      ) : worked > 0 ? (
                        <>
                          <div>
                            {record?.in || "--:--"} - {record?.out || "--:--"}
                          </div>
                          <div className="font-semibold">{formatWorkedTime(worked)}</div>
                          {isLate && (
                            <div className="font-semibold">
                              Kech:{" "}
                              {timeToMinutes(record?.in ?? "") -
                                timeToMinutes(metric.expected.start)}{" "}
                              daq
                            </div>
                          )}
                          {lateFine > 0 && <div>Jarima: {formatSom(lateFine)}</div>}
                        </>
                      ) : (
                        <div>Belgilanmagan</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SalesCommissionDialog({
  metric,
  onClose,
}: {
  metric: SalaryMetric | null;
  onClose: () => void;
}) {
  const [saleDetail, setSaleDetail] = React.useState<Receipt | null>(null);
  const [returnDetail, setReturnDetail] = React.useState<ReturnReceipt | null>(null);

  React.useEffect(() => {
    if (!metric) {
      setSaleDetail(null);
      setReturnDetail(null);
    }
  }, [metric]);

  return (
    <Dialog open={!!metric} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[86dvh] max-w-5xl overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {metric?.employee.name} - foizga kirgan savdolar
          </DialogTitle>
        </DialogHeader>

        {metric && (
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-4">
              <MiniStat label="Savdo" value={formatSom(metric.salesTotal)} />
              <MiniStat label="Qaytim" value={formatSom(metric.returnTotal)} danger />
              <MiniStat label="Foiz" value={`${metric.employee.salesPercent ?? 0}%`} />
              <MiniStat label="Foiz summasi" value={formatSom(metric.commission)} />
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-sm font-bold">
                <ReceiptText className="h-4 w-4 text-primary" />
                Oy davomida qilgan cheklari
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-semibold">Sotuvchi</th>
                    <th className="px-3 py-2 text-left font-semibold">Chek raqami</th>
                    <th className="px-3 py-2 text-right font-semibold">Summa</th>
                    <th className="px-3 py-2 text-left font-semibold">Sana</th>
                    <th className="w-24 px-3 py-2 text-center font-semibold">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {metric.sales.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="cursor-pointer border-b hover:bg-muted/40"
                      onDoubleClick={() => setSaleDetail(receipt)}
                    >
                      <td className="px-3 py-2 font-medium">{receipt.cashier}</td>
                      <td className="px-3 py-2 font-mono text-xs">{receipt.id}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatSom(receipt.total)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {formatDateTime(receipt.date)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSaleDetail(receipt)}
                        >
                          Kirish
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {metric.sales.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Bu oyda savdo cheki yo'q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-sm font-bold">
                <RotateCcw className="h-4 w-4 text-destructive" />
                Sotuvchidan qaytgan tovarlar
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-semibold">Sotuvchi</th>
                    <th className="px-3 py-2 text-left font-semibold">Qaytim raqami</th>
                    <th className="px-3 py-2 text-right font-semibold">Summa</th>
                    <th className="px-3 py-2 text-left font-semibold">Sana</th>
                    <th className="w-24 px-3 py-2 text-center font-semibold">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {metric.returns.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="cursor-pointer border-b hover:bg-muted/40"
                      onDoubleClick={() => setReturnDetail(receipt)}
                    >
                      <td className="px-3 py-2 font-medium">{receipt.cashier}</td>
                      <td className="px-3 py-2 font-mono text-xs">{receipt.id}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-destructive">
                        {formatSom(receipt.total)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {formatDateTime(receipt.date)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnDetail(receipt)}
                        >
                          Kirish
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {metric.returns.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Bu oyda qaytim yo'q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <PayrollReceiptDetailDialog
          receipt={saleDetail}
          kind="sale"
          onClose={() => setSaleDetail(null)}
        />
        <PayrollReceiptDetailDialog
          receipt={returnDetail}
          kind="return"
          onClose={() => setReturnDetail(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 text-sm font-bold tabular-nums ${
          danger ? "text-destructive" : "text-primary"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PayrollReceiptDetailDialog({
  receipt,
  kind,
  onClose,
}: {
  receipt: Receipt | ReturnReceipt | null;
  kind: "sale" | "return";
  onClose: () => void;
}) {
  const items = receipt?.items ?? [];
  const customerName =
    kind === "sale"
      ? (receipt as Receipt | null)?.customerName || "Oddiy mijoz"
      : (receipt as ReturnReceipt | null)?.customerName || "-";

  return (
    <Dialog open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[86dvh] max-w-3xl overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "sale" ? (
              <ReceiptText className="h-5 w-5 text-primary" />
            ) : (
              <RotateCcw className="h-5 w-5 text-destructive" />
            )}
            {kind === "sale" ? "Savdo cheki" : "Qaytim cheki"} - {receipt?.id}
          </DialogTitle>
        </DialogHeader>

        {receipt && (
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-4">
              <Info label="Sotuvchi" value={receipt.cashier} />
              <Info label="Mijoz" value={customerName} />
              <Info label="Sana" value={formatDateTime(receipt.date)} />
              <Info label="Jami" value={formatSom(receipt.total)} />
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left">Tovar</th>
                    <th className="px-3 py-2 text-right">Narx</th>
                    <th className="px-3 py-2 text-center">Miqdor</th>
                    <th className="px-3 py-2 text-right">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: ReceiptItem, index) => (
                    <tr key={`${receipt.id}-${index}`} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.name}</div>
                        {item.note && (
                          <div className="text-xs text-muted-foreground">{item.note}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatSom(item.price)}</td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {item.qty} {item.unit}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatSom(item.price * item.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {"reason" in receipt && receipt.reason && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Sabab: {receipt.reason}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSave: (employee: Employee, previous?: Employee | null) => void;
}) {
  const [form, setForm] = React.useState<EmployeeFormState>(() => makeInitialForm(null));

  React.useEffect(() => {
    if (open) setForm(makeInitialForm(employee));
  }, [open, employee]);

  const workDays = Math.max(0, Number(form.workDays) || 0);
  const workHours = Math.max(0, Number(form.workHoursPerDay) || 0);
  const monthlySalary = Math.max(0, Number(form.monthlySalary) || 0);
  const hourlyRate = workDays > 0 && workHours > 0 ? monthlySalary / (workDays * workHours) : 0;
  const systemEligible = form.roles.some((role) => SYSTEM_ROLES.has(role));

  const patch = (patchValue: Partial<EmployeeFormState>) => {
    setForm((current) => ({ ...current, ...patchValue }));
  };

  const toggleRole = (role: string) => {
    setForm((current) => {
      const exists = current.roles.includes(role);
      const roles = exists
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];
      return {
        ...current,
        roles,
        hasSystemAccess: roles.some((item) => SYSTEM_ROLES.has(item))
          ? current.hasSystemAccess
          : false,
      };
    });
  };

  const addCustomRole = () => {
    const role = form.customRole.trim();
    if (!role) return;
    if (!form.roles.some((item) => item.toLowerCase() === role.toLowerCase())) {
      patch({ roles: [...form.roles, role], customRole: "" });
    } else {
      patch({ customRole: "" });
    }
  };

  const submit = () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!firstName || !lastName) {
      toast.error("Xodim ismi va familyasi kerak");
      return;
    }
    if (form.roles.length === 0) {
      toast.error("Kamida bitta status tanlang");
      return;
    }
    if (form.hasSystemAccess && !systemEligible) {
      toast.error("Login faqat Sotuvchi/Omborchi/Kassir/Direktor/SysAdmin uchun beriladi");
      return;
    }
    if (form.hasSystemAccess && (!form.login.trim() || !form.password.trim())) {
      toast.error("Login va parol kiriting");
      return;
    }

    const name = [firstName, lastName].join(" ");
    const next: Employee = {
      ...(employee ?? {}),
      id: form.id,
      name,
      firstName,
      lastName,
      middleName: form.middleName.trim() || undefined,
      role: form.roles.join(", "),
      roles: form.roles,
      status: "active",
      phone: form.phone.trim() || undefined,
      phone2: form.phone2.trim() || undefined,
      birthDate: form.birthDate || new Date().toISOString().slice(0, 10),
      passport: form.passport.trim() || undefined,
      monthlySalary,
      workDays,
      workHoursPerDay: workHours,
      payType: form.payType,
      salesPercent:
        form.payType === "fixed_plus_sales" ? Math.max(0, Number(form.salesPercent) || 0) : 0,
      source: form.hasSystemAccess ? "device" : "manual",
      deviceLogin: form.hasSystemAccess ? form.login.trim() : undefined,
      devicePassword: form.hasSystemAccess ? form.password.trim() : undefined,
    };

    onSave(next, employee);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-5xl overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {employee ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Xodim ID">
                <Input value={form.id} readOnly className="font-mono font-semibold" />
              </Field>
              <Field label="Ism">
                <Input
                  value={form.firstName}
                  onChange={(event) => patch({ firstName: event.target.value })}
                />
              </Field>
              <Field label="Familya">
                <Input
                  value={form.lastName}
                  onChange={(event) => patch({ lastName: event.target.value })}
                />
              </Field>
              <Field label="Otasining ismi">
                <Input
                  value={form.middleName}
                  onChange={(event) => patch({ middleName: event.target.value })}
                />
              </Field>
              <Field label="Tug'ilgan kuni">
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => patch({ birthDate: event.target.value })}
                />
              </Field>
              <Field label="Passport ma'lumoti">
                <Input
                  value={form.passport}
                  onChange={(event) => patch({ passport: event.target.value })}
                  placeholder="Ixtiyoriy"
                />
              </Field>
              <Field label="Telefon raqami">
                <Input
                  value={form.phone}
                  onChange={(event) => patch({ phone: event.target.value })}
                  placeholder="+998..."
                />
              </Field>
              <Field label="Ikkinchi raqam">
                <Input
                  value={form.phone2}
                  onChange={(event) => patch({ phone2: event.target.value })}
                  placeholder="+998..."
                />
              </Field>
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-3 flex items-center gap-2">
                <IdCard className="h-4 w-4 text-primary" />
                <Label>Statuslar</Label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PRESET_ROLES.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={form.roles.includes(role)}
                      onCheckedChange={() => toggleRole(role)}
                    />
                    <span>{role}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={form.customRole}
                  onChange={(event) => patch({ customRole: event.target.value })}
                  placeholder="Qo'lda yangi status kiritish..."
                  onKeyDown={(event) =>
                    event.key === "Enter" && (event.preventDefault(), addCustomRole())
                  }
                />
                <Button type="button" variant="outline" onClick={addCustomRole} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Qo'shish
                </Button>
              </div>
              {form.roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-3 flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-primary" />
                <Label>Tizimdan foydalanish</Label>
              </div>
              <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                <Checkbox
                  checked={form.hasSystemAccess}
                  disabled={!systemEligible}
                  onCheckedChange={(checked) => patch({ hasSystemAccess: checked === true })}
                />
                <span>Sotuvchi/Omborchi/Kassir/Direktor/SysAdmin sifatida login berish</span>
              </label>
              {!systemEligible && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Login va parol qo'shish uchun yuqoridagi tizim rollaridan kamida bittasini
                  tanlang.
                </p>
              )}
              {form.hasSystemAccess && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Login">
                    <Input
                      value={form.login}
                      onChange={(event) => patch({ login: event.target.value })}
                    />
                  </Field>
                  <Field label="Parol">
                    <Input
                      value={form.password}
                      onChange={(event) => patch({ password: event.target.value })}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-3">
              <Label>Oylik turi</Label>
              <Select
                value={form.payType}
                onValueChange={(value) => patch({ payType: value as PayType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Ish vaqti bo'yicha</SelectItem>
                  <SelectItem value="fixed_plus_sales">Ish vaqti + savdo foizi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Field label="Ish kuni">
                <Input
                  type="number"
                  min={0}
                  value={form.workDays}
                  onChange={(event) => patch({ workDays: event.target.value })}
                />
              </Field>
              <Field label="Kunlik ish soati">
                <Input
                  type="number"
                  min={0}
                  value={form.workHoursPerDay}
                  onChange={(event) => patch({ workHoursPerDay: event.target.value })}
                />
              </Field>
              <Field label="Oylik summa">
                <Input
                  type="number"
                  min={0}
                  value={form.monthlySalary}
                  onChange={(event) => patch({ monthlySalary: event.target.value })}
                />
              </Field>
              {form.payType === "fixed_plus_sales" && (
                <Field label="Savdo foizi">
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.salesPercent}
                    onChange={(event) => patch({ salesPercent: event.target.value })}
                  />
                </Field>
              )}
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Soatbay hisob</div>
              <div className="mt-1 text-2xl font-bold text-primary tabular-nums">
                {formatSom(hourlyRate)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {workDays} kun x {workHours} soat asosida
              </div>
              {form.payType === "fixed_plus_sales" && (
                <div className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  + {Number(form.salesPercent) || 0}% savdo ulushi
                </div>
              )}
            </div>
          </aside>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={submit}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeReceiptsDialog({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const [period, setPeriod] = React.useState<PeriodFilterValue>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  React.useEffect(() => {
    if (!employee) {
      setPeriod("all");
      setFrom("");
      setTo("");
    }
  }, [employee]);

  const rows = React.useMemo(() => {
    if (!employee) return [];
    return MOCK_WITHDRAWALS.filter(
      (withdrawal) =>
        withdrawal.employeeId === employee.id && inDateRange(withdrawal.date, period, from, to),
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [employee, period, from, to]);

  const total = rows.reduce((sum, row) => sum + withdrawalTotal(row), 0);

  return (
    <Dialog open={!!employee} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[86dvh] max-w-4xl overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            {employee?.name} - oylik va avans cheklari
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
          <PeriodFilter
            value={period}
            onValueChange={setPeriod}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <div className="rounded-md bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
            Jami: {formatSom(total)}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div>
                  <div className="font-mono text-sm font-bold">{row.id}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(row.date)}
                  </div>
                </div>
                <Badge variant={row.category === "Avans" ? "secondary" : "default"}>
                  {row.category}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <ReceiptLine label="Xodim" value={row.employeeName ?? employee?.name ?? "-"} />
                <ReceiptLine label="Kassir" value={row.cashier} />
                <ReceiptLine label="Naqd" value={formatSom(row.cash)} />
                <ReceiptLine label="Karta" value={formatSom(row.cardAmount)} />
                {row.note && <ReceiptLine label="Izoh" value={row.note} />}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Jami</span>
                <span className="text-lg font-bold text-primary tabular-nums">
                  {formatSom(withdrawalTotal(row))}
                </span>
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Bu davrda oylik yoki avans cheki topilmadi
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function makeInitialForm(employee: Employee | null): EmployeeFormState {
  if (!employee) {
    return {
      id: nextEmployeeId(),
      firstName: "",
      lastName: "",
      middleName: "",
      roles: [],
      customRole: "",
      birthDate: "",
      phone: "",
      phone2: "",
      passport: "",
      hasSystemAccess: false,
      login: "",
      password: "",
      payType: "fixed",
      workDays: "26",
      workHoursPerDay: "8",
      monthlySalary: "",
      salesPercent: "",
    };
  }

  const nameParts = employee.name.split(" ");
  return {
    id: employee.id,
    firstName: employee.firstName ?? nameParts[0] ?? "",
    lastName: employee.lastName ?? nameParts.slice(1).join(" ") ?? "",
    middleName: employee.middleName ?? "",
    roles: employeeRoles(employee),
    customRole: "",
    birthDate: employee.birthDate,
    phone: employee.phone ?? "",
    phone2: employee.phone2 ?? "",
    passport: employee.passport ?? "",
    hasSystemAccess: employee.source === "device" || !!employee.deviceLogin,
    login: employee.deviceLogin ?? "",
    password: employee.devicePassword ?? "",
    payType: employee.payType ?? "fixed",
    workDays: String(employee.workDays ?? 26),
    workHoursPerDay: String(employee.workHoursPerDay ?? 8),
    monthlySalary: employee.monthlySalary ? String(employee.monthlySalary) : "",
    salesPercent: employee.salesPercent ? String(employee.salesPercent) : "",
  };
}

function findEmployeeByScanCode(code: string, employees: Employee[]) {
  const tokens = scanTokens(code);
  if (tokens.length === 0) return null;
  return (
    employees.find((employee) => {
      const candidates = [
        employee.id,
        employee.deviceLogin,
        employee.phone,
        employee.phone2,
      ].flatMap((value) => scanTokens(value ?? ""));
      return candidates.some((candidate) => tokens.includes(candidate));
    }) ?? null
  );
}

function scanTokens(value: string) {
  const raw = value.trim();
  if (!raw) return [];
  const values = new Set<string>([raw]);

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    ["id", "employeeId", "xodimId", "staffId"].forEach((key) => {
      const item = parsed[key];
      if (typeof item === "string" || typeof item === "number") values.add(String(item));
    });
  } catch {}

  try {
    const url = new URL(raw);
    ["id", "employeeId", "xodimId", "staffId"].forEach((key) => {
      const item = url.searchParams.get(key);
      if (item) values.add(item);
    });
    const lastSegment = url.pathname.split("/").filter(Boolean).at(-1);
    if (lastSegment) values.add(lastSegment);
  } catch {}

  const prefixed = raw.match(
    /(?:id|employee|employeeId|xodim|xodimId|staffId)[:=\s]+([a-z0-9_-]+)/i,
  );
  if (prefixed?.[1]) values.add(prefixed[1]);

  return Array.from(values)
    .flatMap((item) => [item, item.replace(/[^\d+]/g, "")])
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function currentTimeValue(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildSalaryMetric(
  employee: Employee,
  days: ReturnType<typeof currentMonthDays>,
  attendance: AttendanceState,
  defaultSchedule: WorkSchedule,
  exceptions: Record<string, WorkSchedule>,
  fineRules: FineRule[],
): SalaryMetric {
  const expected = expectedSchedule(employee.id, defaultSchedule, exceptions);
  const hourly = hourlyRateForEmployee(employee, expected);
  let totalMinutes = 0;
  let workedDays = 0;
  let lateDays = 0;
  let restDays = 0;
  let totalFine = 0;

  days.forEach((day) => {
    const record = attendance[employee.id]?.[day.key];
    const minutes = workedMinutes(record);
    totalMinutes += minutes;
    if (minutes > 0) workedDays += 1;
    if (record?.off) {
      restDays += 1;
      return;
    }
    if (record?.in && timeToMinutes(record.in) > timeToMinutes(expected.start)) {
      lateDays += 1;
    }
    totalFine += fineForArrival(record?.in ?? "", expected.start, fineRules);
  });

  const sales = MOCK_RECEIPTS.filter(
    (receipt) =>
      isInMonthDays(receipt.date, days) && employeeMatchesCashier(employee, receipt.cashier),
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const returns = MOCK_RETURN_RECEIPTS.filter(
    (receipt) =>
      isInMonthDays(receipt.date, days) && employeeMatchesCashier(employee, receipt.cashier),
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const salesTotal = sales.reduce((sum, receipt) => sum + receipt.total, 0);
  const returnTotal = returns.reduce((sum, receipt) => sum + receipt.total, 0);
  const baseSalary = Math.max(0, (totalMinutes / 60) * hourly - totalFine);
  const commission = (Math.max(0, salesTotal - returnTotal) * (employee.salesPercent ?? 0)) / 100;

  return {
    employee,
    expected,
    totalMinutes,
    workedDays,
    lateDays,
    restDays,
    totalFine,
    baseSalary,
    sales,
    returns,
    salesTotal,
    returnTotal,
    commission,
    totalSalary: baseSalary + commission,
  };
}

function isInMonthDays(dateIso: string, days: ReturnType<typeof currentMonthDays>) {
  const dayKey = new Date(dateIso).toISOString().slice(0, 10);
  return days.some((day) => day.key === dayKey);
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

function employeeRoles(employee: Employee) {
  if (employee.roles?.length) return employee.roles;
  return employee.role
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function nextEmployeeId() {
  const max = MOCK_EMPLOYEES.reduce((largest, employee) => {
    const value = Number(employee.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(largest, value) : largest;
  }, 0);
  return `X-${String(max + 1).padStart(3, "0")}`;
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

function expectedSchedule(
  employeeId: string,
  defaultSchedule: WorkSchedule,
  exceptions: Record<string, WorkSchedule>,
): WorkSchedule {
  return {
    start: exceptions[employeeId]?.start || defaultSchedule.start,
    end: exceptions[employeeId]?.end || defaultSchedule.end,
  };
}

function hourlyRateForEmployee(employee: Employee, schedule: WorkSchedule) {
  const workDays = employee.workDays || 26;
  const dailyHours =
    employee.workHoursPerDay ||
    Math.max(1, (timeToMinutes(schedule.end) - timeToMinutes(schedule.start)) / 60);
  return workDays > 0 && dailyHours > 0 ? employee.monthlySalary / (workDays * dailyHours) : 0;
}

function arrivalTone(actual: string, expected: string, fineRules: FineRule[]) {
  if (!actual || !expected) return { className: "", textClass: "", label: "" };
  const diff = timeToMinutes(actual) - timeToMinutes(expected);
  if (diff > 0) {
    const fine = fineForDelay(diff, fineRules);
    return {
      className: "border-destructive bg-destructive/10 text-destructive",
      textClass: "text-destructive",
      label: fine > 0 ? `${diff} daq · ${formatSom(fine)}` : `Shtraf +${diff} daq`,
    };
  }
  if (diff < 0) {
    return {
      className: "border-emerald-500 bg-emerald-50 text-emerald-700",
      textClass: "text-emerald-700",
      label: `${Math.abs(diff)} daq erta`,
    };
  }
  return { className: "", textClass: "text-muted-foreground", label: "Vaqtida" };
}

function fineForArrival(actual: string, expected: string, fineRules: FineRule[]) {
  if (!actual || !expected) return 0;
  return fineForDelay(Math.max(0, timeToMinutes(actual) - timeToMinutes(expected)), fineRules);
}

function fineForDelay(delayMinutes: number, fineRules: FineRule[]) {
  return (
    fineRules
      .filter((rule) => delayMinutes >= rule.minutes)
      .sort((a, b) => b.minutes - a.minutes)[0]?.amount ?? 0
  );
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

function syncEmployeeDevice(
  employee: Employee,
  previous: Employee | null,
  settings: ReturnType<typeof useApp>["settings"],
  updateSettings: ReturnType<typeof useApp>["updateSettings"],
) {
  const devices = settings.devices.filter((device) => {
    if (previous?.deviceLogin && device.login === previous.deviceLogin) return false;
    if (device.id === `employee-${employee.id}`) return false;
    return true;
  });

  if (!employee.deviceLogin) {
    updateSettings({ devices });
    return;
  }

  updateSettings({
    devices: [
      ...devices,
      {
        id: `employee-${employee.id}`,
        name: employee.name,
        login: employee.deviceLogin,
        password: employee.devicePassword || "1234",
        model: "Xodim profili",
        lastConnectedAt: new Date().toISOString(),
        permissions: permissionsForRoles(employeeRoles(employee)),
        isMain: false,
      },
    ],
  });
}

function removeEmployeeDevice(
  employee: Employee,
  settings: ReturnType<typeof useApp>["settings"],
  updateSettings: ReturnType<typeof useApp>["updateSettings"],
) {
  updateSettings({
    devices: settings.devices.filter(
      (device) => device.id !== `employee-${employee.id}` && device.login !== employee.deviceLogin,
    ),
  });
}

function permissionsForRoles(roles: string[]): Permission[] {
  const permissions = new Set<Permission>();
  roles.forEach((role) => {
    if (role === "Sotuvchi") permissions.add("sotuv");
    if (role === "Kassir") permissions.add("kassa");
    if (role === "Omborchi") permissions.add("tovarlar");
    if (role === "Direktor" || role === "SysAdmin") {
      permissions.add("sotuv");
      permissions.add("kassa");
      permissions.add("tovarlar");
      permissions.add("sozlamalar");
    }
  });
  return Array.from(permissions);
}

function withdrawalTotal(row: CashWithdrawal) {
  return (
    row.cash + row.cardAmount + row.currencies.reduce((sum, currency) => sum + currency.amount, 0)
  );
}

function nextWithdrawalId() {
  const max = MOCK_WITHDRAWALS.reduce((largest, withdrawal) => {
    const value = Number(withdrawal.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(largest, value) : largest;
  }, 0);
  return `CH-${String(max + 1).padStart(4, "0")}`;
}

function inDateRange(dateIso: string, period: PeriodFilterValue, from: string, to: string) {
  if (period === "all") return true;
  const date = new Date(dateIso);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "today") return date >= start && date <= end;
  if (period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return date >= start && date <= end;
  }
  if (period === "month") {
    start.setDate(1);
    return date >= start && date <= end;
  }
  if (period === "year") {
    start.setMonth(0, 1);
    return date >= start && date <= end;
  }
  if (period === "custom") {
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59`) : null;
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }
  return true;
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
