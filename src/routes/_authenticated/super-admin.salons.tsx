import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X, Plus, Pencil, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { fmtDate, salonSetup, useAdminData } from "@/lib/super-admin";
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

type SalonForm = {
  id?: string;
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
  const { salons, services, hours, appointments, users } = useAdminData();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<SalonForm | null>(null);
  const [saving, setSaving] = useState(false);

  const d = {
    services: services.data ?? [],
    hours: hours.data ?? [],
    appts: appointments.data ?? [],
  };

  const ownerUsers = (users.data ?? []).filter((u) =>
    u.roles.includes("owner"),
  );

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

  function openNew() {
    setForm({ ...emptyForm });
  }

  function openEdit(s: any) {
    setForm({
      id: s.id,
      owner_id: s.owner_id ?? "",
      name: s.name ?? "",
      slug: s.slug ?? "",
      description: s.description ?? "",
      address: s.address ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      image_url: s.image_url ?? "",
      cancellation_hours: s.cancellation_hours ?? 24,
    });
  }

  async function saveSalon() {
    if (!form) return;

    if (!form.name.trim() || !form.slug.trim()) {
      alert("Nome e slug sono obbligatori.");
      return;
    }

    setSaving(true);

    const payload = {
      owner_id: form.owner_id || null,
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      image_url: form.image_url.trim() || null,
      cancellation_hours: Number(form.cancellation_hours),
    };

    const result = form.id
      ? await supabase.from("salons").update(payload).eq("id", form.id)
      : await supabase.from("salons").insert(payload);

    setSaving(false);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    setForm(null);

    await queryClient.invalidateQueries({
      queryKey: ["sa", "salons"],
    });
  }

  async function deleteSalon(id: string) {
    const confirmed = window.confirm(
      "Sei sicura di voler eliminare questo punto vendita? Questa operazione può eliminare o bloccare anche dati collegati.",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("salons")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["sa", "salons"],
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Punti vendita
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestione globale dei punti vendita della piattaforma.
          </p>
        </div>

        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo punto vendita
        </Button>
      </div>

      {form && (
        <div className="surface rounded-xl border border-border p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {form.id ? "Modifica punto vendita" : "Nuovo punto vendita"}
            </h2>

            <Button
              variant="ghost"
              onClick={() => setForm(null)}
            >
              Chiudi
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Nome *</span>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Slug *</span>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value })
                }
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span>Proprietario</span>
              <select
                value={form.owner_id}
                onChange={(e) =>
                  setForm({ ...form, owner_id: e.target.value })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Nessun proprietario</option>
                {ownerUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email} — {user.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span>Descrizione</span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Indirizzo</span>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Telefono</span>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Email</span>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>URL immagine</span>
              <Input
                value={form.image_url}
                onChange={(e) =>
                  setForm({ ...form, image_url: e.target.value })
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Ore per cancellazione</span>
              <Input
                type="number"
                min={0}
                value={form.cancellation_hours}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cancellation_hours: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setForm(null)}
            >
              Annulla
            </Button>

            <Button onClick={saveSalon} disabled={saving}>
              {saving ? "Salvataggio…" : "Salva"}
            </Button>
          </div>
        </div>
      )}

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
          <option value="complete">Configurazione completa</option>
          <option value="incomplete">Configurazione incompleta</option>
        </select>
      </div>

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
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map(({ s, st, owner }) => (
              <tr key={s.id} className="align-top">
                <td className="px-4 py-3 font-medium">{s.name}</td>

                <td className="px-4 py-3">
                  {owner?.full_name || owner?.email || (s.owner_id ? "—" : "Demo")}
                </td>

                <td className="px-4 py-3">
                  {s.email || owner?.email || "—"}
                </td>

                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {st.checks.servizi ? "Attivo" : "Non attivo"}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  {st.serviceCount}
                </td>

                <td className="px-4 py-3">
                  {st.apptCount}
                </td>

                <td className="px-4 py-3">
                  <p className="font-medium">{st.pct}%</p>

                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(st.checks).map(([k, v]) => (
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
                    ))}
                  </div>
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  {fmtDate(s.created_at)}
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Modifica
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSalon(s.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Elimina
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
