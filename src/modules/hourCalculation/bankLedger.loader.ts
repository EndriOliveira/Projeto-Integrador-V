import { User } from '@prisma/client';
import { dateOnlyToKey, keyToDateOnly } from '../../shared/payrollCycle';
import overtimePolicyService from '../overtimePolicy/overtimePolicy.service';
import timeEntryRepository from '../timeEntry/timeEntry.repository';
import timesheetRepository from '../timesheet/timesheet.repository';
import hourCalculationService from './hourCalculation.service';
import { BankLedgerResult } from './hourCalculation.types';

export type LedgerUser = Pick<
  User,
  'id' | 'dailyWorkMinutes' | 'workWeekdays' | 'admissionDate' | 'createdAt'
>;

// Início do cálculo: cadastro no sistema (ou 1ª marcação, se anterior), nunca
// antes da admissão. Não usa só a admissão para não contar como falta os anos
// anteriores à adoção do sistema.
const getLedgerStart = (
  user: LedgerUser,
  firstEntryKey: string | undefined,
): string => {
  const createdKey = hourCalculationService.dayKey(user.createdAt);
  let start =
    firstEntryKey && firstEntryKey < createdKey ? firstEntryKey : createdKey;
  if (user.admissionDate) {
    const admissionKey = dateOnlyToKey(user.admissionDate);
    if (admissionKey > start) start = admissionKey;
  }
  return start;
};

// Banco de horas do funcionário até `endDate` (ou hoje). Dias futuros não entram.
export const loadBankLedger = async (
  user: LedgerUser,
  endDate?: string,
): Promise<BankLedgerResult> => {
  const today = hourCalculationService.dayKey(new Date());
  const end = endDate && endDate < today ? endDate : today;

  const entries = await timeEntryRepository.getEntriesForUser(user.id);
  const firstEntryKey = entries.length
    ? hourCalculationService.dayKey(entries[0].deviceTimestamp)
    : undefined;
  const start = getLedgerStart(user, firstEntryKey);
  if (start > end) return { days: [], cycles: [] };

  const [holidayDates, workDays] = await Promise.all([
    overtimePolicyService.getHolidayDateSet(),
    timesheetRepository.listWorkDays(
      user.id,
      keyToDateOnly(start),
      keyToDateOnly(end),
    ),
  ]);
  const fieldDates = new Set(
    workDays
      .filter((workDay) => workDay.hazardType !== null)
      .map((workDay) => dateOnlyToKey(workDay.date)),
  );

  return hourCalculationService.calculateBankLedger({
    user,
    entries,
    holidayDates,
    fieldDates,
    startDate: start,
    endDate: end,
    today,
  });
};
