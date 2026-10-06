import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DayType } from '@prisma/client';
import { buildPolicy } from '../../../test/factories';
import overtimePolicyRepository from './overtimePolicy.repository';
import overtimePolicyService from './overtimePolicy.service';

jest.mock('./overtimePolicy.repository');

const repo = jest.mocked(overtimePolicyRepository);

const holiday = (date: string, name = 'Feriado') => ({
  id: `holiday-${date}`,
  date: new Date(`${date}T00:00:00.000Z`),
  name,
  createdAt: new Date(),
});

describe('overtimePolicyService', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('updateOvertimePolicy', () => {
    it('deve atualizar o percentual quando a regra existe', async () => {
      // Arrange
      repo.getOneOvertimePolicy.mockResolvedValue(buildPolicy());

      // Act
      await overtimePolicyService.updateOvertimePolicy(DayType.WEEKDAY, {
        percentage: 0.7,
      });

      // Assert
      expect(repo.updateOvertimePolicy).toHaveBeenCalledWith(DayType.WEEKDAY, {
        percentage: 0.7,
      });
    });

    it('deve lançar NotFound quando a regra não existe', async () => {
      // Arrange
      repo.getOneOvertimePolicy.mockResolvedValue(null);

      // Act / Assert
      await expect(
        overtimePolicyService.updateOvertimePolicy(DayType.SATURDAY, {
          active: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequest quando o percentual passa de 500%', async () => {
      // Act / Assert
      await expect(
        overtimePolicyService.updateOvertimePolicy(DayType.WEEKDAY, {
          percentage: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createHoliday', () => {
    it('deve criar o feriado quando a data ainda não está cadastrada', async () => {
      // Arrange
      repo.listHolidays.mockResolvedValue([holiday('2026-09-07')]);

      // Act
      await overtimePolicyService.createHoliday({
        date: '11/02/2026',
        name: 'Finados',
      });

      // Assert
      expect(repo.createHoliday).toHaveBeenCalledWith({
        date: new Date('2026-11-02T00:00:00.000Z'),
        name: 'Finados',
      });
    });

    it('deve lançar Conflict quando já existe feriado na data', async () => {
      // Arrange
      repo.listHolidays.mockResolvedValue([holiday('2026-11-02')]);

      // Act / Assert
      await expect(
        overtimePolicyService.createHoliday({
          date: '11/02/2026',
          name: 'Finados',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.createHoliday).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando o nome é curto demais', async () => {
      // Act / Assert
      await expect(
        overtimePolicyService.createHoliday({ date: '11/02/2026', name: 'F' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getHolidayDateSet', () => {
    it('deve devolver as datas dos feriados no formato YYYY-MM-DD', async () => {
      // Arrange
      repo.listHolidays.mockResolvedValue([
        holiday('2026-09-07'),
        holiday('2026-11-02'),
      ]);

      // Act
      const dates = await overtimePolicyService.getHolidayDateSet();

      // Assert
      expect([...dates]).toEqual(['2026-09-07', '2026-11-02']);
    });
  });
});
