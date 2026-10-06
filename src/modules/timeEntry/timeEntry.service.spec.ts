import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalStatus,
  PunchType,
  Role,
} from '@prisma/client';
import {
  buildPaidHours,
  buildTimeEntry,
  buildUser,
} from '../../../test/factories';
import notificationService from '../notification/notification.service';
import timesheetRepository from '../timesheet/timesheet.repository';
import userRepository from '../user/user.repository';
import timeEntryRepository from './timeEntry.repository';
import timeEntryService from './timeEntry.service';
import { resolveAddressesInBackground } from './timeEntryLocation.service';

jest.mock('./timeEntry.repository');
jest.mock('../timesheet/timesheet.repository');
jest.mock('../user/user.repository');
jest.mock('../notification/notification.service');
// O endereço é resolvido em segundo plano (Nominatim): aqui só conferimos a chamada.
jest.mock('./timeEntryLocation.service');

const repo = jest.mocked(timeEntryRepository);
const timesheetRepo = jest.mocked(timesheetRepository);
const userRepo = jest.mocked(userRepository);

// "Agora" dos testes: sexta 25/09/2026, 12:00 BRT.
const NOW = new Date('2026-09-25T15:00:00.000Z');
const minutesFromNow = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60 * 1000).toISOString();
const daysAgo = (days: number) => minutesFromNow(-days * 24 * 60);

describe('timeEntryService', () => {
  const funcionario = buildUser({ id: 'func-1', role: Role.FUNCIONARIO });
  const outroFuncionario = buildUser({ id: 'func-2', role: Role.FUNCIONARIO });
  const gestor = buildUser({ id: 'gestor-1', role: Role.GESTOR });
  const rh = buildUser({ id: 'rh-1', role: Role.RH });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    repo.createTimeEntry.mockImplementation(async (data) =>
      buildTimeEntry({ id: 'created-1', ...data }),
    );
    repo.updateTimeEntry.mockImplementation(async (id, data) =>
      buildTimeEntry({ id, ...(data as object) }),
    );
    timesheetRepo.getOnePaidHours.mockResolvedValue(null);
    // Pedidos do funcionário notificam o RH e o gestor (timeEntryApproval).
    userRepo.getUsers.mockResolvedValue({ users: [rh] } as any);
    jest.mocked(notificationService).notifyUsers.mockResolvedValue(undefined);
  });

  afterEach(() => jest.useRealTimers());

  describe('getDayBounds', () => {
    it('deve delimitar o dia BRT em UTC (03:00 até 02:59:59.999 do dia seguinte)', () => {
      // Arrange: 23:00 BRT de 24/09 = 02:00 UTC de 25/09.
      const reference = new Date('2026-09-25T02:00:00.000Z');

      // Act
      const { start, end } = timeEntryService.getDayBounds(reference);

      // Assert
      expect(start.toISOString()).toBe('2026-09-24T03:00:00.000Z');
      expect(end.toISOString()).toBe('2026-09-25T02:59:59.999Z');
    });
  });

  describe('getNextExpectedType', () => {
    it.each([
      [0, PunchType.ENTRADA],
      [1, PunchType.INTERVALO_ENTRADA],
      [2, PunchType.INTERVALO_SAIDA],
      [3, PunchType.SAIDA],
      [4, PunchType.ENTRADA],
    ])(
      'deve inferir o tipo pelo ciclo quando já há %i marcações no dia',
      async (count, expected) => {
        // Arrange
        repo.countTodayEntries.mockResolvedValue(count);

        // Act
        const type = await timeEntryService.getNextExpectedType('func-1', NOW);

        // Assert
        expect(type).toBe(expected);
      },
    );
  });

  describe('createTimeEntry', () => {
    it('deve criar a marcação com o tipo inferido e a localização quando o tipo é omitido', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(null);
      repo.countTodayEntries.mockResolvedValue(1);

      // Act
      await timeEntryService.createTimeEntry(funcionario, {
        deviceTimestamp: NOW.toISOString(),
        latitude: -23.5,
        longitude: -46.6,
        locationCapturedAt: NOW.toISOString(),
      });

      // Assert
      expect(repo.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: funcionario.id,
          type: PunchType.INTERVALO_ENTRADA,
          deviceTimestamp: NOW,
          originatedOffline: false,
          latitude: -23.5,
          longitude: -46.6,
          locationCapturedAt: NOW,
        }),
      );
    });

    it('deve pedir o endereço da localização em segundo plano depois de criar', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(null);

      // Act
      const created = await timeEntryService.createTimeEntry(funcionario, {
        type: PunchType.ENTRADA,
        latitude: -23.5,
        longitude: -46.6,
      });

      // Assert
      expect(resolveAddressesInBackground).toHaveBeenCalledWith([created]);
    });

    it('deve respeitar o tipo informado sem consultar o ciclo', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(null);

      // Act
      await timeEntryService.createTimeEntry(funcionario, {
        type: PunchType.SAIDA,
      });

      // Assert
      expect(repo.countTodayEntries).not.toHaveBeenCalled();
      expect(repo.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PunchType.SAIDA,
          deviceTimestamp: NOW,
        }),
      );
    });

    it('deve devolver a marcação existente quando o clientGeneratedId já foi usado', async () => {
      // Arrange
      const existing = buildTimeEntry({ clientGeneratedId: 'repetido' });
      repo.getOneTimeEntry.mockResolvedValue(existing);

      // Act
      const result = await timeEntryService.createTimeEntry(funcionario, {
        clientGeneratedId: 'repetido',
      });

      // Assert
      expect(result).toBe(existing);
      expect(repo.createTimeEntry).not.toHaveBeenCalled();
    });

    it('deve aceitar horário do dispositivo até 5 minutos à frente', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(null);
      repo.countTodayEntries.mockResolvedValue(0);

      // Act / Assert
      await expect(
        timeEntryService.createTimeEntry(funcionario, {
          deviceTimestamp: minutesFromNow(4),
        }),
      ).resolves.toBeDefined();
    });

    it('deve lançar BadRequest quando o horário do dispositivo está mais de 5 minutos à frente', async () => {
      // Act / Assert
      await expect(
        timeEntryService.createTimeEntry(funcionario, {
          deviceTimestamp: minutesFromNow(10),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.createTimeEntry).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando o horário do dispositivo tem mais de 30 dias', async () => {
      // Act / Assert
      await expect(
        timeEntryService.createTimeEntry(funcionario, {
          deviceTimestamp: daysAgo(31),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequest quando a latitude é inválida', async () => {
      // Act / Assert
      await expect(
        timeEntryService.createTimeEntry(funcionario, {
          latitude: 91,
          longitude: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createManualTimeEntry', () => {
    const validBody = {
      type: PunchType.ENTRADA,
      deviceTimestamp: daysAgo(2),
      reason: 'Esqueci de bater a entrada',
    };

    it('deve criar a marcação do funcionário como pedido pendente e registrar a auditoria', async () => {
      // Act
      await timeEntryService.createManualTimeEntry(funcionario, validBody);

      // Assert
      expect(repo.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: funcionario.id,
          type: PunchType.ENTRADA,
          editedManually: true,
          originatedOffline: false,
          approvalStatus: ApprovalStatus.PENDING,
          pendingAction: ApprovalAction.CREATE,
        }),
      );
      expect(repo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          timeEntryId: 'created-1',
          changedByUserId: funcionario.id,
          action: 'CREATE_REQUEST',
          reason: validBody.reason,
        }),
      );
    });

    it('deve criar a marcação do gestor já aprovada, sem pedido', async () => {
      // Act
      await timeEntryService.createManualTimeEntry(gestor, validBody);

      // Assert
      expect(repo.createTimeEntry).toHaveBeenCalledWith(
        expect.not.objectContaining({ approvalStatus: ApprovalStatus.PENDING }),
      );
      expect(repo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE' }),
      );
    });

    it('deve lançar BadRequest quando o motivo não é informado', async () => {
      // Act / Assert
      await expect(
        timeEntryService.createManualTimeEntry(funcionario, {
          ...validBody,
          reason: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequest quando a marcação é de 40 dias atrás', async () => {
      // Act / Assert
      await expect(
        timeEntryService.createManualTimeEntry(funcionario, {
          ...validBody,
          deviceTimestamp: daysAgo(40),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequest quando a marcação é no futuro', async () => {
      // Act / Assert
      await expect(
        timeEntryService.createManualTimeEntry(funcionario, {
          ...validBody,
          deviceTimestamp: minutesFromNow(60),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequest quando o mês da marcação está bloqueado pelo RH', async () => {
      // Arrange
      timesheetRepo.getOnePaidHours.mockResolvedValue(
        buildPaidHours({ locked: true }),
      );

      // Act / Assert
      await expect(
        timeEntryService.createManualTimeEntry(funcionario, validBody),
      ).rejects.toThrow('Mês bloqueado pelo RH');
      expect(repo.createTimeEntry).not.toHaveBeenCalled();
    });

    it('deve consultar o bloqueio no ciclo da folha da data da marcação', async () => {
      // Arrange: 23/09 pertence ao ciclo SET/OUT (month = 10).
      const body = {
        ...validBody,
        deviceTimestamp: '2026-09-23T12:00:00.000Z',
      };

      // Act
      await timeEntryService.createManualTimeEntry(funcionario, body);

      // Assert
      expect(timesheetRepo.getOnePaidHours).toHaveBeenCalledWith(
        funcionario.id,
        2026,
        10,
      );
    });
  });

  describe('syncTimeEntries', () => {
    it('deve criar as novas, marcar as repetidas e reportar erro nas inválidas', async () => {
      // Arrange
      repo.getManyByClientGeneratedIds.mockResolvedValue([
        buildTimeEntry({ id: 'ja-existe', clientGeneratedId: 'dup' }),
      ]);

      // Act
      const { results } = await timeEntryService.syncTimeEntries(funcionario, {
        entries: [
          {
            clientGeneratedId: 'novo',
            type: PunchType.ENTRADA,
            deviceTimestamp: daysAgo(1),
          },
          {
            clientGeneratedId: 'dup',
            type: PunchType.SAIDA,
            deviceTimestamp: daysAgo(1),
          },
          {
            clientGeneratedId: 'velho',
            type: PunchType.SAIDA,
            deviceTimestamp: daysAgo(31),
          },
        ],
      });

      // Assert
      expect(results).toEqual([
        { clientGeneratedId: 'novo', status: 'created', id: 'created-1' },
        { clientGeneratedId: 'dup', status: 'duplicate', id: 'ja-existe' },
        expect.objectContaining({
          clientGeneratedId: 'velho',
          status: 'error',
        }),
      ]);
      expect(repo.createTimeEntry).toHaveBeenCalledTimes(1);
      expect(repo.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          clientGeneratedId: 'novo',
          type: PunchType.ENTRADA,
          originatedOffline: true,
        }),
      );
    });

    it('deve lançar BadRequest quando a lista está vazia', async () => {
      // Act / Assert
      await expect(
        timeEntryService.syncTimeEntries(funcionario, { entries: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequest quando um item não tem o tipo', async () => {
      // Act / Assert
      await expect(
        timeEntryService.syncTimeEntries(funcionario, {
          entries: [
            { clientGeneratedId: 'x', deviceTimestamp: daysAgo(1) } as never,
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listTimeEntries', () => {
    const query = { page: '1', limit: '10' } as never;
    const emptyPage = { timeEntries: [], total: 0, page: 1, pages: 0 } as never;

    beforeEach(() => repo.listTimeEntries.mockResolvedValue(emptyPage));

    it('deve listar tudo quando o RH não filtra por funcionário', async () => {
      // Act
      await timeEntryService.listTimeEntries(rh, query);

      // Assert
      expect(repo.listTimeEntries).toHaveBeenCalledWith(undefined, query);
    });

    it('deve pedir em segundo plano o endereço das marcações listadas', async () => {
      // Arrange
      const entries = [buildTimeEntry({ latitude: -23.5, longitude: -46.6 })];
      repo.listTimeEntries.mockResolvedValue({
        timeEntries: entries,
        total: 1,
        page: 1,
        pages: 1,
      });

      // Act
      await timeEntryService.listTimeEntries(rh, query);

      // Assert
      expect(resolveAddressesInBackground).toHaveBeenCalledWith(entries);
    });

    it('deve listar a equipe e o próprio gestor quando o gestor não filtra', async () => {
      // Arrange
      userRepo.getUsers.mockResolvedValue({
        users: [buildUser({ id: 'func-1' }), buildUser({ id: 'func-3' })],
      } as never);

      // Act
      await timeEntryService.listTimeEntries(gestor, query);

      // Assert
      expect(userRepo.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ managerId: gestor.id }),
      );
      expect(repo.listTimeEntries).toHaveBeenCalledWith(
        ['func-1', 'func-3', gestor.id],
        query,
      );
    });

    it('deve listar só as próprias quando o funcionário não filtra', async () => {
      // Act
      await timeEntryService.listTimeEntries(funcionario, query);

      // Assert
      expect(repo.listTimeEntries).toHaveBeenCalledWith(funcionario.id, query);
    });

    it('deve lançar Forbidden quando o funcionário filtra por outro funcionário', async () => {
      // Act / Assert
      await expect(
        timeEntryService.listTimeEntries(funcionario, {
          page: '1',
          limit: '10',
          userId: outroFuncionario.id,
        } as never),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.listTimeEntries).not.toHaveBeenCalled();
    });
  });

  describe('updateTimeEntry', () => {
    const ownEntry = buildTimeEntry({
      id: 'entry-1',
      userId: funcionario.id,
      deviceTimestamp: new Date(daysAgo(1)),
    });
    const reason = 'Horário registrado errado';

    it('deve transformar a alteração do funcionário em pedido pendente', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(ownEntry);
      const newTimestamp = daysAgo(1);

      // Act
      await timeEntryService.updateTimeEntry('entry-1', funcionario, {
        deviceTimestamp: newTimestamp,
        reason,
      });

      // Assert
      expect(repo.updateTimeEntry).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({
          approvalStatus: ApprovalStatus.PENDING,
          pendingAction: ApprovalAction.UPDATE,
          pendingDeviceTimestamp: new Date(newTimestamp),
        }),
      );
      expect(repo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_REQUEST',
          changedByUserId: funcionario.id,
          previousData: ownEntry,
          reason,
        }),
      );
    });

    it('deve lançar NotFound quando a marcação não existe ou foi excluída', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(null);

      // Act / Assert
      await expect(
        timeEntryService.updateTimeEntry('x', funcionario, { reason }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar Forbidden quando o funcionário altera marcação de outro', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue({
        ...ownEntry,
        userId: outroFuncionario.id,
      });

      // Act / Assert
      await expect(
        timeEntryService.updateTimeEntry('entry-1', funcionario, { reason }),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.updateTimeEntry).not.toHaveBeenCalled();
    });

    it('deve lançar Forbidden quando o gestor altera marcação de alguém da equipe', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(ownEntry);

      // Act / Assert
      await expect(
        timeEntryService.updateTimeEntry('entry-1', gestor, { reason }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir ao RH alterar marcação antiga de outro funcionário', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue({
        ...ownEntry,
        deviceTimestamp: new Date(daysAgo(45)),
      });

      // Act
      await timeEntryService.updateTimeEntry('entry-1', rh, {
        deviceTimestamp: daysAgo(44),
        reason,
      });

      // Assert
      expect(repo.updateTimeEntry).toHaveBeenCalled();
    });

    it('deve descartar o endereço antigo quando o RH muda as coordenadas', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue({
        ...ownEntry,
        latitude: -23.5,
        longitude: -46.6,
        locationAddress: 'Endereço antigo',
      });

      // Act
      const updated = await timeEntryService.updateTimeEntry('entry-1', rh, {
        latitude: -22.9,
        longitude: -43.2,
        reason,
      });

      // Assert
      expect(repo.updateTimeEntry).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ latitude: -22.9, locationAddress: null }),
      );
      expect(resolveAddressesInBackground).toHaveBeenCalledWith([updated]);
    });

    it('deve manter o endereço quando o RH não muda as coordenadas', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(ownEntry);

      // Act
      await timeEntryService.updateTimeEntry('entry-1', rh, {
        deviceTimestamp: daysAgo(1),
        reason,
      });

      // Assert
      expect(repo.updateTimeEntry).toHaveBeenCalledWith(
        'entry-1',
        expect.not.objectContaining({ locationAddress: null }),
      );
      expect(resolveAddressesInBackground).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando o funcionário altera marcação com mais de 30 dias', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue({
        ...ownEntry,
        deviceTimestamp: new Date(daysAgo(31)),
      });

      // Act / Assert
      await expect(
        timeEntryService.updateTimeEntry('entry-1', funcionario, { reason }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequest quando o mês da marcação está bloqueado', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(ownEntry);
      timesheetRepo.getOnePaidHours.mockResolvedValue(
        buildPaidHours({ locked: true }),
      );

      // Act / Assert
      await expect(
        timeEntryService.updateTimeEntry('entry-1', funcionario, { reason }),
      ).rejects.toThrow('Mês bloqueado pelo RH');
    });

    it('deve lançar BadRequest quando o novo horário cai num mês bloqueado', async () => {
      // Arrange: marcação no ciclo aberto (SET/OUT), novo horário no ciclo AGO/SET bloqueado.
      repo.getOneTimeEntry.mockResolvedValue({
        ...ownEntry,
        deviceTimestamp: new Date('2026-09-22T12:00:00.000Z'),
      });
      timesheetRepo.getOnePaidHours.mockImplementation(async (_, __, month) =>
        month === 9 ? buildPaidHours({ month: 9, locked: true }) : null,
      );

      // Act / Assert
      await expect(
        timeEntryService.updateTimeEntry('entry-1', funcionario, {
          deviceTimestamp: '2026-09-18T12:00:00.000Z',
          reason,
        }),
      ).rejects.toThrow('Mês bloqueado pelo RH');
    });

    it('deve lançar BadRequest quando o motivo não é informado', async () => {
      // Act / Assert
      await expect(
        timeEntryService.updateTimeEntry('entry-1', funcionario, {} as never),
      ).rejects.toThrow(BadRequestException);
      expect(repo.getOneTimeEntry).not.toHaveBeenCalled();
    });
  });

  describe('deleteTimeEntry', () => {
    const ownEntry = buildTimeEntry({
      id: 'entry-1',
      userId: funcionario.id,
      deviceTimestamp: new Date(daysAgo(1)),
    });
    const reason = 'Marcação duplicada';

    it('deve transformar a exclusão do funcionário em pedido pendente', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(ownEntry);

      // Act
      await timeEntryService.deleteTimeEntry('entry-1', funcionario, {
        reason,
      });

      // Assert
      expect(repo.updateTimeEntry).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({
          approvalStatus: ApprovalStatus.PENDING,
          pendingAction: ApprovalAction.DELETE,
        }),
      );
      expect(repo.updateTimeEntry).not.toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ deletedAt: NOW }),
      );
      expect(repo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE_REQUEST',
          previousData: ownEntry,
          reason,
        }),
      );
    });

    it('deve lançar Forbidden quando o funcionário exclui marcação de outro', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue({
        ...ownEntry,
        userId: outroFuncionario.id,
      });

      // Act / Assert
      await expect(
        timeEntryService.deleteTimeEntry('entry-1', funcionario, { reason }),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.updateTimeEntry).not.toHaveBeenCalled();
    });

    it('deve lançar NotFound quando a marcação não existe', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(null);

      // Act / Assert
      await expect(
        timeEntryService.deleteTimeEntry('x', funcionario, { reason }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequest quando o mês está bloqueado', async () => {
      // Arrange
      repo.getOneTimeEntry.mockResolvedValue(ownEntry);
      timesheetRepo.getOnePaidHours.mockResolvedValue(
        buildPaidHours({ locked: true }),
      );

      // Act / Assert
      await expect(
        timeEntryService.deleteTimeEntry('entry-1', funcionario, { reason }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequest quando o motivo é curto demais', async () => {
      // Act / Assert
      await expect(
        timeEntryService.deleteTimeEntry('entry-1', funcionario, {
          reason: 'x',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
