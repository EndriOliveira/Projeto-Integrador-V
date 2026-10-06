import { Logger } from '@nestjs/common';
import { TimeEntry } from '@prisma/client';
import geocodingService from '../geocoding/geocoding.service';
import timeEntryRepository from './timeEntry.repository';

type LocatedEntry = Pick<
  TimeEntry,
  'id' | 'latitude' | 'longitude' | 'locationAddress'
>;

// Marcações com endereço sendo consultado agora: evita repetir a consulta
// quando a mesma lista é carregada de novo antes de terminar.
const resolving = new Set<string>();

export const needsAddress = (entry: LocatedEntry): boolean =>
  entry.latitude !== null &&
  entry.latitude !== undefined &&
  entry.longitude !== null &&
  entry.longitude !== undefined &&
  !entry.locationAddress &&
  !resolving.has(entry.id);

// Preenche o endereço das marcações com coordenadas e sem endereço. As
// consultas são enfileiradas (1/s), então quem chama não deve esperar: use
// resolveAddressesInBackground.
export const resolveMissingAddresses = async (
  entries: LocatedEntry[],
): Promise<void> => {
  for (const entry of entries.filter(needsAddress)) {
    resolving.add(entry.id);
    try {
      const coordinates = {
        latitude: entry.latitude,
        longitude: entry.longitude,
      };
      const address = await geocodingService.reverseGeocode(
        coordinates.latitude,
        coordinates.longitude,
      );
      if (address) {
        await timeEntryRepository.setLocationAddress(
          entry.id,
          coordinates,
          address,
        );
      }
    } catch (error) {
      Logger.warn(error.message, 'resolveMissingAddresses');
    } finally {
      resolving.delete(entry.id);
    }
  }
};

export const resolveAddressesInBackground = (entries: LocatedEntry[]): void => {
  void resolveMissingAddresses(entries);
};
