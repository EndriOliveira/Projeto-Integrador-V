import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { buildUser, fullDay } from '../../../test/factories';
import overtimePolicyService from '../overtimePolicy/overtimePolicy.service';
import timeEntryRepository from '../timeEntry/timeEntry.repository';
import timesheetRepository from '../timesheet/timesheet.repository';
import userRepository from '../user/user.repository';
import hourBalanceService from './hourBalance.service';

jest.mock('../timeEntry/timeEntry.repository');
jest.mock('../user/user.repository');
jest.mock('../timesheet/timesheet.repository');
jest.mock('../overtimePolicy/overtimePolicy.service');

const timeEntryRepo = jest.mocked(timeEntryRepository);
const userRepo = jest.mocked(userRepository);
const policyService = jest.mocked(overtimePolicyService);
const timesheetRepo = jest.mocked(timesheetRepository);

describe('hourBalanceService', () => {
  // Cadastrado em 21/09/2026: o banco é calculado a partir desse dia.
  const funcionario = buildUser({
    id: 'func-1',
    role: Role.FUNCIONARIO,
    createdAt: new Date('2026-09-21T12:00:00.000Z'),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    // "Hoje" dos testes: segunda 21/09/2026, 20:00 BRT.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T23:00:00.000Z'));
    userRepo.getOneUser.mockResolvedValue(funcionario);
    timeEntryRepo.getEntriesForUser.mockResolvedValue([]);
    policyService.getHolidayDateSet.mockResolvedValue(new Set());
    timesheetRepo.listWorkDays.mockResolvedValue([]);
  });

  afterEach(() => jest.useRealTimers());

  describe('getBalance', () => {
    it('deve devolver o saldo do banco e o detalhamento por dia', async () => {
      // Arrange: 9h trabalhadas numa jornada de 8h.
      timeEntryRepo.getEntriesForUser.mockResolvedValue(
        fullDay('2026-09-21', ['08:00', '12:00', '13:00', '18:00']),
      );

      // Act
      const result = await hourBalanceService.getBalance(
        funcionario,
        funcionario.id,
        {},
      );

      // Assert
      expect(result.currentBankBalanceMinutes).toBe(60);
      expect(result.days).toEqual([
        expect.objectContaining({
          date: '2026-09-21',
          workedMinutes: 540,
          balanceMinutes: 60,
          bankBalanceAfterMinutes: 60,
        }),
      ]);
    });

    it('deve calcular o banco só até o rangeEnd', async () => {
      // Arrange: "hoje" já passou do fim do período.
      jest.setSystemTime(new Date('2026-10-06T15:00:00.000Z'));

      // Act
      await hourBalanceService.getBalance(funcionario, funcionario.id, {
        rangeEnd: '09/30/2026',
      });

      // Assert
      expect(timesheetRepo.listWorkDays).toHaveBeenCalledWith(
        funcionario.id,
        new Date('2026-09-21T00:00:00.000Z'),
        new Date('2026-09-30T00:00:00.000Z'),
      );
    });

    it('deve lançar Forbidden quando o funcionário consulta o saldo de outro', async () => {
      // Act / Assert
      await expect(
        hourBalanceService.getBalance(funcionario, 'func-2', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFound quando o funcionário não existe', async () => {
      // Arrange
      const rh = buildUser({ id: 'rh-1', role: Role.RH });
      userRepo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(
        hourBalanceService.getBalance(rh, 'nao-existe', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequest quando a data do período é inválida', async () => {
      // Act / Assert
      await expect(
        hourBalanceService.getBalance(funcionario, funcionario.id, {
          rangeStart: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
