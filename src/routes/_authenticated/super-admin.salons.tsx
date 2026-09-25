import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  fmtDate,
  salonSetup,
  useAdminData,
  type AdminService,
  type AdminBusinessHour,
} from "@/lib/super-admin";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/super-admin/salons")({
  component: SalonsPage,
});

const labels = {
  profilo: "Profilo",
  servizi: "Servizi",
  orari: "Orari",
  ricevuti: "Ricevuti",
  gestiti: "Gestiti",
};

const days = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
];

type SalonForm = {
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  image_url: string;
  cancellation_hours: number;
};

const emptyForm: SalonForm = {
  owner_id: "",
  name: "",
  slug: "",
  description: "",
  address: "",
  phone: "",
  email: "",
  image_url: "",
  cancellation_hours: 24,
};

function SalonsPage() {
  const queryClient = useQueryClient();

  const {
    salons,
    services,
    hours,
    appointments,
    users,
  } = useAdminData();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SalonForm>(emptyForm);

  const [savingSalon, setSavingSalon] = useState(false);

  const [serviceEditingId, setServiceEditingId] = useState<string | null>(
    null,
  );

  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_min: "30",
    is_active: true,
  });

  const [savingService, setSavingService] = useState(false);

  const [openSection, setOpenSection] = useState<
    "services" | "hours" | null
  >("services");

  const d = {
    services: services.data ?? [],
    hours: hours.data ?? [],
    appts: appointments.data ?? [],
  };

  const rows = (salons.data ?? [])
    .map((s) => ({
      s,
      st: salonSetup(s, d),
      owner: (users.data ?? []).find((u) => u.id === s.owner_id),
    }))
    .filter(({ s, owner }) =>
      `${s.name} ${s.email ?? ""} ${owner?.email ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .filter(({ st }) =>
      filter === "complete"
        ? st.pct === 100
        : filter === "incomplete"
          ? st.pct < 100
          : true,
    );

  function startCreate() {
    setEditingId("new");
    setForm(emptyForm);
    setServiceEditingId(null);
    setServiceForm({
      name: "",
      description: "",
      price: "",
      duration_min: "30",
      is_active: true,
    });
  }

  function startEdit(salon: any) {
    setEditingId(salon.id);

    setForm({
      owner_id: salon.owner_id ?? "",
      name: salon.name ?? "",
      slug: salon.slug ?? "",
      description: salon.description ?? "",
      address: salon.address ?? "",
      phone: salon.phone ?? "",
      email: salon.email ?? "",
      image_url: salon.image_url ?? "",
      cancellation_hours: salon.cancellation_hours ?? 24,
    });

    setServiceEditingId(null);
    setOpenSection("services");
  }

  function closeEditor() {
    setEditingId(null);
    setForm(emptyForm);
    setServiceEditingId(null);
  }

  async function saveSalon() {
    if (!form.name.trim() || !form.slug.trim()) {
      alert("Nome e slug sono obbligatori.");
      return;
    }

    setSavingSalon(true);

    try {
      const payload = {
        owner_id: form.owner_id || null,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        image_url: form.image_url || null,
        cancellation_hours: Number(form.cancellation_hours) || 0,
      };

      if (editingId === "new") {
        const { error } = await supabase
          .from("salons")
          .insert(payload);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("salons")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      }

      await queryClient.invalidateQueries({
        queryKey: ["sa", "salons"],
      });

      closeEditor();
    } catch (error: any) {
      alert(error.message ?? "Errore durante il salvataggio.");
    } finally {
      setSavingSalon(false);
    }
  }

  async function deleteSalon(id: string) {
    const salon = salons.data?.find((s) => s.id === id);

    if (
      !confirm(
        `Vuoi davvero eliminare "${salon?.name ?? "questo punto vendita"}"?`,
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("salons")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === id) closeEditor();

    await queryClient.invalidateQueries({
      queryKey: ["sa", "salons"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["sa", "services"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["sa", "hours"],
    });
  }

  function startNewService() {
    setServiceEditingId("new");

    setServiceForm({
      name: "",
      description: "",
      price: "",
      duration_min: "30",
      is_active: true,
    });
  }

  function startEditService(service: AdminService) {
    setServiceEditingId(service.id);

    setServiceForm({
      name: service.name,
      description: service.description ?? "",
      price: String(service.price),
      duration_min: String(service.duration_min),
      is_active: service.is_active,
    });
  }

  function cancelServiceEdit() {
    setServiceEditingId(null);

    setServiceForm({
      name: "",
      description: "",
      price: "",
      duration_min: "30",
      is_active: true,
    });
  }

  async function saveService() {
    if (!editingId || editingId === "new") {
      alert("Salva prima il punto vendita.");
      return;
    }

    if (!serviceForm.name.trim()) {
      alert("Inserisci il nome del servizio.");
      return;
    }

    setSavingService(true);

    try {
      const payload = {
        salon_id: editingId,
        name: serviceForm.name.trim(),
        description: serviceForm.description || null,
        price: Number(serviceForm.price) || 0,
        duration_min: Number(serviceForm.duration_min) || 30,
        is_active: serviceForm.is_active,
      };

      if (serviceEditingId === "new") {
        const { error } = await supabase
          .from("services")
          .insert(payload);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", serviceEditingId);

        if (error) throw error;
      }

      await queryClient.invalidateQueries({
        queryKey: ["sa", "services"],
      });

      cancelServiceEdit();
    } catch (error: any) {
      alert(error.message ?? "Errore durante il salvataggio del servizio.");
    } finally {
      setSavingService(false);
    }
  }

  async function deleteService(id: string) {
    if (!confirm("Vuoi eliminare questo servizio?")) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["sa", "services"],
    });
  }

  async function updateHour(
    hour: AdminBusinessHour,
    field: keyof AdminBusinessHour,
    value: string | boolean,
  ) {
    const { error } = await supabase
      .from("business_hours")
      .update({
        [field]: value,
      })
      .eq("id", hour.id);

    if (error) {
      alert(error.message);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["sa", "hours"],
    });
  }

  async function createDefaultHours() {
    if (!editingId || editingId === "new") {
      alert("Salva prima il punto vendita.");
      return;
    }

    const existing = d.hours.filter(
      (h) => h.salon_id === editingId,
    );

    if (existing.length > 0) {
      alert("Questo punto vendita ha già degli orari.");
      return;
    }

    const rows = days.map((_, index) => ({
      salon_id: editingId,
      day_of_week: index,
      is_closed: index === 0,
      open_time: "09:00",
      close_time: "19:00",
      break_start: "13:00",
      break_end: "14:00",
    }));

    const { error } = await supabase
      .from("business_hours")
      .insert(rows);

    if (error) {
      alert(error.message);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["sa", "hours"],
    });
  }

  const currentServices = d.services.filter(
    (s) => s.salon_id === editingId,
  );

  const currentHours = d.hours
    .filter((h) => h.salon_id === editingId)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Punti vendita
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestisci negozi, servizi e orari della piattaforma.
          </p>
        </div>

        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo punto vendita
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Cerca per nome o email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Tutti</option>
          <option value="complete">
            Configurazione completa
          </option>
          <option value="incomplete">
            Configurazione incompleta
          </option>
        </select>
      </div>

      {editingId && (
        <div className="surface space-y-8 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {editingId === "new"
                  ? "Nuovo punto vendita"
                  : `Modifica: ${form.name}`}
              </h2>

              {editingId === "new" && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Salva prima il negozio per poter aggiungere servizi e orari.
                </p>
              )}
            </div>

            <Button variant="ghost" onClick={closeEditor}>
              Chiudi
            </Button>
          </div>

          {/* DATI NEGOZIO */}
          <section className="space-y-4">
            <h3 className="font-semibold">Dati del punto vendita</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nome *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Slug *
                </label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Descrizione
                </label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Indirizzo
                </label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      address: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Telefono
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      phone: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  URL immagine
                </label>
                <Input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      image_url: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Ore per cancellazione
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.cancellation_hours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cancellation_hours: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Proprietario
                </label>

                <select
                  value={form.owner_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      owner_id: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Nessun proprietario</option>

                  {(users.data ?? [])
                    .filter((u) => u.roles?.includes("owner"))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} — {u.email}
                      </option>
                    ))}
                </select>

                <p className="mt-1 text-xs text-muted-foreground">
                  La creazione di un nuovo proprietario la aggiungiamo nel
                  prossimo passaggio.
                </p>
              </div>
            </div>

            <Button onClick={saveSalon} disabled={savingSalon}>
              <Save className="mr-2 h-4 w-4" />
              {savingSalon ? "Salvataggio…" : "Salva punto vendita"}
            </Button>
          </section>

          {/* SERVIZI */}
          {editingId !== "new" && (
            <>
              <section className="border-t border-border pt-6">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() =>
                    setOpenSection(
                      openSection === "services"
                        ? null
                        : "services",
                    )
                  }
                >
                  <div>
                    <h3 className="font-semibold">
                      Servizi
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentServices.length} servizi configurati
                    </p>
                  </div>

                  {openSection === "services" ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>

                {openSection === "services" && (
                  <div className="mt-5 space-y-4">
                    <Button
                      size="sm"
                      onClick={startNewService}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Aggiungi servizio
                    </Button>

                    {serviceEditingId && (
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <h4 className="mb-4 font-medium">
                          {serviceEditingId === "new"
                            ? "Nuovo servizio"
                            : "Modifica servizio"}
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm">
                              Nome *
                            </label>
                            <Input
                              value={serviceForm.name}
                              onChange={(e) =>
                                setServiceForm((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm">
                              Descrizione
                            </label>
                            <Input
                              value={serviceForm.description}
                              onChange={(e) =>
                                setServiceForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm">
                              Prezzo €
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={serviceForm.price}
                              onChange={(e) =>
                                setServiceForm((f) => ({
                                  ...f,
                                  price: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm">
                              Durata (minuti)
                            </label>
                            <Input
                              type="number"
                              min={1}
                              value={serviceForm.duration_min}
                              onChange={(e) =>
                                setServiceForm((f) => ({
                                  ...f,
                                  duration_min: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={serviceForm.is_active}
                              onChange={(e) =>
                                setServiceForm((f) => ({
                                  ...f,
                                  is_active: e.target.checked,
                                }))
                              }
                            />
                            Servizio attivo
                          </label>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveService}
                            disabled={savingService}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {savingService
                              ? "Salvataggio…"
                              : "Salva servizio"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelServiceEdit}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border text-left text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Servizio</th>
                            <th className="px-4 py-3">Prezzo</th>
                            <th className="px-4 py-3">Durata</th>
                            <th className="px-4 py-3">Stato</th>
                            <th className="px-4 py-3 text-right">
                              Azioni
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                          {currentServices.map((service) => (
                            <tr key={service.id}>
                              <td className="px-4 py-3 font-medium">
                                {service.name}
                                {service.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {service.description}
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                €{" "}
                                {Number(service.price).toFixed(2)}
                              </td>

                              <td className="px-4 py-3">
                                {service.duration_min} min
                              </td>

                              <td className="px-4 py-3">
                                <Badge variant="outline">
                                  {service.is_active
                                    ? "Attivo"
                                    : "Disattivo"}
                                </Badge>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      startEditService(service)
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      deleteService(service.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {currentServices.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-8 text-center text-muted-foreground"
                              >
                                Nessun servizio configurato.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* ORARI */}
              <section className="border-t border-border pt-6">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() =>
                    setOpenSection(
                      openSection === "hours" ? null : "hours",
                    )
                  }
                >
                  <div>
                    <h3 className="font-semibold">
                      Orari di apertura
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentHours.length} giorni configurati
                    </p>
                  </div>

                  {openSection === "hours" ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>

                {openSection === "hours" && (
                  <div className="mt-5 space-y-4">
                    {currentHours.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <p className="mb-3 text-sm text-muted-foreground">
                          Questo punto vendita non ha ancora gli orari
                          configurati.
                        </p>

                        <Button
                          size="sm"
                          onClick={createDefaultHours}
                        >
                          Crea orari standard
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentHours.map((hour) => (
                          <div
                            key={hour.id}
                            className="rounded-lg border border-border p-4"
                          >
                            <div className="grid items-end gap-3 lg:grid-cols-[140px_120px_120px_120px_120px_auto]">
                              <div>
                                <p className="font-medium">
                                  {days[hour.day_of_week] ??
                                    `Giorno ${hour.day_of_week}`}
                                </p>
                              </div>

                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={!hour.is_closed}
                                  onChange={(e) =>
                                    updateHour(
                                      hour,
                                      "is_closed",
                                      !e.target.checked,
                                    )
                                  }
                                />
                                Aperto
                              </label>

                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Apertura
                                </label>
                                <Input
                                  type="time"
                                  value={hour.open_time}
                                  disabled={hour.is_closed}
                                  onChange={(e) =>
                                    updateHour(
                                      hour,
                                      "open_time",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Chiusura
                                </label>
                                <Input
                                  type="time"
                                  value={hour.close_time}
                                  disabled={hour.is_closed}
                                  onChange={(e) =>
                                    updateHour(
                                      hour,
                                      "close_time",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Inizio pausa
                                </label>
                                <Input
                                  type="time"
                                  value={
                                    hour.break_start ?? ""
                                  }
                                  disabled={hour.is_closed}
                                  onChange={(e) =>
                                    updateHour(
                                      hour,
                                      "break_start",
                                      e.target.value || null,
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Fine pausa
                                </label>
                                <Input
                                  type="time"
                                  value={
                                    hour.break_end ?? ""
                                  }
                                  disabled={hour.is_closed}
                                  onChange={(e) =>
                                    updateHour(
                                      hour,
                                      "break_end",
                                      e.target.value || null,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* TABELLA NEGOZI */}
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              {[
                "Nome",
                "Proprietario",
                "Email",
                "Stato",
                "Servizi",
                "Appuntamenti",
                "Configurazione",
                "Registrato",
                "Azioni",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map(({ s, st, owner }) => (
              <tr key={s.id} className="align-top">
                <td className="px-4 py-3 font-medium">
                  {s.name}
                </td>

                <td className="px-4 py-3">
                  {owner?.full_name ||
                    owner?.email ||
                    (s.owner_id ? "—" : "Nessuno")}
                </td>

                <td className="px-4 py-3">
                  {s.email || owner?.email || "—"}
                </td>

                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {st.checks.servizi
                      ? "Attivo"
                      : "Non attivo"}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  {st.serviceCount}
                </td>

                <td className="px-4 py-3">
                  {st.apptCount}
                </td>

                <td className="px-4 py-3">
                  <p className="font-medium">
                    {st.pct}%
                  </p>

                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(st.checks).map(
                      ([k, v]) => (
                        <span
                          key={k}
                          className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs ${
                            v
                              ? "border-primary/40 text-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {v ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}

                          {labels[k as keyof typeof labels]}
                        </span>
                      ),
                    )}
                  </div>
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  {fmtDate(s.created_at)}
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Modifica"
                      onClick={() => startEdit(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      title="Elimina"
                      onClick={() => deleteSalon(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Nessun punto vendita.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
