import { DayType, PunchType, TimeEntry } from '@prisma/client';
import {
  BANK_CAP_MINUTES,
  calculateBankLedger,
  calculateExpectedMinutes,
  calculateWorkedMinutes,
  classifyDay,
  classifyOvertime,
  closeCycle,
} from './hourCalculation.service';
import { CycleSummary } from './hourCalculation.types';

const H = 60;
const user = { dailyWorkMinutes: 8 * H, workWeekdays: [1, 2, 3, 4, 5] };

let sequence = 0;
const entry = (type: PunchType, iso: string): TimeEntry =>
  ({
    id: `entry-${sequence++}`,
    type,
    deviceTimestamp: new Date(iso),
  } as TimeEntry);

// Entrada às 08:00 BRT (11:00Z) e saída depois de `minutes`.
const workDay = (date: string, minutes: number): TimeEntry[] => {
  const start = new Date(`${date}T11:00:00Z`);
  const end = new Date(start.getTime() + minutes * 60_000);
  return [
    entry(PunchType.ENTRADA, start.toISOString()),
    entry(PunchType.SAIDA, end.toISOString()),
  ];
};

// Dias úteis do intervalo com a jornada normal (8h), exceto os de `overrides`
// (minutos trabalhados; 0 = falta, sem nenhuma marcação).
const buildEntries = (
  start: string,
  end: string,
  overrides: Record<string, number> = {},
): TimeEntry[] => {
  const entries: TimeEntry[] = [];
  for (
    const date = new Date(`${start}T12:00:00Z`);
    date.toISOString().slice(0, 10) <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const key = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    const isWorkday = weekday >= 1 && weekday <= 5;
    const minutes = key in overrides ? overrides[key] : isWorkday ? 8 * H : 0;
    if (minutes > 0) entries.push(...workDay(key, minutes));
  }
  return entries;
};

const findCycle = (
  cycles: CycleSummary[],
  year: number,
  month: number,
): CycleSummary => {
  const cycle = cycles.find((c) => c.year === year && c.month === month);
  if (!cycle) throw new Error(`Ciclo ${month}/${year} não encontrado`);
  return cycle;
};

const emptyCycle = {
  overtime100: 0,
  overtime60: 0,
  overtimeBank: 0,
  negative: 0,
};

describe('hourCalculation', () => {
  describe('calculateWorkedMinutes', () => {
    it('soma os períodos entre entrada/fim do intervalo e início do intervalo/saída', () => {
      const entries = [
        entry(PunchType.ENTRADA, '2026-09-01T11:00:00Z'),
        entry(PunchType.INTERVALO_ENTRADA, '2026-09-01T15:00:00Z'),
        entry(PunchType.INTERVALO_SAIDA, '2026-09-01T16:00:00Z'),
        entry(PunchType.SAIDA, '2026-09-01T20:00:00Z'),
      ];
      expect(calculateWorkedMinutes(entries)).toBe(8 * H);
    });

    it('ignora período sem fechamento', () => {
      expect(
        calculateWorkedMinutes([
          entry(PunchType.ENTRADA, '2026-09-01T11:00:00Z'),
        ]),
      ).toBe(0);
    });
  });

  describe('classifyDay / calculateExpectedMinutes', () => {
    it('feriado conta como domingo/feriado e não tem jornada', () => {
      const holidays = new Set(['2026-09-07']); // segunda-feira
      expect(classifyDay('2026-09-07', holidays)).toBe(DayType.SUNDAY_HOLIDAY);
      expect(calculateExpectedMinutes(user, '2026-09-07', holidays)).toBe(0);
    });

    it('dia útil da jornada espera a carga diária; sábado e domingo não', () => {
      expect(calculateExpectedMinutes(user, '2026-09-08')).toBe(8 * H);
      expect(calculateExpectedMinutes(user, '2026-09-12')).toBe(0);
      expect(calculateExpectedMinutes(user, '2026-09-13')).toBe(0);
    });
  });

  describe('classifyOvertime', () => {
    it('domingo/feriado = 100%, dia em campo = 60%, demais = só banco', () => {
      expect(classifyOvertime(DayType.SUNDAY_HOLIDAY, true)).toBe('H100');
      expect(classifyOvertime(DayType.WEEKDAY, true)).toBe('H60');
      expect(classifyOvertime(DayType.SATURDAY, true)).toBe('H60');
      expect(classifyOvertime(DayType.WEEKDAY, false)).toBe('BANK');
      expect(classifyOvertime(DayType.SATURDAY, false)).toBe('BANK');
    });
  });

  describe('closeCycle', () => {
    it('abate primeiro de 100%, depois de 60%, depois do banco', () => {
      const cycle = closeCycle(
        {
          year: 2026,
          month: 8,
          overtime100: 2 * H,
          overtime60: 3 * H,
          overtimeBank: 4 * H,
          negative: 6 * H,
        },
        0,
        true,
        0,
      );
      expect(cycle.abated100Minutes).toBe(2 * H);
      expect(cycle.abated60Minutes).toBe(3 * H);
      expect(cycle.abatedBankMinutes).toBe(1 * H);
      expect(cycle.heldMinutes).toBe(3 * H);
      expect(cycle.negativeBalanceMinutes).toBe(0);
    });

    it('fica negativo quando não há de onde abater', () => {
      const cycle = closeCycle(
        {
          ...emptyCycle,
          year: 2026,
          month: 8,
          overtimeBank: 2 * H,
          negative: 5 * H,
        },
        1 * H,
        true,
        0,
      );
      expect(cycle.abatedBankMinutes).toBe(2 * H);
      expect(cycle.negativeBalanceMinutes).toBe(4 * H);
      expect(cycle.heldMinutes).toBe(0);
    });

    it('acima de 60h paga primeiro 100%, depois 60%', () => {
      const cycle = closeCycle(
        {
          ...emptyCycle,
          year: 2026,
          month: 8,
          overtime100: 5 * H,
          overtime60: 65 * H,
        },
        0,
        true,
        0,
      );
      expect(cycle.paid100Minutes).toBe(5 * H);
      expect(cycle.paid60Minutes).toBe(5 * H);
      expect(cycle.paid70Minutes).toBe(0);
      expect(cycle.heldMinutes).toBe(BANK_CAP_MINUTES);
    });

    it('fora do DEZ/JAN, banco acima de 60h continua preso', () => {
      const cycle = closeCycle(
        { ...emptyCycle, year: 2026, month: 8, overtimeBank: 70 * H },
        0,
        true,
        0,
      );
      expect(cycle.paid70Minutes).toBe(0);
      expect(cycle.heldMinutes).toBe(70 * H);
    });

    it('no DEZ/JAN, banco acima de 60h é pago a 70%', () => {
      const cycle = closeCycle(
        { ...emptyCycle, year: 2027, month: 1, overtimeBank: 70 * H },
        0,
        true,
        0,
      );
      expect(cycle.paid70Minutes).toBe(10 * H);
      expect(cycle.heldMinutes).toBe(BANK_CAP_MINUTES);
    });

    it('soma o preso ao total do ano do banco', () => {
      const cycle = closeCycle(
        { ...emptyCycle, year: 2026, month: 8, overtime60: 10 * H },
        0,
        true,
        50 * H,
      );
      expect(cycle.heldYearMinutes).toBe(60 * H);
    });
  });

  describe('calculateBankLedger', () => {
    it('exemplo do cliente: 10h a 100%, 70h a 60% e 15h a menos', () => {
      // Ciclo JUL/AGO 2026 = 21/07 a 20/08.
      const fieldDays = [
        '2026-07-29',
        '2026-07-30',
        '2026-07-31',
        '2026-08-03',
        '2026-08-04',
        '2026-08-05',
        '2026-08-06',
        '2026-08-07',
        '2026-08-10',
        '2026-08-11',
      ];
      const overrides: Record<string, number> = {
        '2026-07-26': 10 * H, // domingo
        '2026-07-27': 0, // falta: -8h
        '2026-07-28': 1 * H, // -7h
      };
      fieldDays.forEach((day) => (overrides[day] = 15 * H)); // +7h cada

      const { cycles, days } = calculateBankLedger({
        user,
        entries: buildEntries('2026-07-21', '2026-08-20', overrides),
        holidayDates: new Set(),
        fieldDates: new Set(fieldDays),
        startDate: '2026-07-21',
        endDate: '2026-08-20',
        today: '2026-09-30',
      });
      const cycle = findCycle(cycles, 2026, 8);

      expect(cycle.closed).toBe(true);
      expect(cycle.overtime100Minutes).toBe(10 * H);
      expect(cycle.overtime60Minutes).toBe(70 * H);
      expect(cycle.negativeMinutes).toBe(15 * H);
      expect(cycle.abated100Minutes).toBe(10 * H);
      expect(cycle.abated60Minutes).toBe(5 * H);
      expect(cycle.paid60Minutes).toBe(5 * H);
      expect(cycle.heldMinutes).toBe(60 * H);
      expect(cycle.negativeBalanceMinutes).toBe(0);
      expect(days.find((d) => d.date === '2026-07-27')?.negativeMinutes).toBe(
        8 * H,
      );
    });

    it('leva a negativa para o próximo ciclo e abate dele', () => {
      const { cycles } = calculateBankLedger({
        user,
        entries: buildEntries('2026-07-21', '2026-09-20', {
          '2026-07-27': 0, // -8h
          '2026-07-28': 6 * H, // -2h
          '2026-07-29': 12 * H, // +4h de banco
          '2026-08-24': 18 * H, // próximo ciclo: +10h em campo
          '2026-08-25': 18 * H, // +10h em campo
        }),
        holidayDates: new Set(),
        fieldDates: new Set(['2026-08-24', '2026-08-25']),
        startDate: '2026-07-21',
        endDate: '2026-09-20',
        today: '2026-09-30',
      });
      const julAgo = findCycle(cycles, 2026, 8);
      const agoSet = findCycle(cycles, 2026, 9);

      expect(julAgo.negativeBalanceMinutes).toBe(6 * H);
      expect(agoSet.carriedNegativeInMinutes).toBe(6 * H);
      expect(agoSet.abated60Minutes).toBe(6 * H);
      expect(agoSet.heldMinutes).toBe(14 * H);
    });

    it('zera o preso do ano depois do DEZ/JAN', () => {
      const { cycles } = calculateBankLedger({
        user,
        entries: buildEntries('2026-12-21', '2027-02-20', {
          '2026-12-22': 13 * H, // +5h de banco no DEZ/JAN
          '2027-01-25': 10 * H, // +2h de banco no JAN/FEV
        }),
        holidayDates: new Set(),
        fieldDates: new Set(),
        startDate: '2026-12-21',
        endDate: '2027-02-20',
        today: '2027-03-01',
      });

      expect(findCycle(cycles, 2027, 1).heldYearMinutes).toBe(5 * H);
      expect(findCycle(cycles, 2027, 2).heldYearMinutes).toBe(2 * H);
    });

    it('feriado sem trabalho e o dia de hoje não geram negativa', () => {
      const { cycles, days } = calculateBankLedger({
        user,
        entries: buildEntries('2026-09-21', '2026-09-30', {
          '2026-09-22': 0, // feriado
          '2026-09-24': 4 * H, // -4h
          '2026-09-30': 2 * H, // hoje, em andamento
        }),
        holidayDates: new Set(['2026-09-22']),
        fieldDates: new Set(),
        startDate: '2026-09-21',
        endDate: '2026-09-30',
        today: '2026-09-30',
      });
      const cycle = findCycle(cycles, 2026, 10);

      expect(cycle.closed).toBe(false);
      expect(cycle.negativeMinutes).toBe(4 * H);
      expect(days.find((d) => d.date === '2026-09-30')?.negativeMinutes).toBe(
        0,
      );
    });

    it('hora trabalhada no feriado vai para 100%', () => {
      const { cycles } = calculateBankLedger({
        user,
        entries: buildEntries('2026-09-01', '2026-09-10', {
          '2026-09-07': 6 * H,
        }),
        holidayDates: new Set(['2026-09-07']),
        fieldDates: new Set(),
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        today: '2026-09-30',
      });
      expect(findCycle(cycles, 2026, 9).overtime100Minutes).toBe(6 * H);
    });
  });
});
