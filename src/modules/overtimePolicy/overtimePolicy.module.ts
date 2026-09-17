import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OvertimePolicyController } from './overtimePolicy.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [OvertimePolicyController],
})
export class OvertimePolicyModule {}
