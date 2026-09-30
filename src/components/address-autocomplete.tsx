import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

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
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      setError("");
      setOpen(false);
      return;
    }

    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      setSuggestions([]);

      try {
        const { data, error } = await supabase.functions.invoke("geocode-address", {
          body: { q: value.trim(), city, province, region },
        });

        if (requestId !== requestRef.current) return;

        if (error) {
          setError("Errore nella ricerca degli indirizzi.");
          setOpen(true);
          return;
        }

        const next = (Array.isArray(data?.suggestions) ? data.suggestions : []) as AddressSuggestion[];
        setSuggestions(next);
        setOpen(true);
      } catch {
        if (requestId === requestRef.current) {
          setSuggestions([]);
          setError("Errore nella ricerca degli indirizzi.");
          setOpen(true);
        }
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, 600);

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
          setError("");
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0 || error) setOpen(true);
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

          {!loading && error && (
            <div className="px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error &&
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

          {!loading && !error && suggestions.length === 0 && value.trim().length >= 3 && (
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
