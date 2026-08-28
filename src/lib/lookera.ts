export const STATUS_LABELS: Record<string, string> = {
  pending: "In attesa",
  confirmed: "Confermato",
  completed: "Completato",
  cancelled: "Annullato",
  no_show: "No-show",
};

export const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning/40",
  confirmed: "bg-success/15 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/25",
  no_show: "bg-destructive/15 text-destructive border-destructive/30",
};

export const WEEKDAYS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
];

export const DEFAULT_SERVICES = [
  { name: "Taglio capelli", price: 25, duration_min: 45 },
  { name: "Piega", price: 20, duration_min: 30 },
  { name: "Colore", price: 50, duration_min: 90 },
  { name: "Balayage", price: 80, duration_min: 120 },
  { name: "Manicure", price: 25, duration_min: 45 },
  { name: "Pedicure", price: 30, duration_min: 50 },
  { name: "Trattamento viso", price: 45, duration_min: 60 },
];

export function euro(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

/** '10:00:00' -> '10:00' */
export function hhmm(time: string | null | undefined) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTime(time: string): [number, number] {
  const parts = hhmm(time).split(":");
  return [Number(parts[0] ?? 0), Number(parts[1] ?? 0)];
}

export function minutesBetween(start: string, end: string) {
  const [sh, sm] = parseTime(start);
  const [eh, em] = parseTime(end);
  return eh * 60 + em - (sh * 60 + sm);
}

export function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = parseTime(time);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function formatDateIt(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Hours left before an appointment starts */
export function hoursUntil(dateKey: string, startTime: string) {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const [h, mi] = parseTime(startTime);
  const target = new Date(y, m - 1, d, h, mi);
  return (target.getTime() - Date.now()) / 3600000;
}
