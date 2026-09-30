export const ITALIAN_REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
] as const;

const API_BASE = "https://comuni-ita.nicolorebaioli.dev/v5";

type ApiItem = { nome?: string };

async function fetchNames(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Impossibile caricare i dati territoriali.");
  const data = await response.json();
  const items = Array.isArray(data) ? data : data.data ?? [];
  return items
    .map((item: ApiItem) => item.nome)
    .filter((name: unknown): name is string => typeof name === "string" && name.length > 0)
    .sort((a: string, b: string) => a.localeCompare(b, "it"));
}

export async function fetchProvinces(region: string): Promise<string[]> {
  if (!region) return [];
  return fetchNames(
    `${API_BASE}/province/${encodeURIComponent(region)}?fields=nome&sort=nome`,
  );
}

export async function fetchCities(province: string): Promise<string[]> {
  if (!province) return [];
  return fetchNames(
    `${API_BASE}/comuni/provincia/${encodeURIComponent(province)}?fields=nome&sort=nome`,
  );
}
