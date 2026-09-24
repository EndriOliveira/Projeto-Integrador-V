import * as dayjs from 'dayjs';

// Mês de ciclo da folha: vai do dia 21 do mês anterior ao dia 20 de `month`.
// Ex.: JAN/FEV de 2026 = 21/01/2026 a 20/02/2026 (month = 2, year = 2026).
export const CYCLE_START_DAY = 21;

export const CYCLE_LABELS = [
  'DEZ/JAN',
  'JAN/FEV',
  'FEV/MAR',
  'MAR/ABR',
  'ABR/MAI',
  'MAI/JUN',
  'JUN/JUL',
  'JUL/AGO',
  'AGO/SET',
  'SET/OUT',
  'OUT/NOV',
  'NOV/DEZ',
];

// Datas no formato YYYY-MM-DD (mesma chave de dia usada no hourCalculation).
export const getCycleRange = (
  year: number,
  month: number,
): { start: string; end: string } => {
  const end = dayjs(new Date(year, month - 1, CYCLE_START_DAY - 1));
  const start = end.subtract(1, 'month').add(1, 'day');
  return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
};

export const getCycleOf = (
  dateKey: string,
): { year: number; month: number } => {
  const date = dayjs(dateKey);
  const shifted = date.date() >= CYCLE_START_DAY ? date.add(1, 'month') : date;
  return { year: shifted.year(), month: shifted.month() + 1 };
};

// Dia só-data (@db.Date) <-> chave YYYY-MM-DD, sempre em UTC.
export const dateOnlyToKey = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const keyToDateOnly = (key: string): Date =>
  new Date(`${key}T00:00:00.000Z`);
