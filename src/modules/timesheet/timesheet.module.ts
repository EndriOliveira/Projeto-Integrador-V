import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TimesheetController } from './timesheet.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [TimesheetController],
})
export class TimesheetModule {}
