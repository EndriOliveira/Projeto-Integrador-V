import { InternalServerErrorException, Logger } from '@nestjs/common';
import { DayType, Holiday, OvertimePolicy } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';

const listOvertimePolicies = async (): Promise<OvertimePolicy[]> => {
  try {
    return await client.overtimePolicy.findMany({
      orderBy: { dayType: 'asc' },
    });
  } catch (error) {
    Logger.error(error.message, 'listOvertimePolicies');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getOneOvertimePolicy = async (
  dayType: DayType,
): Promise<OvertimePolicy | null> => {
  try {
    return await client.overtimePolicy.findUnique({ where: { dayType } });
  } catch (error) {
    Logger.error(error.message, 'getOneOvertimePolicy');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const updateOvertimePolicy = async (
  dayType: DayType,
  data: { percentage?: number; active?: boolean },
): Promise<OvertimePolicy> => {
  try {
    return await client.overtimePolicy.update({ where: { dayType }, data });
  } catch (error) {
    Logger.error(error.message, 'updateOvertimePolicy');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const listHolidays = async (): Promise<Holiday[]> => {
  try {
    return await client.holiday.findMany({ orderBy: { date: 'asc' } });
  } catch (error) {
    Logger.error(error.message, 'listHolidays');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const createHoliday = async (data: {
  date: Date;
  name: string;
}): Promise<Holiday> => {
  try {
    return await client.holiday.create({ data: { id: uuidV4(), ...data } });
  } catch (error) {
    Logger.error(error.message, 'createHoliday');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const deleteHoliday = async (id: string): Promise<void> => {
  try {
    await client.holiday.delete({ where: { id } });
  } catch (error) {
    Logger.error(error.message, 'deleteHoliday');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const overtimePolicyRepository = {
  listOvertimePolicies,
  getOneOvertimePolicy,
  updateOvertimePolicy,
  listHolidays,
  createHoliday,
  deleteHoliday,
};

export default overtimePolicyRepository;
