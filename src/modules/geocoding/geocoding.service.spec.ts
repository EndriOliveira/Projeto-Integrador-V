import geocodingService, { formatAddress } from './geocoding.service';

const PAULISTA = {
  house_number: '1578',
  road: 'Avenida Paulista',
  suburb: 'Bela Vista',
  city: 'São Paulo',
  state: 'São Paulo',
  'ISO3166-2-lvl4': 'BR-SP',
  country: 'Brasil',
};

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body } as Response);

describe('geocodingService', () => {
  describe('formatAddress', () => {
    it('deve montar rua, número, bairro e cidade/UF', () => {
      // Act / Assert
      expect(formatAddress(PAULISTA)).toBe(
        'Avenida Paulista, 1578 – Bela Vista, São Paulo/SP',
      );
    });

    it('deve omitir as partes que o endereço não tem', () => {
      // Act / Assert
      expect(formatAddress({ road: 'Rua Sem Número', town: 'Cotia' })).toBe(
        'Rua Sem Número – Cotia',
      );
    });

    it('deve usar o display_name quando não há rua nem cidade', () => {
      // Act / Assert
      expect(
        formatAddress({ state: 'Pará' }, 'Floresta Nacional, Pará, Brasil'),
      ).toBe('Floresta Nacional, Pará, Brasil');
    });

    it('deve retornar null quando não há nada aproveitável', () => {
      // Act / Assert
      expect(formatAddress(undefined)).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    let fetchMock: jest.SpyInstance;
    let clock = Date.parse('2026-10-06T12:00:00.000Z');

    beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch');
      // Avança o relógio entre os testes para a fila (1 consulta/s) não esperar.
      clock += 60_000;
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(clock);
    });

    afterEach(() => {
      jest.useRealTimers();
      fetchMock.mockRestore();
    });

    it('deve consultar o Nominatim em pt-BR, identificado, e formatar o endereço', async () => {
      // Arrange
      fetchMock.mockResolvedValue(jsonResponse({ address: PAULISTA }));

      // Act
      const address = await geocodingService.reverseGeocode(-23.56, -46.65);

      // Assert
      expect(address).toBe('Avenida Paulista, 1578 – Bela Vista, São Paulo/SP');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('lat=-23.56');
      expect(url).toContain('lon=-46.65');
      expect(url).toContain('accept-language=pt-BR');
      expect(init.headers['User-Agent']).toBeTruthy();
    });

    it('deve retornar null quando o Nominatim responde com erro', async () => {
      // Arrange
      fetchMock.mockResolvedValue(jsonResponse({}, false, 429));

      // Act / Assert
      expect(await geocodingService.reverseGeocode(0, 0)).toBeNull();
    });

    it('deve retornar null quando a requisição falha', async () => {
      // Arrange
      fetchMock.mockRejectedValue(new Error('timeout'));

      // Act / Assert
      expect(await geocodingService.reverseGeocode(0, 0)).toBeNull();
    });

    it('deve esperar 1 segundo entre consultas seguidas', async () => {
      // Arrange
      fetchMock.mockResolvedValue(jsonResponse({ address: PAULISTA }));

      // Act
      const first = geocodingService.reverseGeocode(1, 1);
      const second = geocodingService.reverseGeocode(2, 2);
      await first;
      await jest.advanceTimersByTimeAsync(500);

      // Assert: a segunda ainda não saiu...
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // ...e sai depois do intervalo mínimo.
      await jest.advanceTimersByTimeAsync(700);
      await second;
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
