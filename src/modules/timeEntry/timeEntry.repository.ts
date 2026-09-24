import { InternalServerErrorException, Logger } from '@nestjs/common';
import {
  Prisma,
  PunchType,
  TimeEntry,
  TimeEntryAuditLog,
} from '@prisma/client';
import * as dayjs from 'dayjs';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';
import { totalPages } from '../../utils/totalPages';
import { FindTimeEntriesQueryDto } from './dto/request/findTimeEntriesQuery.dto';
import { FindTimeEntriesResponseDto } from './dto/response/findTimeEntries.response.dto';

type CreateTimeEntryData = {
  userId: string;
  type: PunchType;
  deviceTimestamp: Date;
  clientGeneratedId: string;
  originatedOffline: boolean;
  latitude?: number;
  longitude?: number;
  locationCapturedAt?: Date;
  editedManually?: boolean;
};

type CreateAuditLogData = {
  timeEntryId: string;
  changedByUserId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  previousData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  reason?: string;
};

const createTimeEntry = async (
  data: CreateTimeEntryData,
): Promise<TimeEntry> => {
  try {
    return await client.timeEntry.create({
      data: { id: uuidV4(), ...data },
    });
  } catch (error) {
    Logger.error(error.message, 'createTimeEntry');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getOneTimeEntry = async (
  where: Prisma.TimeEntryWhereInput,
): Promise<TimeEntry | null> => {
  try {
    return await client.timeEntry.findFirst({ where });
  } catch (error) {
    Logger.error(error.message, 'getOneTimeEntry');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getManyByClientGeneratedIds = async (
  clientGeneratedIds: string[],
): Promise<TimeEntry[]> => {
  try {
    return await client.timeEntry.findMany({
      where: { clientGeneratedId: { in: clientGeneratedIds } },
    });
  } catch (error) {
    Logger.error(error.message, 'getManyByClientGeneratedIds');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const countTodayEntries = async (
  userId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<number> => {
  try {
    return await client.timeEntry.count({
      where: {
        userId,
        deletedAt: null,
        deviceTimestamp: { gte: dayStart, lte: dayEnd },
      },
    });
  } catch (error) {
    Logger.error(error.message, 'countTodayEntries');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getEntriesInRange = async (
  userId: string,
  start: Date,
  end: Date,
): Promise<TimeEntry[]> => {
  try {
    return await client.timeEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        deviceTimestamp: { gte: start, lte: end },
      },
      orderBy: { deviceTimestamp: 'asc' },
    });
  } catch (error) {
    Logger.error(error.message, 'getEntriesInRange');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

// Retorna todo o histórico (sem paginação) de um funcionário até uma data,
// usado pelo cálculo de banco de horas, que precisa varrer desde o início
// para chegar a um saldo de banco correto. Escala adequada ao MVP.
const getEntriesForUser = async (
  userId: string,
  upToDate?: Date,
): Promise<TimeEntry[]> => {
  try {
    return await client.timeEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        deviceTimestamp: upToDate ? { lte: upToDate } : undefined,
      },
      orderBy: { deviceTimestamp: 'asc' },
    });
  } catch (error) {
    Logger.error(error.message, 'getEntriesForUser');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const updateTimeEntry = async (
  id: string,
  data: Prisma.TimeEntryUpdateInput,
): Promise<TimeEntry> => {
  try {
    return await client.timeEntry.update({ where: { id }, data });
  } catch (error) {
    Logger.error(error.message, 'updateTimeEntry');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const listTimeEntries = async (
  userIdFilter: string | string[] | undefined,
  query: FindTimeEntriesQueryDto,
): Promise<FindTimeEntriesResponseDto> => {
  let { limit, page } = query;
  const { rangeStart, rangeEnd, type, sortType } = query;
  limit = Number(limit) || 10;
  page = Number(page) || 1;

  const deviceTimestampFilter: Prisma.DateTimeFilter = {};
  if (rangeStart)
    deviceTimestampFilter.gte = dayjs(rangeStart).subtract(3, 'hours').toDate();
  if (rangeEnd)
    deviceTimestampFilter.lte = dayjs(rangeEnd).add(21, 'hours').toDate();

  const where: Prisma.TimeEntryWhereInput = {
    deletedAt: null,
    type: type || undefined,
    deviceTimestamp: Object.keys(deviceTimestampFilter).length
      ? deviceTimestampFilter
      : undefined,
    userId: Array.isArray(userIdFilter)
      ? { in: userIdFilter }
      : userIdFilter || undefined,
  };

  try {
    const [timeEntries, count] = await client.$transaction([
      client.timeEntry.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          deviceTimestamp: (sortType as Prisma.SortOrder) || 'desc',
        },
      }),
      client.timeEntry.count({ where }),
    ]);

    return {
      timeEntries,
      total: Number(count),
      page: Number(page),
      pages: Number(totalPages(count, limit)),
    };
  } catch (error) {
    Logger.error(error.message, 'listTimeEntries');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const createAuditLog = async (
  data: CreateAuditLogData,
): Promise<TimeEntryAuditLog> => {
  try {
    return await client.timeEntryAuditLog.create({
      data: { id: uuidV4(), ...data },
    });
  } catch (error) {
    Logger.error(error.message, 'createAuditLog');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const timeEntryRepository = {
  createTimeEntry,
  getOneTimeEntry,
  getManyByClientGeneratedIds,
  countTodayEntries,
  getEntriesInRange,
  getEntriesForUser,
  updateTimeEntry,
  listTimeEntries,
  createAuditLog,
};

export default timeEntryRepository;
