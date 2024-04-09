import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';
import envConfig from '../../config/env.config';
import { generateJwt, verifyJwt } from '../../utils/jwt';
import userService from '../user/user.service';
import { NewAccessTokenResponseDto } from './dto/response/newAccessToken.response.dto';
import refreshTokenRepository from './refreshToken.repository';

const getRefreshTokenById = async (id: string): Promise<RefreshToken> => {
  const refreshToken = await refreshTokenRepository.getOneRefreshToken({
    id,
  });
  if (!refreshToken)
    throw new NotFoundException('Refresh Token Não Encontrado');

  return refreshToken;
};

const createRefreshToken = async (userId: string): Promise<string> => {
  const user = await userService.getUserById(userId);
  if (!user) throw new NotFoundException('Usuário Não Encontrado');

  const refreshToken = await refreshTokenRepository.createRefreshToken({
    userId,
  });

  const token = generateJwt(
    envConfig.jwt.refreshSecret,
    { id: refreshToken.id },
    envConfig.jwt.refreshExpirationTime,
  );
  return token;
};

const createNewAccessToken = async (
  refreshToken: RefreshToken,
  token: string,
): Promise<NewAccessTokenResponseDto> => {
  const { id, userId } = refreshToken;

  const refreshTokenExists = await refreshTokenRepository.getOneRefreshToken({
    id,
  });
  if (!refreshTokenExists)
    throw new UnauthorizedException('Refresh Token Inválido');

  try {
    verifyJwt(envConfig.jwt.refreshSecret, token);
  } catch {
    await refreshTokenRepository.deleteOneRefreshToken({ id });
    throw new UnauthorizedException('Refresh Token Expirado');
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    await refreshTokenRepository.deleteOneRefreshToken({ id });
    throw new NotFoundException('Usuário Não Encontrado');
  }

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
