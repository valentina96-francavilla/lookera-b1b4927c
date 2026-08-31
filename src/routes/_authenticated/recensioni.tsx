import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OwnerPage } from "@/components/owner-page";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recensioni")({
  component: ReviewsRoute,
});

function ReviewsRoute() {
  return (
    <OwnerPage title="Recensioni" subtitle="Cosa dicono i tuoi clienti">
      {(salon) => <ReviewsContent salonId={salon.id} />}
    </OwnerPage>
  );
}

function ReviewsContent({ salonId }: { salonId: string }) {
  const q = useQuery({
    queryKey: ["reviews", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,author_name,rating,comment,created_at")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = q.data ?? [];
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null;

  return (
    <div className="space-y-5">
      <div className="surface flex items-center gap-6 p-5">
        <div>
          <p className="text-3xl font-medium">{avg ? avg.toFixed(1) : "—"}</p>
          <p className="text-sm text-muted-foreground">Media voti</p>
        </div>
        <div>
          <p className="text-3xl font-medium">{rows.length}</p>
          <p className="text-sm text-muted-foreground">Recensioni</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna recensione. I clienti possono recensire dopo un appuntamento completato.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{r.author_name || "Cliente"}</span>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "h-4 w-4",
                          n <= r.rating ? "fill-current text-primary" : "text-muted-foreground",
                        )}
                      />
                    ))}
                  </div>
                  <Badge variant="outline">{r.rating}/5</Badge>
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("it-IT")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
