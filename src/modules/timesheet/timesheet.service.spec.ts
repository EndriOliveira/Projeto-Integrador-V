import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HazardType } from '@prisma/client';
import {
  buildPaidHours,
  buildUser,
  buildWorkDay,
} from '../../../test/factories';
import userRepository from '../user/user.repository';
import timesheetRepository from './timesheet.repository';
import timesheetService from './timesheet.service';

jest.mock('./timesheet.repository');
jest.mock('../user/user.repository');

const repo = jest.mocked(timesheetRepository);
const userRepo = jest.mocked(userRepository);

describe('timesheetService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    userRepo.getOneUser.mockResolvedValue(buildUser());
    repo.getOnePaidHours.mockResolvedValue(null);
  });

  describe('listWorkDays', () => {
    it('deve buscar os apontamentos do ciclo 21 a 20 do mês pedido', async () => {
      // Arrange
      repo.listWorkDays.mockResolvedValue([]);

      // Act
      await timesheetService.listWorkDays({
        userId: 'user-1',
        year: '2026',
        month: '10',
      } as never);

      // Assert
      expect(repo.listWorkDays).toHaveBeenCalledWith(
        'user-1',
        new Date('2026-09-21T00:00:00.000Z'),
        new Date('2026-10-20T00:00:00.000Z'),
      );
    });

    it('deve lançar BadRequest quando o mês é inválido', async () => {
      // Act / Assert
      await expect(
        timesheetService.listWorkDays({
          userId: 'user-1',
          year: '2026',
          month: '13',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('upsertWorkDay', () => {
    const body = {
      userId: 'user-1',
      date: '09/22/2026',
      client: 'Cliente X',
      project: '',
      hazardType: HazardType.ELETRICO,
    };

    it('deve salvar o apontamento no dia (UTC) e limpar textos vazios', async () => {
      // Arrange
      repo.upsertWorkDay.mockResolvedValue(buildWorkDay());

      // Act
      await timesheetService.upsertWorkDay(body);

      // Assert
      expect(repo.upsertWorkDay).toHaveBeenCalledWith(
        'user-1',
        new Date('2026-09-22T00:00:00.000Z'),
        expect.objectContaining({
          client: 'Cliente X',
          project: null,
          hazardType: HazardType.ELETRICO,
        }),
      );
    });

    it('deve lançar NotFound quando o funcionário não existe', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(timesheetService.upsertWorkDay(body)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequest quando o mês de ciclo do dia está bloqueado', async () => {
      // Arrange
      repo.getOnePaidHours.mockResolvedValue(buildPaidHours({ locked: true }));

      // Act / Assert
      await expect(timesheetService.upsertWorkDay(body)).rejects.toThrow(
        'Mês bloqueado para edição',
      );
      expect(repo.getOnePaidHours).toHaveBeenCalledWith('user-1', 2026, 10);
      expect(repo.upsertWorkDay).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando a data não está em MM/DD/YYYY', async () => {
      // Act / Assert
      await expect(
        timesheetService.upsertWorkDay({ ...body, date: '2026-09-22' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('upsertPaidHours', () => {
    const body = {
      userId: 'user-1',
      year: 2026,
      month: 10,
      paid60Minutes: 120,
      paid70Minutes: 0,
      paid100Minutes: 60,
      locked: false,
    };

    it('deve salvar as horas pagas quando o mês não está bloqueado', async () => {
      // Act
      await timesheetService.upsertPaidHours(body);

      // Assert
      expect(repo.upsertPaidHours).toHaveBeenCalledWith(body);
    });

    it('deve bloquear o mês quando locked é true', async () => {
      // Act
      await timesheetService.upsertPaidHours({ ...body, locked: true });

      // Assert
      expect(repo.upsertPaidHours).toHaveBeenCalledWith(
        expect.objectContaining({ locked: true }),
      );
    });

    it('deve lançar BadRequest quando tenta editar um mês bloqueado', async () => {
      // Arrange
      repo.getOnePaidHours.mockResolvedValue(buildPaidHours({ locked: true }));

      // Act / Assert
      await expect(
        timesheetService.upsertPaidHours({ ...body, locked: true }),
      ).rejects.toThrow('Mês bloqueado para edição');
      expect(repo.upsertPaidHours).not.toHaveBeenCalled();
    });

    it('deve só desbloquear, mantendo os valores congelados, quando o mês está bloqueado', async () => {
      // Arrange
      repo.getOnePaidHours.mockResolvedValue(
        buildPaidHours({ locked: true, paid60Minutes: 30, paid100Minutes: 10 }),
      );

      // Act
      await timesheetService.upsertPaidHours({ ...body, locked: false });

      // Assert
      expect(repo.upsertPaidHours).toHaveBeenCalledWith(
        expect.objectContaining({
          paid60Minutes: 30,
          paid100Minutes: 10,
          locked: false,
        }),
      );
    });

    it('deve lançar BadRequest quando os minutos são negativos', async () => {
      // Act / Assert
      await expect(
        timesheetService.upsertPaidHours({ ...body, paid60Minutes: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFound quando o funcionário não existe', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(timesheetService.upsertPaidHours(body)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listPaidHours', () => {
    it('deve converter o ano da query e listar as horas pagas', async () => {
      // Arrange
      repo.listPaidHours.mockResolvedValue([]);

      // Act
      await timesheetService.listPaidHours({
        userId: 'user-1',
        year: '2026',
      } as never);

      // Assert
      expect(repo.listPaidHours).toHaveBeenCalledWith('user-1', 2026);
    });
  });
});
