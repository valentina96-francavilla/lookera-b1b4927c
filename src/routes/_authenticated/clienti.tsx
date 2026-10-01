import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OwnerPage } from "@/components/owner-page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { euro, formatDateIt, hhmm } from "@/lib/lookera";

export const Route = createFileRoute("/_authenticated/clienti")({
  component: ClientsRoute,
});

type Row = {
  id: string;
  client_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  appointment_date: string;
  start_time: string;
  price: number | string;
  status: string;
  services: { name: string } | null;
};

function ClientsRoute() {
  return (
    <OwnerPage title="Clienti" subtitle="Storico e contatti dei tuoi clienti">
      {(salon) => <ClientsContent salonId={salon.id} />}
    </OwnerPage>
  );
}

function ClientsContent({ salonId }: { salonId: string }) {
  const [search, setSearch] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const q = useQuery({
    queryKey: ["clients", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id,client_id,customer_name,customer_email,customer_phone,appointment_date,start_time,price,status,services(name)",
        )
        .eq("salon_id", salonId)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const clients = useMemo(() => {
    const map = new Map<
      string,
      { name: string; email: string; phone: string | null; visits: Row[]; spent: number }
    >();
    for (const r of q.data ?? []) {
      const key = (r.customer_email || r.customer_name || r.id).toLowerCase();
      const entry = map.get(key) ?? {
        name: r.customer_name || "Cliente",
        email: r.customer_email,
        phone: r.customer_phone,
        visits: [],
        spent: 0,
      };
      entry.visits.push(r);
      if (r.status === "completed") entry.spent += Number(r.price);
      if (!entry.phone && r.customer_phone) entry.phone = r.customer_phone;
      map.set(key, entry);
    }
    const list = [...map.values()];
    const term = search.trim().toLowerCase();
    return term
      ? list.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            (c.phone ?? "").includes(term),
        )
      : list;
  }, [q.data, search]);

  async function saveClientName(client: { key: string; name: string; email: string; clientId: string | null }) {
    const name = client.name.trim();
    if (!name) {
      toast.error("Inserisci nome e cognome.");
      return;
    }

    setSavingName(true);
    try {
      if (client.clientId) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ full_name: name })
          .eq("id", client.clientId);

        if (profileError) throw profileError;
      }

      const { error: appointmentsError } = await supabase
        .from("appointments")
        .update({ customer_name: name })
        .eq("salon_id", salonId)
        .eq("customer_email", client.email);

      if (appointmentsError) throw appointmentsError;

      await q.refetch();
      setEditingKey(null);
      toast.success("Nome cliente aggiornato.");
    } catch (error: any) {
      toast.error(error?.message ?? "Impossibile aggiornare il nome del cliente.");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-5">
      <Input
        placeholder="Cerca per nome, email o telefono"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun cliente trovato.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((c) => {
            const key = c.email || c.name;
            const isEditing = editingKey === key;

            return (
            <div key={key} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex max-w-md items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Nome e cognome"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        title="Salva nome"
                        disabled={savingName}
                        onClick={() =>
                          saveClientName({
                            key,
                            name: editingName,
                            email: c.email,
                            clientId: c.clientId,
                          })
                        }
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Annulla"
                        disabled={savingName}
                        onClick={() => setEditingKey(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.email || "—"}</p>
                      {c.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
                    </>
                  )}
                </div>
                {!isEditing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Modifica nome"
                    onClick={() => {
                      setEditingKey(key);
                      setEditingName(c.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <div className="text-right text-sm">
                  <p className="font-medium">{euro(c.spent)}</p>
                  <p className="text-muted-foreground">{c.visits.length} appuntamenti</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {c.visits.slice(0, 4).map((v) => (
                  <li key={v.id}>
                    {formatDateIt(v.appointment_date)} · {hhmm(v.start_time)} · {v.services?.name}
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
