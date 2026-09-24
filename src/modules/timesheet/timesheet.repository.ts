import { InternalServerErrorException, Logger } from '@nestjs/common';
import { HazardType, PaidHours, WorkDay } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';

const listWorkDays = async (
  userId: string,
  start: Date,
  end: Date,
): Promise<WorkDay[]> => {
  try {
    return await client.workDay.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  } catch (error) {
    Logger.error(error.message, 'listWorkDays');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const upsertWorkDay = async (
  userId: string,
  date: Date,
  data: {
    client?: string | null;
    project?: string | null;
    hazardType?: HazardType | null;
    rdoPending?: boolean;
  },
): Promise<WorkDay> => {
  try {
    return await client.workDay.upsert({
      where: { userId_date: { userId, date } },
      create: { id: uuidV4(), userId, date, ...data },
      update: data,
    });
  } catch (error) {
    Logger.error(error.message, 'upsertWorkDay');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const listPaidHours = async (
  userId: string,
  year: number,
): Promise<PaidHours[]> => {
  try {
    return await client.paidHours.findMany({
      where: { userId, year },
      orderBy: { month: 'asc' },
    });
  } catch (error) {
    Logger.error(error.message, 'listPaidHours');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getOnePaidHours = async (
  userId: string,
  year: number,
  month: number,
): Promise<PaidHours | null> => {
  try {
    return await client.paidHours.findUnique({
      where: { userId_year_month: { userId, year, month } },
    });
  } catch (error) {
    Logger.error(error.message, 'getOnePaidHours');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const upsertPaidHours = async (data: {
  userId: string;
  year: number;
  month: number;
  paid60Minutes: number;
  paid70Minutes: number;
  paid100Minutes: number;
  locked: boolean;
}): Promise<PaidHours> => {
  const { userId, year, month, ...values } = data;
  try {
    return await client.paidHours.upsert({
      where: { userId_year_month: { userId, year, month } },
      create: { id: uuidV4(), ...data },
      update: values,
    });
  } catch (error) {
    Logger.error(error.message, 'upsertPaidHours');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const timesheetRepository = {
  listWorkDays,
  upsertWorkDay,
  listPaidHours,
  getOnePaidHours,
  upsertPaidHours,
};

export default timesheetRepository;
