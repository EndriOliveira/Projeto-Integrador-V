import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import envConfig from '../../../config/env.config';
import userService from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: envConfig.jwt.accessSecret,
    });
  }

  async validate(payload) {
    const { id } = payload;
    return await userService.getUserById(id);
  }
}
