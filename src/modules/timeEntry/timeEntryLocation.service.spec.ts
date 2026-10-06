import { buildTimeEntry } from '../../../test/factories';
import geocodingService from '../geocoding/geocoding.service';
import timeEntryRepository from './timeEntry.repository';
import { resolveMissingAddresses } from './timeEntryLocation.service';

jest.mock('./timeEntry.repository');
jest.mock('../geocoding/geocoding.service');

const repo = jest.mocked(timeEntryRepository);
const geocoding = jest.mocked(geocodingService);

describe('timeEntryLocationService', () => {
  const located = buildTimeEntry({
    id: 'entry-1',
    latitude: -23.56,
    longitude: -46.65,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    geocoding.reverseGeocode.mockResolvedValue('Avenida Paulista, 1578');
  });

  describe('resolveMissingAddresses', () => {
    it('deve gravar o endereço junto com as coordenadas consultadas', async () => {
      // Act
      await resolveMissingAddresses([located]);

      // Assert
      expect(geocoding.reverseGeocode).toHaveBeenCalledWith(-23.56, -46.65);
      expect(repo.setLocationAddress).toHaveBeenCalledWith(
        'entry-1',
        { latitude: -23.56, longitude: -46.65 },
        'Avenida Paulista, 1578',
      );
    });

    it('deve ignorar marcações sem coordenadas ou que já têm endereço', async () => {
      // Arrange
      const withoutLocation = buildTimeEntry({ id: 'entry-2' });
      const withAddress = buildTimeEntry({
        id: 'entry-3',
        latitude: 1,
        longitude: 1,
        locationAddress: 'Já resolvido',
      });

      // Act
      await resolveMissingAddresses([withoutLocation, withAddress]);

      // Assert
      expect(geocoding.reverseGeocode).not.toHaveBeenCalled();
    });

    it('não deve gravar nada quando o endereço não foi encontrado', async () => {
      // Arrange
      geocoding.reverseGeocode.mockResolvedValue(null);

      // Act
      await resolveMissingAddresses([located]);

      // Assert
      expect(repo.setLocationAddress).not.toHaveBeenCalled();
    });

    it('deve seguir para as próximas marcações quando uma falha', async () => {
      // Arrange
      const other = buildTimeEntry({
        id: 'entry-4',
        latitude: 1,
        longitude: 2,
      });
      repo.setLocationAddress.mockRejectedValueOnce(new Error('db'));

      // Act
      await resolveMissingAddresses([located, other]);

      // Assert
      expect(repo.setLocationAddress).toHaveBeenCalledTimes(2);
    });

    it('não deve consultar duas vezes a mesma marcação em paralelo', async () => {
      // Act
      await Promise.all([
        resolveMissingAddresses([located]),
        resolveMissingAddresses([located]),
      ]);

      // Assert
      expect(geocoding.reverseGeocode).toHaveBeenCalledTimes(1);
    });
  });
});
