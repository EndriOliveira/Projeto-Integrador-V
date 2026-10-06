import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PunchType } from '@prisma/client';
import { buildTimeEntry, buildUser } from '../../../test/factories';
import { encryptPassword, verifyPassword } from '../../utils/encryption';
import codeService from '../code/code.service';
import refreshTokenRepository from '../refreshToken/refreshToken.repository';
import refreshTokenService from '../refreshToken/refreshToken.service';
import timeEntryRepository from '../timeEntry/timeEntry.repository';
import userRepository from '../user/user.repository';
import userService from '../user/user.service';
import { authService } from './auth.service';

jest.mock('../../utils/encryption');
jest.mock('../code/code.service');
jest.mock('../refreshToken/refreshToken.repository');
jest.mock('../refreshToken/refreshToken.service');
jest.mock('../timeEntry/timeEntry.repository');
jest.mock('../user/user.repository');
jest.mock('../user/user.service');

const userRepo = jest.mocked(userRepository);
const timeEntryRepo = jest.mocked(timeEntryRepository);
const refreshRepo = jest.mocked(refreshTokenRepository);

const refreshToken = {
  id: 'rt-1',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const strongPassword = 'Nova@123';

describe('authService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(encryptPassword).mockResolvedValue('novo-hash');
    jest
      .mocked(refreshTokenService.createRefreshToken)
      .mockResolvedValue('refresh-jwt');
  });

  describe('signIn', () => {
    const credentials = { email: 'maria@empresa.com', password: 'Senha@123' };

    it('deve devolver access e refresh token quando as credenciais estão corretas', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(buildUser());
      jest.mocked(verifyPassword).mockResolvedValue(true);

      // Act
      const tokens = await authService.signIn(credentials);

      // Assert
      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toBe('refresh-jwt');
    });

    it('deve lançar Unauthorized quando o e-mail não está cadastrado', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(authService.signIn(credentials)).rejects.toThrow(
        'Credenciais Inválidas',
      );
    });

    it('deve lançar Unauthorized quando o usuário está inativo', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(buildUser({ active: false }));

      // Act / Assert
      await expect(authService.signIn(credentials)).rejects.toThrow(
        'Usuário Inativo',
      );
    });

    it('deve lançar Unauthorized quando a senha está errada', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(buildUser());
      jest.mocked(verifyPassword).mockResolvedValue(false);

      // Act / Assert
      await expect(authService.signIn(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar BadRequest quando o e-mail é inválido', async () => {
      // Act / Assert
      await expect(
        authService.signIn({ ...credentials, email: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('me', () => {
    it('deve devolver o usuário com as marcações de hoje e o próximo tipo esperado', async () => {
      // Arrange
      const user = buildUser();
      const todayEntries = [buildTimeEntry({ type: PunchType.ENTRADA })];
      timeEntryRepo.getEntriesInRange.mockResolvedValue(todayEntries);
      timeEntryRepo.countTodayEntries.mockResolvedValue(1);

      // Act
      const me = await authService.me(user);

      // Assert
      expect(me).toMatchObject({
        id: user.id,
        todayEntries,
        nextExpectedType: PunchType.INTERVALO_ENTRADA,
      });
    });
  });

  describe('logout', () => {
    it('deve apagar o refresh token', async () => {
      // Arrange
      refreshRepo.getOneRefreshToken.mockResolvedValue(refreshToken);
      jest.mocked(userService.getUserById).mockResolvedValue(buildUser());

      // Act
      const result = await authService.logout(refreshToken);

      // Assert
      expect(refreshRepo.deleteOneRefreshToken).toHaveBeenCalledWith({
        id: 'rt-1',
      });
      expect(result.message).toBe('Efetuou o logout com sucesso');
    });

    it('deve lançar Unauthorized quando o refresh token não existe mais', async () => {
      // Arrange
      refreshRepo.getOneRefreshToken.mockResolvedValue(null);

      // Act / Assert
      await expect(authService.logout(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve apagar o token e lançar NotFound quando o usuário não existe', async () => {
      // Arrange
      refreshRepo.getOneRefreshToken.mockResolvedValue(refreshToken);
      jest.mocked(userService.getUserById).mockResolvedValue(null);

      // Act / Assert
      await expect(authService.logout(refreshToken)).rejects.toThrow(
        NotFoundException,
      );
      expect(refreshRepo.deleteOneRefreshToken).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('deve gerar um código quando o e-mail está cadastrado', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(buildUser());
      jest.mocked(codeService.createCode).mockResolvedValue('ABC123');

      // Act
      await authService.forgotPassword({ email: 'maria@empresa.com' });

      // Assert
      expect(codeService.createCode).toHaveBeenCalledWith('user-1');
    });

    it('deve responder a mesma mensagem sem gerar código quando o e-mail não existe', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(null);

      // Act
      const result = await authService.forgotPassword({ email: 'x@y.com' });

      // Assert
      expect(codeService.createCode).not.toHaveBeenCalled();
      expect(result.message).toContain('Verifique seu e-mail');
    });
  });

  describe('resetPassword', () => {
    it('deve trocar a senha do dono do código', async () => {
      // Arrange
      jest
        .mocked(codeService.validateCode)
        .mockResolvedValue({ userId: 'user-1' } as never);

      // Act
      await authService.resetPassword({
        code: 'ABC123',
        password: strongPassword,
        passwordConfirmation: strongPassword,
      });

      // Assert
      expect(userRepo.updateUser).toHaveBeenCalledWith('user-1', {
        password: 'novo-hash',
      });
    });

    it('deve lançar BadRequest quando a confirmação não confere', async () => {
      // Act / Assert
      await expect(
        authService.resetPassword({
          code: 'ABC123',
          password: strongPassword,
          passwordConfirmation: 'Outra@123',
        }),
      ).rejects.toThrow('Senhas não são iguais');
    });

    it('deve lançar BadRequest quando a senha é fraca', async () => {
      // Act / Assert
      await expect(
        authService.resetPassword({
          code: 'ABC123',
          password: 'fraca',
          passwordConfirmation: 'fraca',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    const body = {
      password: 'Senha@123',
      newPassword: strongPassword,
      newPasswordConfirmation: strongPassword,
    };

    it('deve trocar a senha quando a senha atual confere', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(buildUser());
      jest.mocked(verifyPassword).mockResolvedValue(true);

      // Act
      const user = await authService.changePassword('user-1', body);

      // Assert
      expect(userRepo.updateUser).toHaveBeenCalledWith('user-1', {
        password: 'novo-hash',
      });
      expect(user).not.toHaveProperty('password');
    });

    it('deve lançar Unauthorized quando a senha atual está errada', async () => {
      // Arrange
      userRepo.getOneUser.mockResolvedValue(buildUser());
      jest.mocked(verifyPassword).mockResolvedValue(false);

      // Act / Assert
      await expect(authService.changePassword('user-1', body)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepo.updateUser).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando a confirmação da nova senha não confere', async () => {
      // Act / Assert
      await expect(
        authService.changePassword('user-1', {
          ...body,
          newPasswordConfirmation: 'Outra@123',
        }),
      ).rejects.toThrow('Senhas não são iguais');
    });
  });
});
