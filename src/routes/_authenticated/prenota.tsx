import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/prenota")({
  component: BookAppointmentRoute,
});

type Salon = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

function BookAppointmentRoute() {
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);

  const salonsQ = useQuery({
    queryKey: ["booking-salons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("id,name,slug,address,phone,email,region,province,city,latitude,longitude")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Salon[];
    },
  });

  const salons = salonsQ.data ?? [];
  const regions = useMemo(
    () => [...new Set(salons.map((s) => s.region).filter(Boolean))].sort(),
    [salons],
  );
  const provinces = useMemo(
    () =>
      [...new Set(
        salons
          .filter((s) => !region || s.region === region)
          .map((s) => s.province)
          .filter(Boolean),
      )].sort(),
    [salons, region],
  );
  const cities = useMemo(
    () =>
      [...new Set(
        salons
          .filter((s) => (!region || s.region === region) && (!province || s.province === province))
          .map((s) => s.city)
          .filter(Boolean),
      )].sort(),
    [salons, region, province],
  );

  const filtered = salons.filter(
    (s) =>
      (!region || s.region === region) &&
      (!province || s.province === province) &&
      (!city || s.city === city),
  );

  function changeRegion(value: string) {
    setRegion(value);
    setProvince("");
    setCity("");
    setSelectedSalonId(null);
  }

  function changeProvince(value: string) {
    setProvince(value);
    setCity("");
    setSelectedSalonId(null);
  }

  function changeCity(value: string) {
    setCity(value);
    setSelectedSalonId(null);
  }

  return (
    <AppShell role="client" title="Prenota appuntamento" subtitle="Trova il centro più comodo per te">
      <div className="space-y-6">
        <div className="surface p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Filter label="Regione" value={region} onChange={changeRegion} options={regions} />
            <Filter label="Provincia" value={province} onChange={changeProvince} options={provinces} disabled={!region} />
            <Filter label="Città" value={city} onChange={changeCity} options={cities} disabled={!province} />
          </div>
        </div>

        {salonsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento centri…</p>
        ) : filtered.length === 0 ? (
          <div className="surface p-8 text-center">
            <p className="font-medium">Nessun centro trovato</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Prova a cambiare città o provincia.
            </p>
          </div>
        ) : (
          <>
            {city && (
              <LeafletMap
                salons={filtered.filter((s) => s.latitude != null && s.longitude != null)}
                selectedSalonId={selectedSalonId}
                onSelectSalon={setSelectedSalonId}
              />
            )}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Centri{city ? ` a ${city}` : ""}
                </h2>
                <span className="text-sm text-muted-foreground">{filtered.length} risultati</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((salon) => (
                  <div
                    key={salon.id}
                    className={cn(
                      "surface cursor-pointer p-5 transition-all",
                      selectedSalonId === salon.id
                        ? "ring-2 ring-primary"
                        : "hover:ring-1 hover:ring-primary/40",
                    )}
                    onClick={() => setSelectedSalonId(salon.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{salon.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {salon.address || "Indirizzo non disponibile"}
                        </p>
                      </div>
                      <MapPin className="h-5 w-5 shrink-0 text-primary" />
                    </div>
                    <Button asChild className="mt-4" onClick={(e) => e.stopPropagation()}>
                      <Link to="/salon/$slug" params={{ slug: salon.slug }}>
                        Seleziona centro <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | null)[];
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Seleziona {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option ?? ""}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function LeafletMap({
  salons,
  selectedSalonId,
  onSelectSalon,
}: {
  salons: Salon[];
  selectedSalonId: string | null;
  onSelectSalon: (id: string) => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cssId = "leaflet-css";
    const scriptId = "leaflet-js";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existing = document.getElementById(scriptId);
    if (existing) {
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || salons.length === 0) return;
    const L = (window as any).L;
    const node = document.getElementById("lookera-booking-map");
    if (!L || !node) return;

    const map = L.map(node);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    salons.forEach((salon) => {
      const marker = L.marker([salon.latitude, salon.longitude]).addTo(map);
      marker.bindPopup(
        `<strong>${escapeHtml(salon.name)}</strong><br/>${escapeHtml(salon.address ?? "")}`,
      );
      marker.on("click", () => onSelectSalon(salon.id));
      if (selectedSalonId === salon.id) marker.openPopup();
      bounds.extend([salon.latitude, salon.longitude]);
    });

    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    return () => map.remove();
  }, [ready, salons, selectedSalonId, onSelectSalon]);

  if (salons.length === 0) return null;

  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">Mappa dei centri</h2>
        <p className="text-sm text-muted-foreground">
          Clicca un Pin per selezionare il centro, oppure scegli un centro dall’elenco.
        </p>
      </div>
      <div id="lookera-booking-map" className="h-[420px] w-full" />
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char] ?? char));
}
