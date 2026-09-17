import {
  DayType,
  OvertimePolicy,
  PunchType,
  TimeEntry,
  User,
} from '@prisma/client';
import * as dayjs from 'dayjs';
import { DayBreakdown, PeriodBalanceResult } from './hourCalculation.types';

// Teto do banco de horas (§11.1/§11.2 da proposta): 60 horas.
export const BANK_CAP_MINUTES = 60 * 60;

// Mesma convenção "ad-hoc BRT" (UTC-3) usada no restante do código para
// determinar a que dia calendário uma marcação pertence.
const dayKey = (date: Date): string =>
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

export const calculateExpectedMinutes = (
  user: Pick<User, 'dailyWorkMinutes' | 'workWeekdays'>,
  dateKey: string,
): number =>
  user.workWeekdays.includes(isoWeekday(dateKey)) ? user.dailyWorkMinutes : 0;

export const allocateToBankOrPayment = (
  overtimeMinutes: number,
  runningBankBalanceMinutes: number,
): {
  bankMinutes: number;
  paymentMinutes: number;
  newRunningBankBalanceMinutes: number;
} => {
  if (overtimeMinutes <= 0) {
    return {
      bankMinutes: 0,
      paymentMinutes: 0,
      newRunningBankBalanceMinutes: runningBankBalanceMinutes,
    };
  }

  const room = Math.max(BANK_CAP_MINUTES - runningBankBalanceMinutes, 0);
  const bankMinutes = Math.min(overtimeMinutes, room);
  const paymentMinutes = overtimeMinutes - bankMinutes;
  return {
    bankMinutes,
    paymentMinutes,
    newRunningBankBalanceMinutes: runningBankBalanceMinutes + bankMinutes,
  };
};

export const getPolicyPercentage = (
  dayType: DayType,
  policies: OvertimePolicy[],
): number | null => {
  const policy = policies.find((p) => p.dayType === dayType && p.active);
  return policy ? policy.percentage : null;
};

// Orquestra o cálculo dia a dia, do primeiro registro do funcionário até o
// fim do período. É necessário varrer desde o início para que o saldo do
// banco de horas (que é cumulativo e tem teto) esteja correto no começo do
// período pedido. `periodStart`, quando informado, apenas filtra quais dias
// aparecem no detalhamento retornado — o cálculo do saldo em si sempre
// considera o histórico completo.
export const calculatePeriodBreakdown = (
  user: Pick<User, 'dailyWorkMinutes' | 'workWeekdays'>,
  allEntriesUpToPeriodEnd: TimeEntry[],
  holidayDates: Set<string>,
  policies: OvertimePolicy[],
  periodStart?: string,
): PeriodBalanceResult => {
  const grouped = groupEntriesByDay(allEntriesUpToPeriodEnd);
  const sortedDateKeys = [...grouped.keys()].sort();

  let runningBankBalanceMinutes = 0;
  const days: DayBreakdown[] = [];

  for (const dateKey of sortedDateKeys) {
    const dayEntries = grouped.get(dateKey);
    const dayType = classifyDay(dateKey, holidayDates);
    const workedMinutes = calculateWorkedMinutes(dayEntries);
    const expectedMinutes = calculateExpectedMinutes(user, dateKey);
    const balanceMinutes = workedMinutes - expectedMinutes;
    const overtimeMinutes = Math.max(balanceMinutes, 0);

    const { bankMinutes, paymentMinutes, newRunningBankBalanceMinutes } =
      allocateToBankOrPayment(overtimeMinutes, runningBankBalanceMinutes);
    runningBankBalanceMinutes = newRunningBankBalanceMinutes;

    if (!periodStart || dateKey >= periodStart) {
      days.push({
        date: dateKey,
        dayType,
        workedMinutes,
        expectedMinutes,
        balanceMinutes,
        bankMinutes,
        paymentMinutes,
        paymentPercentage:
          paymentMinutes > 0 ? getPolicyPercentage(dayType, policies) : null,
        bankBalanceAfter: runningBankBalanceMinutes,
        entries: dayEntries,
      });
    }
  }

  return { currentBankBalanceMinutes: runningBankBalanceMinutes, days };
};

const hourCalculationService = {
  BANK_CAP_MINUTES,
  groupEntriesByDay,
  calculateWorkedMinutes,
  classifyDay,
  calculateExpectedMinutes,
  allocateToBankOrPayment,
  getPolicyPercentage,
  calculatePeriodBreakdown,
};

export default hourCalculationService;
