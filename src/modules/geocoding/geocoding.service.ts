import { Logger } from '@nestjs/common';

// Geocodificação reversa (coordenadas -> endereço) pelo Nominatim do
// OpenStreetMap. Política de uso: no máximo 1 requisição por segundo e um
// User-Agent identificando a aplicação. Por isso as consultas passam por uma
// fila e o resultado é gravado na marcação, para cada ponto ser consultado uma
// única vez.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'Projeto-Integrador-V-Ponto/1.0';
const MIN_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 5000;
const MAX_ADDRESS_LENGTH = 500;

export type NominatimAddress = Record<string, string | undefined>;

const firstOf = (
  address: NominatimAddress,
  keys: string[],
): string | undefined => keys.map((key) => address[key]).find(Boolean);

// "Avenida Paulista, 1578 – Bela Vista, São Paulo/SP". Usa o display_name
// quando não há rua nem cidade (ex.: área rural sem nome de via).
export const formatAddress = (
  address: NominatimAddress | undefined,
  displayName?: string,
): string | null => {
  const street = address
    ? firstOf(address, ['road', 'pedestrian', 'footway', 'path', 'highway'])
    : undefined;
  const district = address
    ? firstOf(address, ['suburb', 'neighbourhood', 'quarter', 'city_district'])
    : undefined;
  const city = address
    ? firstOf(address, ['city', 'town', 'village', 'municipality'])
    : undefined;
  const uf = address?.['ISO3166-2-lvl4']?.split('-')[1];

  if (!street && !city) return displayName?.trim() || null;

  const streetPart = [street, address?.house_number].filter(Boolean).join(', ');
  const cityPart = [city, uf].filter(Boolean).join('/');
  const placePart = [district, cityPart].filter(Boolean).join(', ');
  return [streetPart, placePart]
    .filter(Boolean)
    .join(' – ')
    .slice(0, MAX_ADDRESS_LENGTH);
};

// Encadeia as consultas respeitando o intervalo mínimo entre elas.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const schedule = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
};

// Nunca lança: sem endereço a tela mostra as coordenadas.
const reverseGeocode = (
  latitude: number,
  longitude: number,
): Promise<string | null> =>
  schedule(async () => {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'pt-BR',
    });
    try {
      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        Logger.warn(`Nominatim HTTP ${response.status}`, 'reverseGeocode');
        return null;
      }
      const body = (await response.json()) as {
        address?: NominatimAddress;
        display_name?: string;
      };
      return formatAddress(body.address, body.display_name);
    } catch (error) {
      Logger.warn(error.message, 'reverseGeocode');
      return null;
    }
  });

const geocodingService = {
  reverseGeocode,
};

export default geocodingService;
