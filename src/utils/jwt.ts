import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtPayload, sign, verify } from 'jsonwebtoken';

export const generateJwt = (
  secret: string,
  payload: object,
  expiresIn: string,
): string => {
  Logger.log('Generating JWT', 'generateJwt');
  return sign(payload, secret, {
    expiresIn,
  });
};

export const verifyJwt = (
  secret: string,
  token: string,
): string | JwtPayload => {
  try {
    Logger.log('Verifying JWT', 'verifyJwt');
    return verify(token, secret);
  } catch (error) {
    Logger.error(error.message, 'verifyJwt');
    throw new UnauthorizedException('Token Inválido');
  }
};
