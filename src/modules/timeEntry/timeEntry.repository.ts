import { InternalServerErrorException, Logger } from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalStatus,
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
  approvalStatus?: ApprovalStatus;
  pendingAction?: ApprovalAction;
  requestReason?: string;
};

type CreateAuditLogData = {
  timeEntryId: string;
  changedByUserId: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'CREATE_REQUEST'
    | 'UPDATE_REQUEST'
    | 'DELETE_REQUEST'
    | 'APPROVE'
    | 'REJECT';
  previousData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  reason?: string;
};

// Marcações que valem para horas/relatório: some a rejeitada e a manual que
// ainda aguarda aprovação. Pedido de alteração/exclusão pendente continua
// valendo com o dado atual até ser aprovado.
const COUNTED_ENTRY_FILTER: Prisma.TimeEntryWhereInput = {
  deletedAt: null,
  NOT: [
    { approvalStatus: ApprovalStatus.REJECTED },
    {
      approvalStatus: ApprovalStatus.PENDING,
      pendingAction: ApprovalAction.CREATE,
    },
  ],
};

// Marcações do dia mostradas ao funcionário e usadas no ciclo do botão de ponto:
// inclui a manual pendente (ele já registrou), mas não a rejeitada.
const VISIBLE_TODAY_FILTER: Prisma.TimeEntryWhereInput = {
  deletedAt: null,
  approvalStatus: { not: ApprovalStatus.REJECTED },
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
        ...VISIBLE_TODAY_FILTER,
        userId,
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
        ...VISIBLE_TODAY_FILTER,
        userId,
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
        ...COUNTED_ENTRY_FILTER,
        userId,
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

// Só aplica se a marcação ainda estiver pendente: se dois aprovadores
// decidirem ao mesmo tempo, o segundo recebe null em vez de sobrescrever.
const resolvePendingTimeEntry = async (
  id: string,
  data: Prisma.TimeEntryUncheckedUpdateManyInput,
): Promise<TimeEntry | null> => {
  try {
    const { count } = await client.timeEntry.updateMany({
      where: { id, approvalStatus: ApprovalStatus.PENDING, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return await client.timeEntry.findUnique({ where: { id } });
  } catch (error) {
    Logger.error(error.message, 'resolvePendingTimeEntry');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

// Fila de aprovação: undefined = todos (RH); lista = equipe do gestor.
const listPendingTimeEntries = async (userIdFilter: string[] | undefined) => {
  try {
    return await client.timeEntry.findMany({
      where: {
        deletedAt: null,
        approvalStatus: ApprovalStatus.PENDING,
        userId: userIdFilter ? { in: userIdFilter } : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });
  } catch (error) {
    Logger.error(error.message, 'listPendingTimeEntries');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const countPendingTimeEntries = async (
  userIdFilter: string[] | undefined,
): Promise<number> => {
  try {
    return await client.timeEntry.count({
      where: {
        deletedAt: null,
        approvalStatus: ApprovalStatus.PENDING,
        userId: userIdFilter ? { in: userIdFilter } : undefined,
      },
    });
  } catch (error) {
    Logger.error(error.message, 'countPendingTimeEntries');
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
  resolvePendingTimeEntry,
  listPendingTimeEntries,
  countPendingTimeEntries,
  createAuditLog,
};

export default timeEntryRepository;
