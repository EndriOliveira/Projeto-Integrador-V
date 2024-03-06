import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { winstonConfig } from './config/winston.config';
import { WinstonInterceptor } from './interceptors/winston.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtStrategy } from './modules/auth/middleware/jwt.strategy';
import { JwtRefreshStrategy } from './modules/auth/middleware/jwtRefresh.strategy';
import { RefreshTokenModule } from './modules/refreshToken/refreshToken.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    RefreshTokenModule,
    ScheduleModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    WinstonModule.forRoot(winstonConfig),
  ],
  controllers: [AppController],
  providers: [
    JwtStrategy,
    JwtRefreshStrategy,
    { provide: APP_INTERCEPTOR, useClass: WinstonInterceptor },
  ],
})
export class AppModule {}
