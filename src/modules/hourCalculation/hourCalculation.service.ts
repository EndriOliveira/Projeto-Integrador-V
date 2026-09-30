import {
  DayType,
  OvertimePolicy,
  PunchType,
  TimeEntry,
  User,
} from '@prisma/client';
import * as dayjs from 'dayjs';
import { getCycleOf, getCycleRange } from '../../shared/payrollCycle';
import {
  BankLedgerResult,
  CycleSummary,
  DayBreakdown,
  OvertimeCategory,
} from './hourCalculation.types';

// Regra do banco de horas (definida pelo cliente):
// - Cada mês de ciclo (21 a 20) acumula as horas extras em três saldos:
//   100% (domingo/feriado), 60% (dia em campo) e banco (demais dias, sem adicional).
// - As horas a menos do ciclo (falta sem marcação conta o dia inteiro), somadas à
//   negativa que veio do ciclo anterior, são abatidas hora a hora: primeiro do
//   saldo de 100%, depois do de 60%, por último do banco. O que não tiver de onde
//   abater fica como negativa e passa para o próximo ciclo (não é descontado).
// - No fechamento, até 60h ficam presas no banco anual; o que passar é pago na
//   ordem 100% -> 60% (e, no DEZ/JAN, o restante a 70%). Horas só de banco acima
//   de 60h nos demais meses continuam presas até o DEZ/JAN.
// - O ano do banco termina no ciclo DEZ/JAN, quando o RH paga o preso a 70%.

// Teto de horas presas por ciclo: 60 horas.
export const BANK_CAP_MINUTES = 60 * 60;
// Ciclo DEZ/JAN (month = 1) fecha o ano do banco.
const YEAR_CLOSING_CYCLE_MONTH = 1;

// Mesma convenção "ad-hoc BRT" (UTC-3) usada no restante do código para
// determinar a que dia calendário uma marcação pertence.
export const dayKey = (date: Date): string =>
  dayjs(date).subtract(3, 'hours').format('YYYY-MM-DD');

export const groupEntriesByDay = (
  entries: TimeEntry[],
): Map<string, TimeEntry[]> => {
  const grouped = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.deviceTimestamp);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }
  for (const dayEntries of grouped.values()) {
    dayEntries.sort((a, b) => dayjs(a.deviceTimestamp).diff(b.deviceTimestamp));
  }
  return grouped;
};

// Um período trabalhado começa em ENTRADA ou INTERVALO_SAIDA e termina em
// INTERVALO_ENTRADA ou SAIDA. Suporta múltiplos intervalos no mesmo dia.
const isSegmentStart = (type: PunchType): boolean =>
  type === PunchType.ENTRADA || type === PunchType.INTERVALO_SAIDA;
const isSegmentEnd = (type: PunchType): boolean =>
  type === PunchType.INTERVALO_ENTRADA || type === PunchType.SAIDA;

export const calculateWorkedMinutes = (dayEntries: TimeEntry[]): number => {
  let totalMinutes = 0;
  let segmentStart: Date | null = null;

  for (const entry of dayEntries) {
    if (isSegmentStart(entry.type)) {
      segmentStart = entry.deviceTimestamp;
    } else if (isSegmentEnd(entry.type) && segmentStart) {
      totalMinutes += dayjs(entry.deviceTimestamp).diff(segmentStart, 'minute');
      segmentStart = null;
    }
  }
  return totalMinutes;
};

export const classifyDay = (
  dateKey: string,
  holidayDates: Set<string>,
): DayType => {
  if (holidayDates.has(dateKey)) return DayType.SUNDAY_HOLIDAY;
  const weekday = dayjs(dateKey).day(); // 0 = domingo ... 6 = sábado
  if (weekday === 0) return DayType.SUNDAY_HOLIDAY;
  if (weekday === 6) return DayType.SATURDAY;
  return DayType.WEEKDAY;
};

// Converte dayjs().day() (0=domingo..6=sábado) para o padrão ISO usado em
// User.workWeekdays (1=segunda..7=domingo).
const isoWeekday = (dateKey: string): number => {
  const weekday = dayjs(dateKey).day();
  return weekday === 0 ? 7 : weekday;
};

// Feriado não tem jornada: não gera negativa, e o trabalhado vira extra a 100%.
export const calculateExpectedMinutes = (
  user: Pick<User, 'dailyWorkMinutes' | 'workWeekdays'>,
  dateKey: string,
  holidayDates: Set<string> = new Set(),
): number =>
  !holidayDates.has(dateKey) && user.workWeekdays.includes(isoWeekday(dateKey))
    ? user.dailyWorkMinutes
    : 0;

export const getPolicyPercentage = (
  dayType: DayType,
  policies: OvertimePolicy[],
): number | null => {
  const policy = policies.find((p) => p.dayType === dayType && p.active);
  return policy ? policy.percentage : null;
};

export const classifyOvertime = (
  dayType: DayType,
  isFieldDay: boolean,
): OvertimeCategory => {
  if (dayType === DayType.SUNDAY_HOLIDAY) return 'H100';
  return isFieldDay ? 'H60' : 'BANK';
};

type CycleAccumulator = {
  year: number;
  month: number;
  overtime100: number;
  overtime60: number;
  overtimeBank: number;
  negative: number;
};

// Tira até `wanted` minutos de um saldo; devolve quanto conseguiu tirar.
const take = (available: number, wanted: number): number =>
  Math.min(available, Math.max(wanted, 0));

export const closeCycle = (
  acc: CycleAccumulator,
  carriedNegativeIn: number,
  closed: boolean,
  heldYearBefore: number,
): CycleSummary => {
  let deficit = acc.negative + carriedNegativeIn;
  let h100 = acc.overtime100;
  let h60 = acc.overtime60;
  let bank = acc.overtimeBank;

  const abated100 = take(h100, deficit);
  h100 -= abated100;
  deficit -= abated100;
  const abated60 = take(h60, deficit);
  h60 -= abated60;
  deficit -= abated60;
  const abatedBank = take(bank, deficit);
  bank -= abatedBank;
  deficit -= abatedBank;

  let excess = Math.max(h100 + h60 + bank - BANK_CAP_MINUTES, 0);
  const paid100 = take(h100, excess);
  h100 -= paid100;
  excess -= paid100;
  const paid60 = take(h60, excess);
  h60 -= paid60;
  excess -= paid60;
  const paid70 =
    acc.month === YEAR_CLOSING_CYCLE_MONTH ? take(bank, excess) : 0;
  bank -= paid70;

  const held = h100 + h60 + bank;
  const { start, end } = getCycleRange(acc.year, acc.month);
  return {
    year: acc.year,
    month: acc.month,
    start,
    end,
    closed,
    overtime100Minutes: acc.overtime100,
    overtime60Minutes: acc.overtime60,
    overtimeBankMinutes: acc.overtimeBank,
    negativeMinutes: acc.negative,
    carriedNegativeInMinutes: carriedNegativeIn,
    abated100Minutes: abated100,
    abated60Minutes: abated60,
    abatedBankMinutes: abatedBank,
    paid100Minutes: paid100,
    paid60Minutes: paid60,
    paid70Minutes: paid70,
    heldMinutes: held,
    negativeBalanceMinutes: deficit,
    heldYearMinutes: heldYearBefore + held,
  };
};

type LedgerInput = {
  user: Pick<User, 'dailyWorkMinutes' | 'workWeekdays'>;
  entries: TimeEntry[];
  holidayDates: Set<string>;
  fieldDates: Set<string>; // dias em campo (apontamento com periculosidade)
  startDate: string; // primeiro dia considerado (admissão ou 1ª marcação)
  endDate: string; // último dia considerado (inclusive)
  today: string; // o dia de hoje ainda está em andamento: não gera negativa
};

// Percorre dia a dia (inclusive dias sem marcação, que contam como falta) desde
// o início, porque a negativa passa de um ciclo para o outro.
export const calculateBankLedger = ({
  user,
  entries,
  holidayDates,
  fieldDates,
  startDate,
  endDate,
  today,
}: LedgerInput): BankLedgerResult => {
  const grouped = groupEntriesByDay(entries);
  const days: DayBreakdown[] = [];
  const cycles: CycleSummary[] = [];

  let acc: CycleAccumulator | null = null;
  let carriedNegative = 0;
  let heldYear = 0;

  const finishCycle = (closed: boolean) => {
    const summary = closeCycle(acc, carriedNegative, closed, heldYear);
    cycles.push(summary);
    carriedNegative = summary.negativeBalanceMinutes;
    // O DEZ/JAN fecha o ano do banco: o preso é pago a 70% e o próximo começa do zero.
    heldYear =
      acc.month === YEAR_CLOSING_CYCLE_MONTH ? 0 : summary.heldYearMinutes;
  };

  for (
    let date = dayjs(startDate);
    date.format('YYYY-MM-DD') <= endDate;
    date = date.add(1, 'day')
  ) {
    const key = date.format('YYYY-MM-DD');
    const cycle = getCycleOf(key);
    if (!acc || acc.year !== cycle.year || acc.month !== cycle.month) {
      if (acc) finishCycle(true);
      acc = {
        ...cycle,
        overtime100: 0,
        overtime60: 0,
        overtimeBank: 0,
        negative: 0,
      };
    }

    const dayEntries = grouped.get(key) ?? [];
    const dayType = classifyDay(key, holidayDates);
    const workedMinutes = calculateWorkedMinutes(dayEntries);
    const expectedMinutes = calculateExpectedMinutes(user, key, holidayDates);
    const balanceMinutes = workedMinutes - expectedMinutes;
    const overtimeMinutes = Math.max(balanceMinutes, 0);
    const negativeMinutes = key >= today ? 0 : Math.max(-balanceMinutes, 0);
    const overtimeCategory =
      overtimeMinutes > 0
        ? classifyOvertime(dayType, fieldDates.has(key))
        : null;

    if (overtimeCategory === 'H100') acc.overtime100 += overtimeMinutes;
    if (overtimeCategory === 'H60') acc.overtime60 += overtimeMinutes;
    if (overtimeCategory === 'BANK') acc.overtimeBank += overtimeMinutes;
    acc.negative += negativeMinutes;

    if (dayEntries.length > 0 || expectedMinutes > 0) {
      days.push({
        date: key,
        dayType,
        workedMinutes,
        expectedMinutes,
        balanceMinutes,
        overtimeMinutes,
        overtimeCategory,
        negativeMinutes,
        cycleBalanceAfter:
          acc.overtime100 +
          acc.overtime60 +
          acc.overtimeBank -
          acc.negative -
          carriedNegative,
        entries: dayEntries,
      });
    }
  }

  if (acc) {
    finishCycle(getCycleRange(acc.year, acc.month).end < today);
  }
  return { days, cycles };
};

const hourCalculationService = {
  BANK_CAP_MINUTES,
  dayKey,
  groupEntriesByDay,
  calculateWorkedMinutes,
  classifyDay,
  calculateExpectedMinutes,
  getPolicyPercentage,
  classifyOvertime,
  closeCycle,
  calculateBankLedger,
};

export default hourCalculationService;
