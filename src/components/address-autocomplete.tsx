import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type AddressSuggestion = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  city?: string;
  province?: string;
  region?: string;
  placeholder?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  city = "",
  province = "",
  region = "",
  placeholder = "Via, numero civico",
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const query = [value.trim(), city, province, region, "Italia"]
      .filter(Boolean)
      .join(", ");

    if (value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", query);
        url.searchParams.set("limit", "5");
        url.searchParams.set("lang", "it");
        url.searchParams.set("countrycode", "IT");

        const { data, error } = await supabase.functions.invoke("geocode-address", {
          body: { q: value.trim(), city, province, region },
        });

        if (error || requestId !== requestRef.current) return;
        const next = (Array.isArray(data?.suggestions) ? data.suggestions : []) as AddressSuggestion[];

        setSuggestions(next);
        setOpen(next.length > 0);
      } catch {
        if (requestId === requestRef.current) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [value, city, province, region]);

  return (
    <div className="relative">
      <Input
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Cerco indirizzi…
            </div>
          )}

          {!loading &&
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                type="button"
                className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(suggestion.address);
                  onSelect(suggestion);
                  setOpen(false);
                }}
              >
                {suggestion.label}
              </button>
            ))}

          {!loading && suggestions.length === 0 && value.trim().length >= 3 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nessun indirizzo trovato.
            </div>
          )}

          <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
            Dati mappa © OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
