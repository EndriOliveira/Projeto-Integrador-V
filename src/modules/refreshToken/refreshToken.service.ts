import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshToken } from '@prisma/client';
import envConfig from '../../config/env.config';
import { generateJwt, verifyJwt } from '../../utils/jwt';
import userService from '../user/user.service';
import { NewAccessTokenResponseDto } from './dto/response/newAccessToken.response.dto';
import refreshTokenRepository from './refreshToken.repository';

const getRefreshTokenById = async (id: string): Promise<RefreshToken> => {
  Logger.log(`Getting refresh token ${id}`, 'getRefreshTokenById');
  const refreshToken = await refreshTokenRepository.getOneRefreshToken({
    id,
  });
  if (!refreshToken) {
    Logger.error(`Refresh token not found`, 'getRefreshTokenById');
    throw new NotFoundException('Refresh Token Não Encontrado');
  }

  Logger.log(`Refresh token found`, 'getRefreshTokenById');
  return refreshToken;
};

const createRefreshToken = async (userId: string): Promise<string> => {
  Logger.log(`Creating refresh token for user ${userId}`, 'createRefreshToken');
  const user = await userService.getUserById(userId);
  if (!user) {
    Logger.error(`User ${userId} not found`, 'createRefreshToken');
    throw new NotFoundException('Usuário Não Encontrado');
  }
  const refreshToken = await refreshTokenRepository.createRefreshToken({
    userId,
  });

  const token = generateJwt(
    envConfig.jwt.refreshSecret,
    { id: refreshToken.id },
    envConfig.jwt.refreshExpirationTime,
  );
  Logger.log(`Refresh token created`, 'createRefreshToken');
  return token;
};

const createNewAccessToken = async (
  refreshToken: RefreshToken,
  token: string,
): Promise<NewAccessTokenResponseDto> => {
  Logger.log(`Creating new access token`, 'createNewAccessToken');
  const { id, userId } = refreshToken;

  const refreshTokenExists = await refreshTokenRepository.getOneRefreshToken({
    id,
  });
  if (!refreshTokenExists) {
    Logger.error(`Refresh Token not found`, 'createNewAccessToken');
    throw new UnauthorizedException('Refresh Token Inválido');
  }

  try {
    Logger.log(`Verifying refresh token`, 'createNewAccessToken');
    verifyJwt(envConfig.jwt.refreshSecret, token);
  } catch {
    await refreshTokenRepository.deleteOneRefreshToken({ id });
    Logger.error(`Refresh Token Expired`, 'createNewAccessToken');
    throw new UnauthorizedException('Refresh Token Expirado');
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    await refreshTokenRepository.deleteOneRefreshToken({ id });
    Logger.error(`User not found`, 'createNewAccessToken');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  Logger.log(`Access token created`, 'createNewAccessToken');
  return {
    accessToken: generateJwt(
      envConfig.jwt.accessSecret,
      { id: user.id },
      envConfig.jwt.accessExpirationTime,
    ),
  };
};

const refreshTokenService = {
  getRefreshTokenById,
  createRefreshToken,
  createNewAccessToken,
};
export default refreshTokenService;
