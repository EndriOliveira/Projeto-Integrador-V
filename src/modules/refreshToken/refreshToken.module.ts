import { Module } from '@nestjs/common';
import { RefreshTokenController } from './refreshToken.controller';

@Module({
  controllers: [RefreshTokenController],
})
export class RefreshTokenModule {}
