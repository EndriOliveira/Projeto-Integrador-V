import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalStatus,
  Prisma,
  PunchType,
  Role,
  TimeEntry,
  User,
} from '@prisma/client';
import notificationService, {
  NotificationType,
} from '../notification/notification.service';
import userRepository from '../user/user.repository';
import { ReviewTimeEntryDto } from './dto/request/reviewTimeEntry.dto';
import { PendingTimeEntryResponseDto } from './dto/response/pendingTimeEntry.response.dto';
import { TimeEntryResponseDto } from './dto/response/timeEntry.response.dto';
import { validateReviewTimeEntry } from './schemas/reviewTimeEntry.schema';
import timeEntryRepository from './timeEntry.repository';

// Regra: marcação manual, alteração e exclusão feitas pelo próprio FUNCIONÁRIO
// passam pelo gestor dele ou pelo RH. Gestor e RH continuam com efeito imediato.
export const requiresApproval = (user: User): boolean =>
  user.role === Role.FUNCIONARIO;

const PUNCH_LABELS: Record<PunchType, string> = {
  ENTRADA: 'Entrada',
  INTERVALO_ENTRADA: 'Início do intervalo',
  INTERVALO_SAIDA: 'Fim do intervalo',
  SAIDA: 'Saída',
};

// "30/09 às 08:00" no horário de Brasília (UTC-3), independente do fuso do servidor.
const formatBrt = (date: Date): string => {
  const iso = new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)} às ${iso.slice(11, 16)}`;
};

const describeRequest = (entry: TimeEntry): string => {
  const current = `${PUNCH_LABELS[entry.type]} de ${formatBrt(
    entry.deviceTimestamp,
  )}`;
  switch (entry.pendingAction) {
    case ApprovalAction.UPDATE:
      return `alterar ${current} para ${
        PUNCH_LABELS[entry.pendingType]
      } de ${formatBrt(entry.pendingDeviceTimestamp)}`;
    case ApprovalAction.DELETE:
      return `excluir ${current}`;
    default:
      return `incluir ${current}`;
  }
};

// Aprovadores de um funcionário: o gestor dele (se houver e estiver ativo) e todo o RH ativo.
const getApproverIds = async (employee: User): Promise<string[]> => {
  const rh = await userRepository.getUsers({
    role: Role.RH,
    active: true,
    page: 1,
    limit: 1000,
  } as any);
  const ids = rh.users.map((user) => user.id);

  if (employee.managerId) {
    const manager = await userRepository.getOneUser(
      { id: employee.managerId },
      ['id', 'active'],
    );
    if (manager?.active) ids.push(manager.id);
  }
  return ids.filter((id) => id !== employee.id);
};

// Chamado depois que a marcação foi gravada como PENDING.
const notifyApprovers = async (
  employee: User,
  entry: TimeEntry,
): Promise<void> => {
  const approverIds = await getApproverIds(employee);
  await notificationService.notifyUsers(approverIds, {
    type: NotificationType.APPROVAL_REQUESTED,
    title: 'Marcação aguardando aprovação',
    message: `${employee.name} pediu para ${describeRequest(entry)}.`,
    timeEntryId: entry.id,
  });
};

// Campos que zeram o pedido (usado ao decidir e quando o RH altera direto).
export const CLEARED_REQUEST = {
  pendingAction: null,
  pendingType: null,
  pendingDeviceTimestamp: null,
};

const assertCanReview = async (
  reviewer: User,
  entry: TimeEntry,
): Promise<void> => {
  if (entry.userId === reviewer.id) {
    throw new ForbiddenException('Você não pode aprovar as próprias marcações');
  }
  if (reviewer.role === Role.RH) return;
  if (reviewer.role === Role.GESTOR) {
    const employee = await userRepository.getOneUser({ id: entry.userId }, [
      'id',
      'managerId',
    ]);
    if (employee?.managerId === reviewer.id) return;
  }
  Logger.error(
    `User ${reviewer.id} cannot review entry ${entry.id}`,
    'assertCanReview',
  );
  throw new ForbiddenException(
    'Só o gestor do funcionário ou o RH podem aprovar esta marcação',
  );
};

// undefined = sem filtro (RH); lista = funcionários do gestor.
const getReviewScope = async (
  reviewer: User,
): Promise<string[] | undefined> => {
  if (reviewer.role === Role.RH) return undefined;
  const managed = await userRepository.getUsers({
    managerId: reviewer.id,
    page: 1,
    limit: 1000,
  } as any);
  return managed.users.map((user) => user.id);
};

const listPendingApprovals = async (
  reviewer: User,
): Promise<PendingTimeEntryResponseDto[]> => {
  Logger.log(`Listing pending approvals`, 'listPendingApprovals');
  const scope = await getReviewScope(reviewer);
  if (scope?.length === 0) return [];
  const entries = await timeEntryRepository.listPendingTimeEntries(scope);
  return entries.filter((entry) => entry.userId !== reviewer.id);
};

const countPendingApprovals = async (
  reviewer: User,
): Promise<{ count: number }> => {
  const scope = await getReviewScope(reviewer);
  if (scope?.length === 0) return { count: 0 };
  return { count: await timeEntryRepository.countPendingTimeEntries(scope) };
};

type AssertMonthNotLocked = (userId: string, date: Date) => Promise<void>;

const reviewTimeEntry = async (
  id: string,
  reviewer: User,
  reviewTimeEntryDto: ReviewTimeEntryDto,
  assertMonthNotLocked: AssertMonthNotLocked,
): Promise<TimeEntryResponseDto> => {
  Logger.log(`Reviewing time entry ${id}`, 'reviewTimeEntry');
  validateReviewTimeEntry(reviewTimeEntryDto);
  const { approved, note } = reviewTimeEntryDto;

  const entry = await timeEntryRepository.getOneTimeEntry({
    id,
    deletedAt: null,
  });
  if (!entry) throw new NotFoundException('Marcação Não Encontrada');
  if (entry.approvalStatus !== ApprovalStatus.PENDING) {
    throw new BadRequestException('Esta marcação já foi analisada');
  }
  await assertCanReview(reviewer, entry);
  await assertMonthNotLocked(entry.userId, entry.deviceTimestamp);

  const reviewed = {
    reviewedById: reviewer.id,
    reviewedAt: new Date(),
    reviewNote: note?.trim() || null,
  };
  let data: Prisma.TimeEntryUncheckedUpdateManyInput;
  if (!approved) {
    // Recusar inclusão invalida a marcação; recusar alteração/exclusão mantém a original.
    data = {
      ...CLEARED_REQUEST,
      ...reviewed,
      approvalStatus:
        entry.pendingAction === ApprovalAction.CREATE
          ? ApprovalStatus.REJECTED
          : ApprovalStatus.APPROVED,
    };
  } else if (entry.pendingAction === ApprovalAction.UPDATE) {
    await assertMonthNotLocked(entry.userId, entry.pendingDeviceTimestamp);
    data = {
      ...CLEARED_REQUEST,
      ...reviewed,
      approvalStatus: ApprovalStatus.APPROVED,
      type: entry.pendingType,
      deviceTimestamp: entry.pendingDeviceTimestamp,
      editedManually: true,
    };
  } else if (entry.pendingAction === ApprovalAction.DELETE) {
    data = {
      ...CLEARED_REQUEST,
      ...reviewed,
      approvalStatus: ApprovalStatus.APPROVED,
      deletedAt: new Date(),
    };
  } else {
    data = {
      ...CLEARED_REQUEST,
      ...reviewed,
      approvalStatus: ApprovalStatus.APPROVED,
    };
  }

  const updated = await timeEntryRepository.resolvePendingTimeEntry(id, data);
  if (!updated) {
    throw new BadRequestException('Esta marcação já foi analisada');
  }

  await timeEntryRepository.createAuditLog({
    timeEntryId: id,
    changedByUserId: reviewer.id,
    action: approved ? 'APPROVE' : 'REJECT',
    previousData: entry as unknown as Prisma.InputJsonValue,
    newData: updated as unknown as Prisma.InputJsonValue,
    reason: reviewed.reviewNote ?? undefined,
  });

  await notificationService.clearApprovalRequests(id);
  const request = describeRequest(entry);
  await notificationService.notifyUsers([entry.userId], {
    type: approved
      ? NotificationType.APPROVAL_APPROVED
      : NotificationType.APPROVAL_REJECTED,
    title: approved ? 'Marcação aprovada' : 'Marcação recusada',
    message: approved
      ? `${reviewer.name} aprovou seu pedido para ${request}.`
      : `${reviewer.name} recusou seu pedido para ${request}${
          reviewed.reviewNote ? `: ${reviewed.reviewNote}` : '.'
        }`,
    timeEntryId: id,
  });

  Logger.log(
    `Time entry ${id} ${approved ? 'approved' : 'rejected'}`,
    'reviewTimeEntry',
  );
  return updated;
};

const timeEntryApprovalService = {
  notifyApprovers,
  listPendingApprovals,
  countPendingApprovals,
  reviewTimeEntry,
};

export default timeEntryApprovalService;
