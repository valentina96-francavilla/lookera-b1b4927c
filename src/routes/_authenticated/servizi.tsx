import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OwnerPage } from "@/components/owner-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { euro } from "@/lib/lookera";

export const Route = createFileRoute("/_authenticated/servizi")({
  component: ServicesRoute,
});

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  duration_min: number;
  is_active: boolean;
};

const schema = z.object({
  name: z.string().trim().min(2, "Nome troppo corto").max(80),
  description: z.string().trim().max(400).optional(),
  price: z.number().min(0, "Prezzo non valido").max(10000),
  duration_min: z.number().int().min(5, "Durata minima 5 minuti").max(600),
});

function ServicesRoute() {
  return (
    <OwnerPage title="Servizi" subtitle="Prezzi e durate del tuo listino">
      {(salon) => <ServicesContent salonId={salon.id} />}
    </OwnerPage>
  );
}

function ServicesContent({ salonId }: { salonId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["services", salonId, "all"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("services")
        .select("*")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return (rows ?? []) as Service[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      description: string | null;
      price: number;
      duration_min: number;
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("services")
          .update({
            name: input.name,
            description: input.description,
            price: input.price,
            duration_min: input.duration_min,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert({
          salon_id: salonId,
          name: input.name,
          description: input.description,
          price: input.price,
          duration_min: input.duration_min,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servizio salvato");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servizio eliminato");
    },
    onError: () =>
      toast.error("Impossibile eliminare: il servizio ha appuntamenti. Disattivalo invece."),
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: String(f.get("name") ?? ""),
      description: String(f.get("description") ?? ""),
      price: Number(f.get("price")),
      duration_min: Number(f.get("duration_min")),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    save.mutate({
      ...(editing ? { id: editing.id } : {}),
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      duration_min: parsed.data.duration_min,
    });
  }

  return (
    <div className="space-y-5">
      <Button
        size="sm"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
        <Plus className="mr-1 h-4 w-4" /> Nuovo servizio
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : (data ?? []).length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          Nessun servizio: aggiungi il primo per ricevere prenotazioni.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data ?? []).map((s) => (
            <div key={s.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {euro(s.price)} · {s.duration_min} min
                  </p>
                </div>
                <Switch
                  checked={s.is_active}
                  onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })}
                />
              </div>
              {s.description && (
                <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(s);
                    setOpen(true);
                  }}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Modifica
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Elimina
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica servizio" : "Nuovo servizio"}</DialogTitle>
            <DialogDescription>Nome, prezzo e durata del servizio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Nome</Label>
              <Input id="s-name" name="name" defaultValue={editing?.name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-desc">Descrizione</Label>
              <Textarea
                id="s-desc"
                name="description"
                rows={2}
                defaultValue={editing?.description ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="s-price">Prezzo (€)</Label>
                <Input
                  id="s-price"
                  name="price"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={editing ? Number(editing.price) : 25}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-duration">Durata (min)</Label>
                <Input
                  id="s-duration"
                  name="duration_min"
                  type="number"
                  step="5"
                  min="5"
                  defaultValue={editing?.duration_min ?? 45}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              Salva
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
