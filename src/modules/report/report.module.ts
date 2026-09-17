import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ReportController } from './report.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ReportController],
})
export class ReportModule {}
