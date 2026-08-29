import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { useMySalon, useRole, useSession } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export type Salon = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  cancellation_hours: number;
};

export function OwnerPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: (salon: Salon) => ReactNode;
}) {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const roleQ = useRole(user?.id);
  const salonQ = useMySalon(user?.id);

  const role = roleQ.data;
  const salon = salonQ.data as Salon | null | undefined;
  const ready = !loading && !roleQ.isLoading && !salonQ.isLoading;

  useEffect(() => {
    if (!ready) return;
    if (role === "client") navigate({ to: "/prenotazioni" });
    else if (role === "owner" && !salon) navigate({ to: "/onboarding" });
  }, [ready, role, salon, navigate]);

  if (!ready || !salon || role !== "owner") {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <AppShell role="owner" title={title} subtitle={subtitle} actions={actions}>
      {children(salon)}
    </AppShell>
  );
}
