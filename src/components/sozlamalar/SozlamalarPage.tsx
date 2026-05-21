import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  Monitor,
  Palette,
  Globe,
  Sun,
  Moon,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Laptop,
  Lock,
  ReceiptText,
  QrCode,
  Box,
  Tag,
  Ruler,
} from "lucide-react";
import { useApp, type Permission, type Device, type Lang } from "@/lib/app-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "user", icon: User, key: "user_settings" },
  { id: "interface", icon: Palette, key: "interface_settings" },
  { id: "receipt", icon: ReceiptText, key: "receipt_view" },
  { id: "general", icon: Box, key: "general_edit" },
  { id: "devices", icon: Monitor, key: "device_settings" },
  { id: "language", icon: Globe, key: "language" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

const LANGS: { value: Lang; labelKey: string; flag: string }[] = [
  { value: "uz", labelKey: "uz_latin", flag: "🇺🇿" },
  { value: "uz_cyr", labelKey: "uz_cyrillic", flag: "🇺🇿" },
  { value: "ru", labelKey: "russian", flag: "🇷🇺" },
  { value: "en", labelKey: "english", flag: "🇬🇧" },
];

const ALL_PERMS: Permission[] = ["sotuv", "kassa", "tovarlar", "sozlamalar"];

export function SozlamalarPage() {
  const { settings, updateSettings, t } = useApp();
  const [section, setSection] = React.useState<Section>(() => {
    if (typeof window === "undefined") return "user";
    const params = new URLSearchParams(window.location.search);
    return params.has("connectDevice") || params.has("deviceId") ? "devices" : "user";
  });

  return (
    <div className="settings-shell flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="settings-sidebar flex w-56 flex-shrink-0 flex-col border-r bg-card">
        <div className="settings-sidebar-title border-b p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sozlamalar")}
          </div>
        </div>
        <nav className="settings-nav flex flex-col gap-1 p-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  "settings-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="settings-nav-label whitespace-nowrap">{t(s.key)}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="settings-content flex min-h-0 flex-1 flex-col overflow-auto bg-muted/20 p-6">
        {section === "user" && <UserSection />}
        {section === "interface" && <InterfaceSection />}
        {section === "receipt" && <ReceiptViewSection />}
        {section === "general" && <GeneralEditSection />}
        {section === "devices" && <DevicesSection />}
        {section === "language" && <LanguageSection />}
      </main>
    </div>
  );
}

// ─── User Section ────────────────────────────────────────────────────────────

function UserSection() {
  const { settings, updateSettings, t } = useApp();
  const [name, setName] = React.useState(settings.username);
  const [oldCode, setOldCode] = React.useState("");
  const [newCode, setNewCode] = React.useState("");
  const [newCode2, setNewCode2] = React.useState("");

  const saveName = () => {
    if (!name.trim()) return;
    updateSettings({ username: name.trim() });
    toast.success(t("name_changed"));
  };

  const saveCode = () => {
    if (oldCode !== settings.confirmCode) {
      toast.error("Eski kod noto'g'ri");
      return;
    }
    if (newCode.length < 4) {
      toast.error("Yangi kod kamida 4 ta raqam");
      return;
    }
    if (newCode !== newCode2) {
      toast.error("Yangi kodlar mos emas");
      return;
    }
    updateSettings({ confirmCode: newCode });
    toast.success(t("code_changed"));
    setOldCode("");
    setNewCode("");
    setNewCode2("");
  };

  return (
    <div className="w-full space-y-6">
      <SectionTitle icon={User} title={t("user_settings")} />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Ism */}
        <Card>
          <CardHeader title={t("username")} />
          <div className="flex gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button onClick={saveName} className="gap-2">
              <Check className="h-4 w-4" /> {t("save")}
            </Button>
          </div>
        </Card>

        {/* Tasdiqlash kodi */}
        <Card>
          <CardHeader title={t("confirm_code")} icon={Lock} />
          <div className="grid gap-3 lg:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Eski kod</Label>
              <Input
                type="password"
                value={oldCode}
                onChange={(e) => setOldCode(e.target.value)}
                placeholder="••••"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Yangi kod</Label>
              <Input
                type="password"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="••••"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                Yangi kodni tasdiqlang
              </Label>
              <Input
                type="password"
                value={newCode2}
                onChange={(e) => setNewCode2(e.target.value)}
                placeholder="••••"
              />
            </div>
            <Button onClick={saveCode} className="gap-2 lg:col-span-3">
              <ShieldCheck className="h-4 w-4" /> Kodni o'zgartirish
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function detectDeviceModel() {
  if (typeof navigator === "undefined") return "Noma'lum qurilma";
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || "";

  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s[\d.]+;\s([^;)]+)/i);
    return match?.[1]?.replace(/\s+Build\/.*/, "").trim() || "Android qurilma";
  }
  if (/Windows/i.test(platform) || /Windows/i.test(ua)) return "Windows kompyuter";
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "Mac";
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "Linux kompyuter";
  return platform || "Noma'lum qurilma";
}

function makeDeviceQrPayload(device: Device) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://uzko.local";
  const params = new URLSearchParams({
    connectDevice: "1",
    deviceId: device.id,
    login: device.login ?? "",
  });
  return `${origin}/sozlamalar?${params.toString()}`;
}

function qrImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&format=svg&data=${encodeURIComponent(value)}`;
}

// ─── Interface Section ───────────────────────────────────────────────────────

function InterfaceSection() {
  const { settings, updateSettings, t } = useApp();

  const isDark = settings.theme === "dark";

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <SectionTitle icon={Palette} title={t("interface_settings")} />

      <Card>
        <CardHeader title={t("theme")} />
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard
            label={t("light_mode")}
            icon={Sun}
            active={!isDark}
            onClick={() => updateSettings({ theme: "light" })}
            preview="bg-white border-2"
            previewBars={["bg-slate-200", "bg-slate-100", "bg-slate-50"]}
          />
          <ThemeCard
            label={t("dark_mode")}
            icon={Moon}
            active={isDark}
            onClick={() => updateSettings({ theme: "dark" })}
            preview="bg-slate-900 border-2"
            previewBars={["bg-slate-700", "bg-slate-800", "bg-slate-600"]}
          />
        </div>
      </Card>
    </div>
  );
}

function ThemeCard({
  label,
  icon: Icon,
  active,
  onClick,
  preview,
  previewBars,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  preview: string;
  previewBars: string[];
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
        active ? "border-primary shadow-md" : "border-border hover:border-primary/40",
      )}
    >
      {/* Mini preview */}
      <div className={cn("flex h-24 flex-col gap-2 p-3", preview)}>
        <div className={cn("h-3 w-2/3 rounded", previewBars[0])} />
        <div className={cn("h-2 w-full rounded", previewBars[1])} />
        <div className={cn("h-2 w-4/5 rounded", previewBars[2])} />
      </div>
      <div
        className={cn("flex items-center gap-2 border-t px-3 py-2", active ? "bg-primary/5" : "")}
      >
        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("text-sm font-medium", active ? "text-primary" : "")}>{label}</span>
        {active && <Check className="ml-auto h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}

// ─── Receipt View Section ───────────────────────────────────────────────────

function ReceiptViewSection() {
  const { settings, updateSettings, t } = useApp();
  const receipt = settings.receiptSettings;

  const updateReceipt = (patch: Partial<typeof receipt>) => {
    updateSettings({ receiptSettings: { ...receipt, ...patch } });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <SectionTitle icon={ReceiptText} title={t("receipt_view")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Chek ma'lumotlari" icon={ReceiptText} />
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Do'kon / brand nomi
              </Label>
              <Input
                value={receipt.storeName}
                onChange={(e) => updateReceipt({ storeName: e.target.value })}
                placeholder="Masalan: UZKO SAVDO"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Telefon raqam</Label>
              <Input
                value={receipt.phone}
                onChange={(e) => updateReceipt({ phone: e.target.value })}
                placeholder="Masalan: +998 90 123 45 67"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Ijtimoiy tarmoq</Label>
              <Input
                value={receipt.social}
                onChange={(e) => updateReceipt({ social: e.target.value })}
                placeholder="Masalan: Telegram: @uzko_shop"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Qo'shimcha izoh</Label>
              <Textarea
                rows={3}
                value={receipt.extraNote}
                onChange={(e) => updateReceipt({ extraNote: e.target.value })}
                placeholder="Chek pastida chiqadigan izoh..."
              />
            </div>
            <label className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
              <span className="text-sm font-medium">Tovar kodi chekda ko'rinsin</span>
              <Switch
                checked={receipt.showProductCode}
                onCheckedChange={(checked) => updateReceipt({ showProductCode: checked })}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              O'zgarishlar avtomatik saqlanadi va sotuvdagi demo chek ko'rinishiga qo'llanadi.
            </p>
          </div>
        </Card>

        <div className="rounded-xl border bg-white p-4 font-mono text-xs text-black shadow-sm">
          <div className="text-center">
            <div className="text-sm font-bold">{receipt.storeName || "UZKO SAVDO"}</div>
            {receipt.phone && <div className="mt-0.5 text-[10px]">Tel: {receipt.phone}</div>}
            {receipt.social && <div className="text-[10px]">{receipt.social}</div>}
            <div className="my-2 border-b border-dashed border-black/40" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Mahsulot A</span>
              <span>25 000 so'm</span>
            </div>
            {receipt.showProductCode && <div className="text-[10px] text-black/70">Kod: A-001</div>}
            <div className="flex justify-between">
              <span>Mahsulot B</span>
              <span>12 000 so'm</span>
            </div>
            {receipt.showProductCode && <div className="text-[10px] text-black/70">Kod: B-002</div>}
          </div>
          <div className="my-2 border-b border-dashed border-black/40" />
          <div className="flex justify-between text-sm font-bold">
            <span>JAMI:</span>
            <span>37 000 so'm</span>
          </div>
          {receipt.extraNote && (
            <>
              <div className="my-2 border-b border-dashed border-black/40" />
              <div className="whitespace-pre-wrap text-center text-[10px]">{receipt.extraNote}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Devices Section ─────────────────────────────────────────────────────────

function DevicesSection() {
  const { settings, updateSettings, t } = useApp();
  const [addOpen, setAddOpen] = React.useState(false);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const model = detectDeviceModel();
    const params = new URLSearchParams(window.location.search);
    const connectId = params.get("deviceId");
    const connectMode = params.get("connectDevice");
    const targetId = connectId || settings.currentDeviceId;
    const target = settings.devices.find((device) => device.id === targetId);
    if (!target || target.model === model) return;

    if (connectId && connectMode) {
      const exists = settings.accessNotifications.some(
        (item) =>
          item.deviceId === target.id && item.deviceModel === model && item.status === "pending",
      );
      if (exists) return;

      updateSettings({
        accessNotifications: [
          {
            id: `notif-${Date.now()}`,
            title: "Sizning bazangizga ulanmoqchi",
            description: `${target.name} qurilmasi ma'lumotlarni ko'rish va yuklash uchun ruxsat so'ramoqda`,
            date: new Date().toISOString(),
            status: "pending",
            deviceId: target.id,
            deviceModel: model,
            deviceLogin: target.login,
            read: false,
          },
          ...settings.accessNotifications,
        ].slice(0, 12),
      });
      return;
    }

    updateSettings({
      currentDeviceId: target.id,
      devices: settings.devices.map((device) =>
        device.id === target.id
          ? { ...device, model, lastConnectedAt: new Date().toISOString() }
          : device,
      ),
    });
  }, []);

  const togglePerm = (deviceId: string, perm: Permission) => {
    const devices = settings.devices.map((d) => {
      if (d.id !== deviceId) return d;
      const has = d.permissions.includes(perm);
      return {
        ...d,
        permissions: has ? d.permissions.filter((p) => p !== perm) : [...d.permissions, perm],
      };
    });
    updateSettings({ devices });
  };

  const handleRemove = () => {
    if (!removeId) return;
    const devices = settings.devices.filter((d) => d.id !== removeId);
    updateSettings({ devices });
    toast.success(t("device_removed"));
    setRemoveId(null);
  };

  const handleAdd = (name: string, login: string, password: string, perms: Permission[]) => {
    const newDevice: Device = {
      id: `dev_${Date.now()}`,
      name,
      login,
      password,
      model: "QR orqali ulanmagan",
      isMain: false,
      permissions: perms,
    };
    updateSettings({ devices: [...settings.devices, newDevice] });
    toast.success(t("device_added"));
    setAddOpen(false);
  };

  return (
    <div className="settings-devices w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle icon={Monitor} title={t("device_settings")} noMargin />
        {settings.devices.length < 3 && (
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> {t("add_device")}
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {settings.devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isCurrent={device.id === settings.currentDeviceId}
            onTogglePerm={(perm) => togglePerm(device.id, perm)}
            onRemove={() => setRemoveId(device.id)}
            t={t}
          />
        ))}
      </div>

      {/* Add device dialog */}
      <AddDeviceDialog open={addOpen} onOpenChange={setAddOpen} onAdd={handleAdd} t={t} />

      {/* Remove confirm */}
      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("remove_device")}</AlertDialogTitle>
            <AlertDialogDescription>Qurilmani o'chirishni tasdiqlaysizmi?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>{t("remove_device")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const PERM_LABELS: Record<Permission, string> = {
  sotuv: "Sotuv",
  kassa: "Kassa",
  tovarlar: "Tovarlar",
  sozlamalar: "Sozlamalar",
};

function DeviceCard({
  device,
  isCurrent,
  onTogglePerm,
  onRemove,
  t,
}: {
  device: Device;
  isCurrent: boolean;
  onTogglePerm: (p: Permission) => void;
  onRemove: () => void;
  t: (k: string) => string;
}) {
  return (
    <div
      className={cn(
        "settings-device-card",
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        isCurrent && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Laptop className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words font-semibold">{device.name}</span>
            {device.isMain && (
              <Badge variant="secondary" className="text-[10px]">
                {t("main_device")}
              </Badge>
            )}
            {isCurrent && <Badge className="text-[10px]">{t("current_device")}</Badge>}
          </div>
          <div className="break-words text-xs text-muted-foreground">
            {device.permissions.length} ta ruxsat · login: {device.login || "—"} · model:{" "}
            {device.model || "Aniqlanmagan"}
          </div>
        </div>
        {!device.isMain && (
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_150px]">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("permissions")}
          </div>
          <div className="settings-permission-grid grid gap-2">
            {ALL_PERMS.map((perm) => {
              const has = device.permissions.includes(perm);
              const disabled = device.isMain; // main device ruxsatlarini o'zgartirib bo'lmaydi
              return (
                <button
                  key={perm}
                  disabled={disabled}
                  onClick={() => !disabled && onTogglePerm(perm)}
                  className={cn(
                    "settings-permission-button flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium leading-tight transition-colors",
                    has
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground",
                    !disabled && "cursor-pointer hover:border-primary/60",
                    disabled && "cursor-default opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded",
                      has ? "bg-primary" : "bg-muted",
                    )}
                  >
                    {has && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                  <span className="settings-permission-label whitespace-nowrap">
                    {PERM_LABELS[perm]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 p-3">
          <QrCode className="mb-2 h-4 w-4 text-muted-foreground" />
          <QrPreview value={makeDeviceQrPayload(device)} />
          <div className="mt-2 text-center text-[10px] text-muted-foreground">Real ulanish QR</div>
          <div className="mt-1 text-center text-[10px] font-medium text-foreground">
            {device.model || "Model aniqlanmagan"}
          </div>
          <div className="mt-1 max-w-full truncate text-center text-[9px] text-muted-foreground">
            {typeof window !== "undefined" ? window.location.host : "IP/browser"}
          </div>
        </div>
      </div>
    </div>
  );
}

function QrPreview({ value }: { value: string }) {
  return (
    <div className="rounded-lg bg-white p-2 shadow-inner">
      <img
        src={qrImageUrl(value)}
        alt="Qurilmani ulash QR kodi"
        className="h-28 w-28"
        loading="lazy"
      />
    </div>
  );
}

function AddDeviceDialog({
  open,
  onOpenChange,
  onAdd,
  t,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (name: string, login: string, password: string, perms: Permission[]) => void;
  t: (k: string) => string;
}) {
  const [name, setName] = React.useState("");
  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [perms, setPerms] = React.useState<Permission[]>(["sotuv"]);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setLogin("");
      setPassword("");
      setPerms(["sotuv"]);
    }
  }, [open]);

  const toggle = (p: Permission) => {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            {t("add_device")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">{t("device_name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Kassa 2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Login</Label>
              <Input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="kassa2"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Parol</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm">{t("permissions")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMS.map((perm) => {
                const has = perms.includes(perm);
                return (
                  <button
                    key={perm}
                    onClick={() => toggle(perm)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      has
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded",
                        has ? "bg-primary" : "bg-muted",
                      )}
                    >
                      {has && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    {PERM_LABELS[perm]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() =>
              name.trim() &&
              login.trim() &&
              password.trim() &&
              onAdd(name.trim(), login.trim(), password.trim(), perms)
            }
            disabled={!name.trim() || !login.trim() || !password.trim()}
          >
            Tasdiqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── General Edit Section ───────────────────────────────────────────────────

function GeneralEditSection() {
  const { settings, updateSettings, t } = useApp();

  const addItem = (key: "warehouses" | "expenseCategories" | "units", value: string) => {
    const v = value.trim();
    if (!v) return;
    const current = settings[key] ?? [];
    if (current.map((x) => x.toLowerCase()).includes(v.toLowerCase())) {
      toast.error("Bu qiymat oldin qo'shilgan");
      return;
    }
    updateSettings({ [key]: [...current, v] } as Partial<typeof settings>);
    toast.success(t("saved"));
  };

  const removeItem = (key: "warehouses" | "expenseCategories" | "units", value: string) => {
    const current = settings[key] ?? [];
    updateSettings({ [key]: current.filter((x) => x !== value) } as Partial<typeof settings>);
    toast.success(t("saved"));
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <SectionTitle icon={Box} title={t("general_edit")} />
      <div className="grid gap-4 lg:grid-cols-3">
        <ListEditor
          icon={Box}
          title="Omborlar"
          description="Tovar saqlash uchun ombor qo'shish"
          placeholder="Masalan: Qurilish ombori"
          items={settings.warehouses}
          onAdd={(v) => addItem("warehouses", v)}
          onRemove={(v) => removeItem("warehouses", v)}
        />
        <ListEditor
          icon={Tag}
          title={t("expense_categories")}
          description="Kassadan pul chiqarish uchun kategoriya qo'shish"
          placeholder="Masalan: Reklama"
          items={settings.expenseCategories}
          onAdd={(v) => addItem("expenseCategories", v)}
          onRemove={(v) => removeItem("expenseCategories", v)}
        />
        <ListEditor
          icon={QrCode}
          title="Polka raqamlari"
          description="Tovarlar qayerda turishini belgilash uchun"
          placeholder="Masalan: B-001"
          items={settings.shelfLocations}
          onAdd={(v) => addItem("shelfLocations", v)}
          onRemove={(v) => removeItem("shelfLocations", v)}
        />
        <ListEditor
          icon={Ruler}
          title="Birliklar"
          description="Tovarlar uchun dona, kg, tonna kabi"
          placeholder="Masalan: qop"
          items={settings.units}
          onAdd={(v) => addItem("units", v)}
          onRemove={(v) => removeItem("units", v)}
        />
      </div>
    </div>
  );
}

function ListEditor({
  icon: Icon,
  title,
  description,
  placeholder,
  items,
  onAdd,
  onRemove,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [value, setValue] = React.useState("");
  const submit = () => {
    onAdd(value);
    setValue("");
  };

  return (
    <Card>
      <CardHeader title={title} icon={Icon} />
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      <div className="mb-4 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
        />
        <Button variant="outline" onClick={submit} className="gap-1.5">
          <Plus className="h-4 w-4" /> Qo'shish
        </Button>
      </div>
      <div className="max-h-64 space-y-2 overflow-auto pr-1">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
          >
            <span className="font-medium">{item}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Language Section ────────────────────────────────────────────────────────

function LanguageSection() {
  const { settings, updateSettings, t } = useApp();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <SectionTitle icon={Globe} title={t("language")} />

      <Card>
        <div className="grid gap-2">
          {LANGS.map((lang) => {
            const active = settings.lang === lang.value;
            return (
              <button
                key={lang.value}
                onClick={() => updateSettings({ lang: lang.value })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className={cn("flex-1 text-sm font-medium", active && "text-primary")}>
                  {t(lang.labelKey)}
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  title,
  noMargin,
}: {
  icon: React.ElementType;
  title: string;
  noMargin?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", noMargin ? "" : "mb-2")}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}

function CardHeader({ title, icon: Icon }: { title: string; icon?: React.ElementType }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span className="font-semibold text-sm">{title}</span>
    </div>
  );
}
