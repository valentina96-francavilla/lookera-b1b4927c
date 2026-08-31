import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  euro,
  formatDateIt,
  hhmm,
  hoursUntil,
  toDateKey,
} from "@/lib/lookera";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/prenotazioni")({
  component: MyBookingsRoute,
});

type Row = {
  id: string;
  salon_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  price: number | string;
  status: string;
  services: { name: string } | null;
  salons: { name: string; slug: string; cancellation_hours: number } | null;
};

function MyBookingsRoute() {
  const { user, loading } = useSession();
  const qc = useQueryClient();
  const [reviewFor, setReviewFor] = useState<Row | null>(null);
  const [rating, setRating] = useState(5);

  const q = useQuery({
    queryKey: ["my-appointments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name), salons(name,slug,cancellation_hours)")
        .eq("client_id", user!.id)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const reviewedQ = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("appointment_id")
        .eq("client_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.appointment_id));
    },
  });

  const cancel = useMutation({
    mutationFn: async (row: Row) => {
      const limit = row.salons?.cancellation_hours ?? 24;
      if (hoursUntil(row.appointment_date, row.start_time) < limit) {
        throw new Error(`Puoi annullare solo fino a ${limit} ore prima. Contatta il salone.`);
      }
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" as const })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      toast.success("Prenotazione annullata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addReview = useMutation({
    mutationFn: async (input: { row: Row; comment: string }) => {
      const { error } = await supabase.from("reviews").insert({
        salon_id: input.row.salon_id,
        appointment_id: input.row.id,
        client_id: user!.id,
        author_name: user?.email?.split("@")[0] ?? "Cliente",
        rating,
        comment: input.comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
      setReviewFor(null);
      setRating(5);
      toast.success("Grazie per la recensione!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const today = toDateKey(new Date());
  const rows = q.data ?? [];
  const upcoming = rows
    .filter((r) => r.appointment_date >= today && ["pending", "confirmed"].includes(r.status))
    .reverse();
  const past = rows.filter((r) => !upcoming.includes(r));

  return (
    <AppShell role="client" title="Le mie prenotazioni" subtitle="Appuntamenti futuri e storico">
      {loading || q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-lg">Prossimi appuntamenti</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nessun appuntamento in programma.{" "}
                <Link to="/salon/$slug" params={{ slug: "studio-beauty" }} className="text-primary underline">
                  Prenota ora
                </Link>
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {upcoming.map((r) => (
                  <div key={r.id} className="surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{r.services?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.salons?.name} · {formatDateIt(r.appointment_date)} ·{" "}
                          {hhmm(r.start_time)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(STATUS_CLASSES[r.status])}>
                          {STATUS_LABELS[r.status]}
                        </Badge>
                        <span className="text-sm">{euro(r.price)}</span>
                      </div>
                    </div>
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      onClick={() => cancel.mutate(r)}
                      disabled={cancel.isPending}
                    >
                      Annulla prenotazione
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg">Storico</h2>
            {past.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nessuno storico.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {past.map((r) => {
                  const canReview =
                    r.status === "completed" && !(reviewedQ.data ?? new Set()).has(r.id);
                  return (
                    <div key={r.id} className="surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{r.services?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {r.salons?.name} · {formatDateIt(r.appointment_date)} ·{" "}
                            {hhmm(r.start_time)}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(STATUS_CLASSES[r.status])}>
                          {STATUS_LABELS[r.status]}
                        </Badge>
                      </div>

                      {canReview && reviewFor?.id !== r.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => setReviewFor(r)}
                        >
                          Lascia una recensione
                        </Button>
                      )}

                      {reviewFor?.id === r.id && (
                        <form
                          className="mt-3 space-y-3 rounded-xl border border-border p-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            addReview.mutate({ row: r, comment: String(f.get("comment") ?? "") });
                          }}
                        >
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                aria-label={`${n} stelle`}
                                onClick={() => setRating(n)}
                              >
                                <Star
                                  className={cn(
                                    "h-5 w-5",
                                    n <= rating ? "fill-current text-primary" : "text-muted-foreground",
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                          <Textarea name="comment" rows={2} placeholder="Com'è andata?" maxLength={400} />
                          <div className="flex gap-2">
                            <Button size="sm" type="submit" disabled={addReview.isPending}>
                              Invia
                            </Button>
                            <Button
                              size="sm"
                              type="button"
                              variant="ghost"
                              onClick={() => setReviewFor(null)}
                            >
                              Annulla
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
