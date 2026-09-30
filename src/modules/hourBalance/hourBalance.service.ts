import { Logger, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as dayjs from 'dayjs';
import { assertCanAccessEmployee } from '../../shared/access-control';
import { loadBankLedger } from '../hourCalculation/bankLedger.loader';
import { CycleSummary } from '../hourCalculation/hourCalculation.types';
import userRepository from '../user/user.repository';
import { HourBalanceQueryDto } from './dto/request/hourBalanceQuery.dto';
import { HourBalanceResponseDto } from './dto/response/hourBalance.response.dto';
import { validateHourBalanceQuery } from './schemas/hourBalanceQuery.schema';

// Ciclo DEZ/JAN fecha o ano do banco.
const YEAR_CLOSING_CYCLE_MONTH = 1;

// Saldo do ciclo: extras que sobraram após o abatimento menos a negativa sem cobertura.
const cycleBalance = (cycle: CycleSummary): number =>
  cycle.heldMinutes +
  cycle.paid100Minutes +
  cycle.paid60Minutes +
  cycle.paid70Minutes -
  cycle.negativeBalanceMinutes;

// Preso nos ciclos já fechados do ano do banco atual.
const heldInClosedCycles = (cycles: CycleSummary[]): number => {
  const last = cycles[cycles.length - 1];
  if (!last) return 0;
  if (!last.closed) return last.heldYearMinutes - last.heldMinutes;
  return last.month === YEAR_CLOSING_CYCLE_MONTH ? 0 : last.heldYearMinutes;
};

// Sem período: os ciclos do ano do banco atual (desde o último DEZ/JAN fechado).
const cyclesOfCurrentBankYear = (cycles: CycleSummary[]): CycleSummary[] => {
  let from = 0;
  cycles.forEach((cycle, index) => {
    if (cycle.closed && cycle.month === YEAR_CLOSING_CYCLE_MONTH) {
      from = index + 1;
    }
  });
  return cycles.slice(from);
};

const getBalance = async (
  actingUser: User,
  targetUserId: string,
  query: HourBalanceQueryDto,
): Promise<HourBalanceResponseDto> => {
  Logger.log(`Getting hour balance for user ${targetUserId}`, 'getBalance');
  validateHourBalanceQuery(query);
  await assertCanAccessEmployee(actingUser, targetUserId);

  const user = await userRepository.getOneUser({ id: targetUserId }, [
    'id',
    'dailyWorkMinutes',
    'workWeekdays',
    'admissionDate',
    'createdAt',
  ]);
  if (!user) {
    Logger.error(`User ${targetUserId} not found`, 'getBalance');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  const periodStart = query.rangeStart
    ? dayjs(query.rangeStart).format('YYYY-MM-DD')
    : undefined;
  const periodEnd = query.rangeEnd
    ? dayjs(query.rangeEnd).format('YYYY-MM-DD')
    : undefined;

  const ledger = await loadBankLedger(user, periodEnd);
  const lastCycle = ledger.cycles[ledger.cycles.length - 1];
  const currentCycle = lastCycle && !lastCycle.closed ? lastCycle : null;

  const cycles =
    periodStart || periodEnd
      ? ledger.cycles.filter(
          (cycle) =>
            (!periodStart || cycle.end >= periodStart) &&
            (!periodEnd || cycle.start <= periodEnd),
        )
      : cyclesOfCurrentBankYear(ledger.cycles);

  Logger.log(`Hour balance calculated for user ${targetUserId}`, 'getBalance');
  return {
    currentBankBalanceMinutes: lastCycle ? cycleBalance(lastCycle) : 0,
    heldYearMinutes: heldInClosedCycles(ledger.cycles),
    currentCycle,
    cycles,
    days: ledger.days
      .filter((day) => !periodStart || day.date >= periodStart)
      .map((day) => ({
        date: day.date,
        dayType: day.dayType,
        workedMinutes: day.workedMinutes,
        expectedMinutes: day.expectedMinutes,
        balanceMinutes: day.balanceMinutes,
        overtimeMinutes: day.overtimeMinutes,
        overtimeCategory: day.overtimeCategory,
        negativeMinutes: day.negativeMinutes,
        bankMinutes: day.overtimeMinutes,
        paymentMinutes: 0,
        paymentPercentage: null,
        bankBalanceAfterMinutes: day.cycleBalanceAfter,
      })),
  };
};

const hourBalanceService = {
  getBalance,
};

export default hourBalanceService;
