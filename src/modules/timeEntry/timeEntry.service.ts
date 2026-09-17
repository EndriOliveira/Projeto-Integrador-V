import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PunchType, Role, User } from '@prisma/client';
import * as dayjs from 'dayjs';
import { v4 as uuidV4 } from 'uuid';
import { assertCanAccessEmployee } from '../../shared/access-control';
import userRepository from '../user/user.repository';
import { CreateTimeEntryDto } from './dto/request/createTimeEntry.dto';
import { DeleteTimeEntryDto } from './dto/request/deleteTimeEntry.dto';
import { FindTimeEntriesQueryDto } from './dto/request/findTimeEntriesQuery.dto';
import { SyncTimeEntriesDto } from './dto/request/syncTimeEntries.dto';
import { UpdateTimeEntryDto } from './dto/request/updateTimeEntry.dto';
import { FindTimeEntriesResponseDto } from './dto/response/findTimeEntries.response.dto';
import {
  SyncTimeEntriesResponseDto,
  SyncTimeEntryResultDto,
} from './dto/response/syncTimeEntries.response.dto';
import { TimeEntryResponseDto } from './dto/response/timeEntry.response.dto';
import { validateCreateTimeEntry } from './schemas/createTimeEntry.schema';
import { validateDeleteTimeEntry } from './schemas/deleteTimeEntry.schema';
import { validateFindTimeEntries } from './schemas/findTimeEntries.schema';
import { validateSyncTimeEntries } from './schemas/syncTimeEntries.schema';
import { validateUpdateTimeEntry } from './schemas/updateTimeEntry.schema';
import timeEntryRepository from './timeEntry.repository';

const PUNCH_CYCLE: PunchType[] = [
  PunchType.ENTRADA,
  PunchType.INTERVALO_ENTRADA,
  PunchType.INTERVALO_SAIDA,
  PunchType.SAIDA,
];
const FUTURE_TOLERANCE_MINUTES = 5;
const PAST_TOLERANCE_DAYS = 30;

// Mesma convenção "ad-hoc BRT" (UTC-3) já usada no restante do código
// (ver schedule.service original) para delimitar o dia da marcação.
const getDayBounds = (referenceDate: Date): { start: Date; end: Date } => {
  const shifted = dayjs(referenceDate).subtract(3, 'hours');
  return {
    start: shifted.startOf('day').add(3, 'hours').toDate(),
    end: shifted.endOf('day').add(3, 'hours').toDate(),
  };
};

const getNextExpectedType = async (
  userId: string,
  referenceDate: Date,
): Promise<PunchType> => {
  const { start, end } = getDayBounds(referenceDate);
  const count = await timeEntryRepository.countTodayEntries(userId, start, end);
  return PUNCH_CYCLE[count % PUNCH_CYCLE.length];
};

// Estratégia deliberadamente simples de validação de divergência entre
// horário do dispositivo e do servidor (a proposta deixa a estratégia
// definitiva em aberto para a implementação).
const validateDeviceTimestamp = (deviceTimestamp: Date): void => {
  const now = dayjs();
  if (dayjs(deviceTimestamp).diff(now, 'minute') > FUTURE_TOLERANCE_MINUTES) {
    Logger.error(
      `Device timestamp too far in the future`,
      'validateDeviceTimestamp',
    );
    throw new BadRequestException(
      'Horário do dispositivo está muito à frente do horário do servidor',
    );
  }
  if (now.diff(dayjs(deviceTimestamp), 'day') > PAST_TOLERANCE_DAYS) {
    Logger.error(`Device timestamp too old`, 'validateDeviceTimestamp');
    throw new BadRequestException(
      'Horário do dispositivo está muito atrasado em relação ao horário do servidor',
    );
  }
};

const createTimeEntry = async (
  user: User,
  createTimeEntryDto: CreateTimeEntryDto,
): Promise<TimeEntryResponseDto> => {
  Logger.log(`Creating time entry for user ${user.id}`, 'createTimeEntry');
  validateCreateTimeEntry(createTimeEntryDto);

  const deviceTimestamp = createTimeEntryDto.deviceTimestamp
    ? dayjs(createTimeEntryDto.deviceTimestamp).toDate()
    : new Date();
  validateDeviceTimestamp(deviceTimestamp);

  const clientGeneratedId = createTimeEntryDto.clientGeneratedId || uuidV4();
  const existing = await timeEntryRepository.getOneTimeEntry({
    clientGeneratedId,
  });
  if (existing) {
    Logger.log(`Time entry already exists, returning it`, 'createTimeEntry');
    return existing;
  }

  const type =
    createTimeEntryDto.type ||
    (await getNextExpectedType(user.id, deviceTimestamp));

  const created = await timeEntryRepository.createTimeEntry({
    userId: user.id,
    type,
    deviceTimestamp,
    clientGeneratedId,
    originatedOffline: false,
    latitude: createTimeEntryDto.latitude,
    longitude: createTimeEntryDto.longitude,
    locationCapturedAt: createTimeEntryDto.locationCapturedAt
      ? dayjs(createTimeEntryDto.locationCapturedAt).toDate()
      : undefined,
  });
  Logger.log(`Time entry created for user ${user.id}`, 'createTimeEntry');
  return created;
};

const syncTimeEntries = async (
  user: User,
  syncTimeEntriesDto: SyncTimeEntriesDto,
): Promise<SyncTimeEntriesResponseDto> => {
  Logger.log(`Syncing time entries for user ${user.id}`, 'syncTimeEntries');
  validateSyncTimeEntries(syncTimeEntriesDto);

  const clientGeneratedIds = syncTimeEntriesDto.entries.map(
    (entry) => entry.clientGeneratedId,
  );
  const existingEntries = await timeEntryRepository.getManyByClientGeneratedIds(
    clientGeneratedIds,
  );
  const existingByClientId = new Map(
    existingEntries.map((entry) => [entry.clientGeneratedId, entry]),
  );

  const results: SyncTimeEntryResultDto[] = [];
  for (const entry of syncTimeEntriesDto.entries) {
    const existing = existingByClientId.get(entry.clientGeneratedId);
    if (existing) {
      results.push({
        clientGeneratedId: entry.clientGeneratedId,
        status: 'duplicate',
        id: existing.id,
      });
      continue;
    }

    try {
      const deviceTimestamp = dayjs(entry.deviceTimestamp).toDate();
      validateDeviceTimestamp(deviceTimestamp);

      const created = await timeEntryRepository.createTimeEntry({
        userId: user.id,
        type: entry.type,
        deviceTimestamp,
        clientGeneratedId: entry.clientGeneratedId,
        originatedOffline: true,
        latitude: entry.latitude,
        longitude: entry.longitude,
        locationCapturedAt: entry.locationCapturedAt
          ? dayjs(entry.locationCapturedAt).toDate()
          : undefined,
      });
      results.push({
        clientGeneratedId: entry.clientGeneratedId,
        status: 'created',
        id: created.id,
      });
    } catch (error) {
      Logger.error(error.message, 'syncTimeEntries');
      results.push({
        clientGeneratedId: entry.clientGeneratedId,
        status: 'error',
        message: error.message,
      });
    }
  }

  Logger.log(`Time entries synced for user ${user.id}`, 'syncTimeEntries');
  return { results };
};

const listTimeEntries = async (
  actingUser: User,
  query: FindTimeEntriesQueryDto,
): Promise<FindTimeEntriesResponseDto> => {
  Logger.log(`Listing time entries`, 'listTimeEntries');
  validateFindTimeEntries(query);

  if (query.userId) {
    await assertCanAccessEmployee(actingUser, query.userId);
    return await timeEntryRepository.listTimeEntries(query.userId, query);
  }

  if (actingUser.role === Role.RH) {
    return await timeEntryRepository.listTimeEntries(undefined, query);
  }

  if (actingUser.role === Role.GESTOR) {
    const managed = await userRepository.getUsers({
      managerId: actingUser.id,
      page: 1,
      limit: 1000,
    } as any);
    const managedIds = managed.users.map((managedUser) => managedUser.id);
    managedIds.push(actingUser.id);
    return await timeEntryRepository.listTimeEntries(managedIds, query);
  }

  return await timeEntryRepository.listTimeEntries(actingUser.id, query);
};

const updateTimeEntry = async (
  id: string,
  hrUser: User,
  updateTimeEntryDto: UpdateTimeEntryDto,
): Promise<TimeEntryResponseDto> => {
  Logger.log(`Updating time entry ${id}`, 'updateTimeEntry');
  validateUpdateTimeEntry(updateTimeEntryDto);

  const entry = await timeEntryRepository.getOneTimeEntry({
    id,
    deletedAt: null,
  });
  if (!entry) {
    Logger.error(`Time entry not found`, 'updateTimeEntry');
    throw new NotFoundException('Marcação Não Encontrada');
  }

  const { reason, deviceTimestamp, ...rest } = updateTimeEntryDto;
  const updated = await timeEntryRepository.updateTimeEntry(id, {
    ...rest,
    deviceTimestamp: deviceTimestamp
      ? dayjs(deviceTimestamp).toDate()
      : undefined,
    editedManually: true,
  });

  await timeEntryRepository.createAuditLog({
    timeEntryId: id,
    changedByUserId: hrUser.id,
    action: 'UPDATE',
    previousData: entry as unknown as Prisma.InputJsonValue,
    newData: updated as unknown as Prisma.InputJsonValue,
    reason,
  });

  Logger.log(`Time entry ${id} updated`, 'updateTimeEntry');
  return updated;
};

const deleteTimeEntry = async (
  id: string,
  hrUser: User,
  deleteTimeEntryDto: DeleteTimeEntryDto,
): Promise<void> => {
  Logger.log(`Deleting time entry ${id}`, 'deleteTimeEntry');
  validateDeleteTimeEntry(deleteTimeEntryDto);

  const entry = await timeEntryRepository.getOneTimeEntry({
    id,
    deletedAt: null,
  });
  if (!entry) {
    Logger.error(`Time entry not found`, 'deleteTimeEntry');
    throw new NotFoundException('Marcação Não Encontrada');
  }

  await timeEntryRepository.updateTimeEntry(id, {
    deletedAt: new Date(),
    editedManually: true,
  });

  await timeEntryRepository.createAuditLog({
    timeEntryId: id,
    changedByUserId: hrUser.id,
    action: 'DELETE',
    previousData: entry as unknown as Prisma.InputJsonValue,
    reason: deleteTimeEntryDto.reason,
  });
  Logger.log(`Time entry ${id} deleted`, 'deleteTimeEntry');
};

const timeEntryService = {
  createTimeEntry,
  syncTimeEntries,
  listTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  getNextExpectedType,
  getDayBounds,
  PUNCH_CYCLE,
};

export default timeEntryService;
