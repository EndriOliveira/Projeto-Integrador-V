import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PunchType, Role, TimeEntry, User } from '@prisma/client';
import * as dayjs from 'dayjs';
import { v4 as uuidV4 } from 'uuid';
import { assertCanAccessEmployee } from '../../shared/access-control';
import { getCycleOf } from '../../shared/payrollCycle';
import timesheetRepository from '../timesheet/timesheet.repository';
import { CreateManualTimeEntryDto } from './dto/request/createManualTimeEntry.dto';
import { validateCreateManualTimeEntry } from './schemas/createManualTimeEntry.schema';
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

// Dia BRT (UTC-3) da marcação, independente do fuso do servidor.
const brtDayKey = (date: Date): string =>
  new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

// Mês fechado pelo RH (Horas Pagas > Bloq. Mês) não aceita alterações de ponto.
const assertMonthNotLocked = async (
  userId: string,
  date: Date,
): Promise<void> => {
  const cycle = getCycleOf(brtDayKey(date));
  const paidHours = await timesheetRepository.getOnePaidHours(
    userId,
    cycle.year,
    cycle.month,
  );
  if (paidHours?.locked) {
    Logger.error(`Cycle ${cycle.month}/${cycle.year} locked`, 'timeEntry');
    throw new BadRequestException(
      'Mês bloqueado pelo RH: peça ao RH para ajustar esta marcação',
    );
  }
};

// RH altera qualquer marcação; os demais só as próprias e dentro da janela
// de PAST_TOLERANCE_DAYS (a mesma aceita para marcações retroativas).
const assertCanChangeEntry = (actingUser: User, entry: TimeEntry): void => {
  if (actingUser.role === Role.RH) return;
  if (entry.userId !== actingUser.id) {
    Logger.error(
      `User ${actingUser.id} cannot change entry ${entry.id}`,
      'assertCanChangeEntry',
    );
    throw new ForbiddenException('Você só pode alterar as próprias marcações');
  }
  if (dayjs().diff(dayjs(entry.deviceTimestamp), 'day') > PAST_TOLERANCE_DAYS) {
    throw new BadRequestException(
      `Só é possível alterar marcações dos últimos ${PAST_TOLERANCE_DAYS} dias. Procure o RH.`,
    );
  }
};

// Marcação manual: o próprio usuário registra um ponto esquecido informando
// tipo, horário e motivo. Fica marcada como editedManually e vai para a auditoria.
const createManualTimeEntry = async (
  user: User,
  createManualTimeEntryDto: CreateManualTimeEntryDto,
): Promise<TimeEntryResponseDto> => {
  Logger.log(
    `Creating manual time entry for user ${user.id}`,
    'createManualTimeEntry',
  );
  validateCreateManualTimeEntry(createManualTimeEntryDto);

  const deviceTimestamp = dayjs(
    createManualTimeEntryDto.deviceTimestamp,
  ).toDate();
  validateDeviceTimestamp(deviceTimestamp);
  await assertMonthNotLocked(user.id, deviceTimestamp);

  const created = await timeEntryRepository.createTimeEntry({
    userId: user.id,
    type: createManualTimeEntryDto.type,
    deviceTimestamp,
    clientGeneratedId: uuidV4(),
    originatedOffline: false,
    editedManually: true,
  });

  await timeEntryRepository.createAuditLog({
    timeEntryId: created.id,
    changedByUserId: user.id,
    action: 'CREATE',
    newData: created as unknown as Prisma.InputJsonValue,
    reason: createManualTimeEntryDto.reason,
  });
  Logger.log(
    `Manual time entry created for user ${user.id}`,
    'createManualTimeEntry',
  );
  return created;
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
  actingUser: User,
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
  assertCanChangeEntry(actingUser, entry);
  await assertMonthNotLocked(entry.userId, entry.deviceTimestamp);

  const { reason, deviceTimestamp, ...rest } = updateTimeEntryDto;
  if (deviceTimestamp) {
    const newTimestamp = dayjs(deviceTimestamp).toDate();
    if (actingUser.role !== Role.RH) validateDeviceTimestamp(newTimestamp);
    await assertMonthNotLocked(entry.userId, newTimestamp);
  }
  const updated = await timeEntryRepository.updateTimeEntry(id, {
    ...rest,
    deviceTimestamp: deviceTimestamp
      ? dayjs(deviceTimestamp).toDate()
      : undefined,
    editedManually: true,
  });

  await timeEntryRepository.createAuditLog({
    timeEntryId: id,
    changedByUserId: actingUser.id,
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
  actingUser: User,
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
  assertCanChangeEntry(actingUser, entry);
  await assertMonthNotLocked(entry.userId, entry.deviceTimestamp);

  await timeEntryRepository.updateTimeEntry(id, {
    deletedAt: new Date(),
    editedManually: true,
  });

  await timeEntryRepository.createAuditLog({
    timeEntryId: id,
    changedByUserId: actingUser.id,
    action: 'DELETE',
    previousData: entry as unknown as Prisma.InputJsonValue,
    reason: deleteTimeEntryDto.reason,
  });
  Logger.log(`Time entry ${id} deleted`, 'deleteTimeEntry');
};

const timeEntryService = {
  createTimeEntry,
  createManualTimeEntry,
  syncTimeEntries,
  listTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  getNextExpectedType,
  getDayBounds,
  PUNCH_CYCLE,
};

export default timeEntryService;
