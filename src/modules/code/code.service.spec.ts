import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { buildUser } from '../../../test/factories';
import userService from '../user/user.service';
import codeRepository from './code.repository';
import codeService from './code.service';

jest.mock('./code.repository');
jest.mock('../user/user.service');

const repo = jest.mocked(codeRepository);

const NOW = new Date('2026-09-25T15:00:00.000Z');
const minutesAgo = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60 * 1000);

describe('codeService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    jest.mocked(userService.getUserById).mockResolvedValue(buildUser());
  });

  afterEach(() => jest.useRealTimers());

  describe('createCode', () => {
    it('deve desativar os códigos anteriores e criar um novo de 6 caracteres', async () => {
      // Arrange
      repo.getOneCode.mockResolvedValue(null);

      // Act
      const code = await codeService.createCode('user-1');

      // Assert
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(repo.updateManyCode).toHaveBeenCalledWith(
        { userId: 'user-1', active: true },
        { active: false },
      );
      expect(repo.createCode).toHaveBeenCalledWith({ userId: 'user-1', code });
    });

    it('deve gerar outro código quando o sorteado já está em uso', async () => {
      // Arrange
      repo.getOneCode
        .mockResolvedValueOnce({ id: 'c1' } as never)
        .mockResolvedValueOnce(null);

      // Act
      await codeService.createCode('user-1');

      // Assert
      expect(repo.getOneCode).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateCode', () => {
    it('deve aceitar e inativar o código quando tem menos de 60 minutos', async () => {
      // Arrange
      repo.getOneCode.mockResolvedValue({
        id: 'c1',
        userId: 'user-1',
        createdAt: minutesAgo(59),
      } as never);

      // Act
      const code = await codeService.validateCode('ABC123');

      // Assert
      expect(code.userId).toBe('user-1');
      expect(repo.updateManyCode).toHaveBeenCalledWith(
        { code: 'ABC123' },
        { active: false },
      );
    });

    it('deve lançar Unauthorized e inativar o código quando expirou', async () => {
      // Arrange
      repo.getOneCode.mockResolvedValue({
        id: 'c1',
        userId: 'user-1',
        createdAt: minutesAgo(60),
      } as never);

      // Act / Assert
      await expect(codeService.validateCode('ABC123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repo.updateManyCode).toHaveBeenCalled();
    });

    it('deve lançar NotFound quando o código não existe ou já foi usado', async () => {
      // Arrange
      repo.getOneCode.mockResolvedValue(null);

      // Act / Assert
      await expect(codeService.validateCode('XXXXXX')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
