import { Logger, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as dayjs from 'dayjs';
import { assertCanAccessEmployee } from '../../shared/access-control';
import hourCalculationService from '../hourCalculation/hourCalculation.service';
import overtimePolicyService from '../overtimePolicy/overtimePolicy.service';
import timeEntryRepository from '../timeEntry/timeEntry.repository';
import userRepository from '../user/user.repository';
import { HourBalanceQueryDto } from './dto/request/hourBalanceQuery.dto';
import { HourBalanceResponseDto } from './dto/response/hourBalance.response.dto';
import { validateHourBalanceQuery } from './schemas/hourBalanceQuery.schema';

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
  ]);
  if (!user) {
    Logger.error(`User ${targetUserId} not found`, 'getBalance');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  const upToDate = query.rangeEnd
    ? dayjs(query.rangeEnd).add(21, 'hours').toDate()
    : undefined;
  const entries = await timeEntryRepository.getEntriesForUser(
    targetUserId,
    upToDate,
  );

  const [holidayDates, policies] = await Promise.all([
    overtimePolicyService.getHolidayDateSet(),
    overtimePolicyService.listOvertimePolicies(),
  ]);

  const periodStart = query.rangeStart
    ? dayjs(query.rangeStart).subtract(3, 'hours').format('YYYY-MM-DD')
    : undefined;

  const result = hourCalculationService.calculatePeriodBreakdown(
    user,
    entries,
    holidayDates,
    policies,
    periodStart,
  );

  Logger.log(`Hour balance calculated for user ${targetUserId}`, 'getBalance');
  return {
    currentBankBalanceMinutes: result.currentBankBalanceMinutes,
    days: result.days.map((day) => ({
      date: day.date,
      dayType: day.dayType,
      workedMinutes: day.workedMinutes,
      expectedMinutes: day.expectedMinutes,
      balanceMinutes: day.balanceMinutes,
      bankMinutes: day.bankMinutes,
      paymentMinutes: day.paymentMinutes,
      paymentPercentage: day.paymentPercentage,
      bankBalanceAfterMinutes: day.bankBalanceAfter,
    })),
  };
};

const hourBalanceService = {
  getBalance,
};

export default hourBalanceService;
