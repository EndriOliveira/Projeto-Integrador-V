import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { DayType, Holiday, OvertimePolicy } from '@prisma/client';
import * as dayjs from 'dayjs';
import { CreateHolidayDto } from './dto/request/createHoliday.dto';
import { UpdateOvertimePolicyDto } from './dto/request/updateOvertimePolicy.dto';
import overtimePolicyRepository from './overtimePolicy.repository';
import { validateCreateHoliday } from './schemas/createHoliday.schema';
import { validateUpdateOvertimePolicy } from './schemas/updateOvertimePolicy.schema';

const listOvertimePolicies = async (): Promise<OvertimePolicy[]> => {
  Logger.log(`Listing overtime policies`, 'listOvertimePolicies');
  return await overtimePolicyRepository.listOvertimePolicies();
};

const updateOvertimePolicy = async (
  dayType: DayType,
  updateOvertimePolicyDto: UpdateOvertimePolicyDto,
): Promise<OvertimePolicy> => {
  Logger.log(`Updating overtime policy ${dayType}`, 'updateOvertimePolicy');
  validateUpdateOvertimePolicy(updateOvertimePolicyDto);

  const policy = await overtimePolicyRepository.getOneOvertimePolicy(dayType);
  if (!policy) {
    Logger.error(
      `Overtime policy ${dayType} not found`,
      'updateOvertimePolicy',
    );
    throw new NotFoundException('Regra de Hora Extra Não Encontrada');
  }

  const updated = await overtimePolicyRepository.updateOvertimePolicy(
    dayType,
    updateOvertimePolicyDto,
  );
  Logger.log(`Overtime policy ${dayType} updated`, 'updateOvertimePolicy');
  return updated;
};

const listHolidays = async (): Promise<Holiday[]> => {
  Logger.log(`Listing holidays`, 'listHolidays');
  return await overtimePolicyRepository.listHolidays();
};

const createHoliday = async (
  createHolidayDto: CreateHolidayDto,
): Promise<Holiday> => {
  Logger.log(`Creating holiday ${createHolidayDto.name}`, 'createHoliday');
  validateCreateHoliday(createHolidayDto);

  const date = dayjs(createHolidayDto.date).startOf('day').toDate();
  const existing = await overtimePolicyRepository.listHolidays();
  const alreadyExists = existing.some((holiday) =>
    dayjs(holiday.date).isSame(date, 'day'),
  );
  if (alreadyExists) {
    Logger.error(`Holiday already exists`, 'createHoliday');
    throw new ConflictException('Feriado já cadastrado para esta data');
  }

  const holiday = await overtimePolicyRepository.createHoliday({
    date,
    name: createHolidayDto.name,
  });
  Logger.log(`Holiday created`, 'createHoliday');
  return holiday;
};

const deleteHoliday = async (id: string): Promise<void> => {
  Logger.log(`Deleting holiday ${id}`, 'deleteHoliday');
  await overtimePolicyRepository.deleteHoliday(id);
  Logger.log(`Holiday deleted`, 'deleteHoliday');
};

// Usado pelo hourBalance/report para classificar os dias do período.
const getHolidayDateSet = async (): Promise<Set<string>> => {
  const holidays = await overtimePolicyRepository.listHolidays();
  return new Set(
    holidays.map((holiday) => dayjs(holiday.date).format('YYYY-MM-DD')),
  );
};

const overtimePolicyService = {
  listOvertimePolicies,
  updateOvertimePolicy,
  listHolidays,
  createHoliday,
  deleteHoliday,
  getHolidayDateSet,
};

export default overtimePolicyService;
