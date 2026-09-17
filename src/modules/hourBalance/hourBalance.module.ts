import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { HourBalanceController } from './hourBalance.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [HourBalanceController],
})
export class HourBalanceModule {}
