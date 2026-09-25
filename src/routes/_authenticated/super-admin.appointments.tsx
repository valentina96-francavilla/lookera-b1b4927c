import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STATUS_CLASSES, STATUS_LABELS, hhmm } from "@/lib/lookera";
import { fmtDate, useAdminData } from "@/lib/super-admin";

export const Route = createFileRoute("/_authenticated/super-admin/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { salons, appointments } = useAdminData();
  const [salon, setSalon] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const s = salons.data ?? [];
  const rows = (appointments.data ?? []).filter(
    (a) => (!salon || a.salon_id === salon) && (!status || a.status === status) && (!date || a.appointment_date === date),
  );
  const sel = "rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Appuntamenti</h1>
      <div className="flex flex-wrap gap-3">
        <select className={sel} value={salon} onChange={(e) => setSalon(e.target.value)}>
          <option value="">Tutti i punti vendita</option>
          {s.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tutti gli stati</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              {["Punto vendita", "Cliente", "Servizio", "Data", "Ora", "Stato", "Creato"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">{s.find((x) => x.id === a.salon_id)?.name ?? "—"}</td>
                <td className="px-4 py-3">{a.customer_name || a.customer_email || "Cliente"}</td>
                <td className="px-4 py-3">{a.services?.name ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(a.appointment_date)}</td>
                <td className="px-4 py-3">{hhmm(a.start_time)}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={STATUS_CLASSES[a.status as keyof typeof STATUS_CLASSES]}>
                    {STATUS_LABELS[a.status as keyof typeof STATUS_LABELS] ?? a.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(a.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nessun appuntamento.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
