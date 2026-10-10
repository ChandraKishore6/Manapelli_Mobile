export type CityResult = {
  name: string;
  state?: string;
  country?: string;
  displayName: string;
};

/**
 * Searches cities, towns, and locations globally using the 100% free Photon API (OpenStreetMap).
 */
export async function searchCities(query: string): Promise<CityResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=8`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const features = data.features || [];

    const results: CityResult[] = [];
    const seen = new Set<string>();

    for (const feat of features) {
      const props = feat.properties || {};
      const cityName = props.name || props.city || props.town || props.village || props.county;
      if (!cityName) continue;

      const state = props.state;
      const country = props.country;

      const parts = [cityName];
      if (state && state !== cityName) parts.push(state);
      if (country) parts.push(country);

      const displayName = parts.join(", ");
      if (!seen.has(displayName.toLowerCase())) {
        seen.add(displayName.toLowerCase());
        results.push({
          name: cityName,
          state,
          country,
          displayName,
        });
      }
    }

    return results;
  } catch (err) {
    console.error("[CitySearch] Error querying Photon API:", err);
    return [];
  }
}
