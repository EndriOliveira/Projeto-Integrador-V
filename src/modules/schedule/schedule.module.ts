import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ScheduleController } from './schedule.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ScheduleController],
})
export class ScheduleModule {}
