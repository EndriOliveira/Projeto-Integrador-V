import { UnauthorizedException } from '@nestjs/common';
import { sign, verify, JwtPayload } from 'jsonwebtoken';

export const generateJwt = (
  secret: string,
  payload: object,
  expiresIn: string,
): string => {
  return sign(payload, secret, {
    expiresIn,
  });
};

export const verifyJwt = (
  secret: string,
  token: string,
): string | JwtPayload => {
  try {
    return verify(token, secret);
  } catch (error) {
    throw new UnauthorizedException('Invalid Refresh Token');
  }
};
