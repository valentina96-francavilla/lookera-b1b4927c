import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
  updated_at: string | null;
};

export type AdminService = {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_min: number;
  is_active: boolean;
  created_at: string;
};

export type AdminBusinessHour = {
  id: string;
  salon_id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
};

export function useAdminData() {
  const salons = useQuery({
    queryKey: ["sa", "salons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const services = useQuery({
    queryKey: ["sa", "services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,salon_id,name,description,price,duration_min,is_active,created_at")
        .order("name");

      if (error) throw error;
      return (data ?? []) as AdminService[];
    },
  });

  const hours = useQuery({
    queryKey: ["sa", "hours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select(
          "id,salon_id,day_of_week,is_closed,open_time,close_time,break_start,break_end",
        )
        .order("day_of_week");

      if (error) throw error;
      return (data ?? []) as AdminBusinessHour[];
    },
  });

  const appointments = useQuery({
    queryKey: ["sa", "appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id,salon_id,client_id,customer_name,customer_email,appointment_date,start_time,status,created_at,services(name)",
        )
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(5000);

      if (error) throw error;

      return (data ?? []) as unknown as Array<{
        id: string;
        salon_id: string;
        client_id: string | null;
        customer_name: string;
        customer_email: string;
        appointment_date: string;
        start_time: string;
        status: string;
        created_at: string;
        services: { name: string } | null;
      }>;
    },
  });

  const users = useQuery({
    queryKey: ["sa", "users"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("admin_list_users");

      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  return {
    salons,
    services,
    hours,
    appointments,
    users,
  };
}

export function salonSetup(
  salon: {
    id: string;
    description: string | null;
    address: string | null;
    phone: string | null;
  },
  d: {
    services: AdminService[];
    hours: AdminBusinessHour[];
    appts: { salon_id: string; status: string }[];
  },
) {
  const svc = d.services.filter((s) => s.salon_id === salon.id);
  const appts = d.appts.filter((a) => a.salon_id === salon.id);

  const checks = {
    profilo: !!(salon.description && salon.address && salon.phone),
    servizi: svc.some((s) => s.is_active),
    orari: d.hours.some(
      (h) => h.salon_id === salon.id && !h.is_closed,
    ),
    ricevuti: appts.length > 0,
    gestiti: appts.some((a) => a.status !== "pending"),
  };

  const done = Object.values(checks).filter(Boolean).length;

  return {
    checks,
    pct: Math.round((done / 5) * 100),
    serviceCount: svc.length,
    apptCount: appts.length,
  };
}

export const fmtDate = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
