import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import envConfig from '../../config/env.config';
import { buildUser } from '../../../test/factories';
import { generateJwt, verifyJwt } from '../../utils/jwt';
import userService from '../user/user.service';
import refreshTokenRepository from './refreshToken.repository';
import refreshTokenService from './refreshToken.service';

jest.mock('./refreshToken.repository');
jest.mock('../user/user.service');

const repo = jest.mocked(refreshTokenRepository);

const refreshToken = {
  id: 'rt-1',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const validJwt = () =>
  generateJwt(envConfig.jwt.refreshSecret, { id: 'rt-1' }, '1d');

describe('refreshTokenService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(userService.getUserById).mockResolvedValue(buildUser());
  });

  describe('createRefreshToken', () => {
    it('deve gravar o token e devolver um JWT com o id dele', async () => {
      // Arrange
      repo.createRefreshToken.mockResolvedValue(refreshToken);

      // Act
      const token = await refreshTokenService.createRefreshToken('user-1');

      // Assert
      expect(verifyJwt(envConfig.jwt.refreshSecret, token)).toMatchObject({
        id: 'rt-1',
      });
    });
  });

  describe('getRefreshTokenById', () => {
    it('deve lançar NotFound quando o token não existe', async () => {
      // Arrange
      repo.getOneRefreshToken.mockResolvedValue(null);

      // Act / Assert
      await expect(
        refreshTokenService.getRefreshTokenById('x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createNewAccessToken', () => {
    it('deve devolver um novo access token quando o refresh é válido', async () => {
      // Arrange
      repo.getOneRefreshToken.mockResolvedValue(refreshToken);

      // Act
      const { accessToken } = await refreshTokenService.createNewAccessToken(
        refreshToken,
        validJwt(),
      );

      // Assert
      expect(verifyJwt(envConfig.jwt.accessSecret, accessToken)).toMatchObject({
        id: 'user-1',
      });
    });

    it('deve lançar Unauthorized quando o refresh token foi revogado', async () => {
      // Arrange
      repo.getOneRefreshToken.mockResolvedValue(null);

      // Act / Assert
      await expect(
        refreshTokenService.createNewAccessToken(refreshToken, validJwt()),
      ).rejects.toThrow('Refresh Token Inválido');
    });

    it('deve apagar o token e lançar Unauthorized quando o JWT expirou', async () => {
      // Arrange
      repo.getOneRefreshToken.mockResolvedValue(refreshToken);
      const expired = generateJwt(
        envConfig.jwt.refreshSecret,
        { id: 'rt-1' },
        '-1s',
      );

      // Act / Assert
      await expect(
        refreshTokenService.createNewAccessToken(refreshToken, expired),
      ).rejects.toThrow(UnauthorizedException);
      expect(repo.deleteOneRefreshToken).toHaveBeenCalledWith({ id: 'rt-1' });
    });

    it('deve apagar o token e lançar NotFound quando o usuário não existe', async () => {
      // Arrange
      repo.getOneRefreshToken.mockResolvedValue(refreshToken);
      jest.mocked(userService.getUserById).mockResolvedValue(null);

      // Act / Assert
      await expect(
        refreshTokenService.createNewAccessToken(refreshToken, validJwt()),
      ).rejects.toThrow(NotFoundException);
      expect(repo.deleteOneRefreshToken).toHaveBeenCalled();
    });
  });
});
