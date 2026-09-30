import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NotificationController } from './notification.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [NotificationController],
})
export class NotificationModule {}
