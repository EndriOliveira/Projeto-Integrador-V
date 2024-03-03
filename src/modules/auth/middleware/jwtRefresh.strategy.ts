import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import refreshTokenService from 'src/modules/refreshToken/refreshToken.service';
import envConfig from '../../../config/env.config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: envConfig.jwt.refreshSecret,
      ignoreExpiration: true,
    });
  }

  async validate(payload) {
    const { id } = payload;
    return await refreshTokenService.getRefreshTokenById(id);
  }
}
