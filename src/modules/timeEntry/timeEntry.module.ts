import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TimeEntryController } from './timeEntry.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [TimeEntryController],
})
export class TimeEntryModule {}
