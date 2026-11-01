import Constants from 'expo-constants';

const API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ??
  '';

export interface PlacePrediction {
  placeId: string;
  displayName: string;
  secondaryText: string;
  types: string[];
}

export interface LocationAutocompleteResult {
  name: string;
  placeId: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  addressComponents: Array<{ long_name: string; short_name: string; types: string[] }>;
}

const BASE_URL = 'https://places.googleapis.com/v1';

function getApiKey(): string {
  if (!API_KEY) {
    console.warn('[GooglePlaces] No GOOGLE_MAPS_API_KEY configured');
  }
  return API_KEY;
}

/**
 * Get place predictions using the Google Places API (New) Autocomplete endpoint.
 * Mirrors the Frontend-Tech GoogleMapsService.getPlacePredictions behaviour,
 * but works in React Native via REST (no browser window.google required).
 */
export async function getPlacePredictions(input: string, options: {
  country?: string;
  types?: string[];
} = {}): Promise<PlacePrediction[]> {
  const apiKey = getApiKey();
  if (!apiKey || !input.trim()) return [];

  const country = options.country || 'in';
  const types = options.types || ['locality', 'administrative_area_level_2'];

  const url = `${BASE_URL}/places:autocomplete?key=${apiKey}`;
  const body = {
    input,
    languageCode: 'en',
    regionCode: country.toUpperCase(),
    includedPrimaryTypes: types,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types,suggestions.placePrediction.text',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Places autocomplete error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const suggestions = data.suggestions || [];
  const results: PlacePrediction[] = [];
  for (const s of suggestions) {
    const pp = s.placePrediction;
    if (!pp?.placeId) continue;
    results.push({
      placeId: pp.placeId,
      displayName: pp.structuredFormat?.mainText?.text || pp.text?.text || '',
      secondaryText: pp.structuredFormat?.secondaryText?.text || '',
      types: pp.types || [],
    });
  }
  return results;
}

/**
 * Get place details for a placeId using the Google Places API (New) endpoint.
 */
export async function getPlaceDetails(placeId: string): Promise<LocationAutocompleteResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Google Maps API key not configured');

  const url = `${BASE_URL}/places/${placeId}?fields=displayName,formattedAddress,location,addressComponents,types&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Places details error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const location = data.location || {};
  return {
    name: data.displayName?.text || data.formattedAddress || '',
    placeId: data.id || placeId,
    lat: location.latitude ?? 0,
    lng: location.longitude ?? 0,
    formattedAddress: data.formattedAddress || '',
    addressComponents: (data.addressComponents || []).map((c: any) => ({
      long_name: c.longText ?? c.long_name ?? '',
      short_name: c.shortText ?? c.short_name ?? '',
      types: c.types || [],
    })),
  };
}
