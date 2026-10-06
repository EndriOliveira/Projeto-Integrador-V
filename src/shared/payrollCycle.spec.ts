import {
  CYCLE_LABELS,
  dateOnlyToKey,
  getCycleOf,
  getCycleRange,
  keyToDateOnly,
} from './payrollCycle';

describe('payrollCycle', () => {
  describe('getCycleRange', () => {
    it('deve ir do dia 21 do mês anterior ao dia 20 do mês pedido', () => {
      // Act
      const range = getCycleRange(2026, 2);

      // Assert
      expect(range).toEqual({ start: '2026-01-21', end: '2026-02-20' });
    });

    it('deve começar em 21/12 do ano anterior quando o mês é janeiro', () => {
      // Act
      const range = getCycleRange(2026, 1);

      // Assert
      expect(range).toEqual({ start: '2025-12-21', end: '2026-01-20' });
    });

    it('deve terminar em 20/12 quando o mês é dezembro', () => {
      // Act
      const range = getCycleRange(2026, 12);

      // Assert
      expect(range).toEqual({ start: '2026-11-21', end: '2026-12-20' });
    });

    it('deve cobrir o fim de fevereiro quando o ciclo é FEV/MAR de ano bissexto', () => {
      // Act
      const range = getCycleRange(2028, 3);

      // Assert
      expect(range).toEqual({ start: '2028-02-21', end: '2028-03-20' });
    });
  });

  describe('getCycleOf', () => {
    it.each([
      ['2026-09-20', { year: 2026, month: 9 }],
      ['2026-09-21', { year: 2026, month: 10 }],
      ['2026-01-01', { year: 2026, month: 1 }],
      ['2025-12-21', { year: 2026, month: 1 }],
      ['2025-12-20', { year: 2025, month: 12 }],
    ])(
      'deve retornar o ciclo correto quando a data é %s',
      (dateKey, expected) => {
        // Act
        const cycle = getCycleOf(dateKey);

        // Assert
        expect(cycle).toEqual(expected);
      },
    );

    it('deve ser o inverso de getCycleRange para as duas pontas do ciclo', () => {
      // Arrange
      const { start, end } = getCycleRange(2026, 7);

      // Act / Assert
      expect(getCycleOf(start)).toEqual({ year: 2026, month: 7 });
      expect(getCycleOf(end)).toEqual({ year: 2026, month: 7 });
    });
  });

  describe('CYCLE_LABELS', () => {
    it('deve ter 12 meses começando em DEZ/JAN e terminando em NOV/DEZ', () => {
      // Assert
      expect(CYCLE_LABELS).toHaveLength(12);
      expect(CYCLE_LABELS[0]).toBe('DEZ/JAN');
      expect(CYCLE_LABELS[11]).toBe('NOV/DEZ');
    });
  });

  describe('dateOnlyToKey / keyToDateOnly', () => {
    it('deve converter a chave YYYY-MM-DD em meia-noite UTC e voltar', () => {
      // Act
      const date = keyToDateOnly('2026-09-21');

      // Assert
      expect(date.toISOString()).toBe('2026-09-21T00:00:00.000Z');
      expect(dateOnlyToKey(date)).toBe('2026-09-21');
    });
  });
});
