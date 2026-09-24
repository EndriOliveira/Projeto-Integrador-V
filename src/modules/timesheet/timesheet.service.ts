import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PaidHours, WorkDay } from '@prisma/client';
import { parseDateOnly } from '../../utils/parseDateOnly';
import {
  dateOnlyToKey,
  getCycleOf,
  getCycleRange,
  keyToDateOnly,
} from '../../shared/payrollCycle';
import userRepository from '../user/user.repository';
import { PaidHoursQueryDto } from './dto/request/paidHoursQuery.dto';
import { UpsertPaidHoursDto } from './dto/request/upsertPaidHours.dto';
import { UpsertWorkDayDto } from './dto/request/upsertWorkDay.dto';
import { WorkDayQueryDto } from './dto/request/workDayQuery.dto';
import {
  validatePaidHoursQuery,
  validateUpsertPaidHours,
  validateUpsertWorkDay,
  validateWorkDayQuery,
} from './schemas/timesheet.schema';
import timesheetRepository from './timesheet.repository';

const assertUserExists = async (userId: string): Promise<void> => {
  const user = await userRepository.getOneUser({ id: userId }, ['id']);
  if (!user) {
    Logger.error(`User ${userId} not found`, 'assertUserExists');
    throw new NotFoundException('Usuário Não Encontrado');
  }
};

const listWorkDays = async (query: WorkDayQueryDto): Promise<WorkDay[]> => {
  Logger.log(`Listing work days`, 'listWorkDays');
  const { userId, year, month } = validateWorkDayQuery(query);
  const { start, end } = getCycleRange(year, month);
  return await timesheetRepository.listWorkDays(
    userId,
    keyToDateOnly(start),
    keyToDateOnly(end),
  );
};

const upsertWorkDay = async (body: UpsertWorkDayDto): Promise<WorkDay> => {
  Logger.log(`Saving work day`, 'upsertWorkDay');
  const { userId, date, ...data } = validateUpsertWorkDay(body);
  await assertUserExists(userId);

  const dateKey = dateOnlyToKey(parseDateOnly(date));
  const cycle = getCycleOf(dateKey);
  const paidHours = await timesheetRepository.getOnePaidHours(
    userId,
    cycle.year,
    cycle.month,
  );
  if (paidHours?.locked) {
    Logger.error(`Cycle ${cycle.month}/${cycle.year} locked`, 'upsertWorkDay');
    throw new BadRequestException('Mês bloqueado para edição');
  }

  const workDay = await timesheetRepository.upsertWorkDay(
    userId,
    keyToDateOnly(dateKey),
    {
      ...data,
      client: data.client === undefined ? undefined : data.client || null,
      project: data.project === undefined ? undefined : data.project || null,
    },
  );
  Logger.log(`Work day saved`, 'upsertWorkDay');
  return workDay;
};

const listPaidHours = async (
  query: PaidHoursQueryDto,
): Promise<PaidHours[]> => {
  Logger.log(`Listing paid hours`, 'listPaidHours');
  const { userId, year } = validatePaidHoursQuery(query);
  return await timesheetRepository.listPaidHours(userId, year);
};

const upsertPaidHours = async (
  body: UpsertPaidHoursDto,
): Promise<PaidHours> => {
  Logger.log(`Saving paid hours`, 'upsertPaidHours');
  const data = validateUpsertPaidHours(body) as UpsertPaidHoursDto;
  await assertUserExists(data.userId);

  // Mês bloqueado só aceita o desbloqueio: os valores ficam congelados.
  const existing = await timesheetRepository.getOnePaidHours(
    data.userId,
    data.year,
    data.month,
  );
  if (existing?.locked) {
    if (data.locked) {
      Logger.error(`Paid hours locked`, 'upsertPaidHours');
      throw new BadRequestException('Mês bloqueado para edição');
    }
    return await timesheetRepository.upsertPaidHours({
      userId: existing.userId,
      year: existing.year,
      month: existing.month,
      paid60Minutes: existing.paid60Minutes,
      paid70Minutes: existing.paid70Minutes,
      paid100Minutes: existing.paid100Minutes,
      locked: false,
    });
  }

  const paidHours = await timesheetRepository.upsertPaidHours(data);
  Logger.log(`Paid hours saved`, 'upsertPaidHours');
  return paidHours;
};

const timesheetService = {
  listWorkDays,
  upsertWorkDay,
  listPaidHours,
  upsertPaidHours,
};

export default timesheetService;
