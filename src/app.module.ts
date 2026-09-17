import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { CronService } from './common/cron/cron.service';
import { winstonConfig } from './config/winston.config';
import { WinstonInterceptor } from './interceptors/winston.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtStrategy } from './modules/auth/middleware/jwt.strategy';
import { JwtRefreshStrategy } from './modules/auth/middleware/jwtRefresh.strategy';
import { HourBalanceModule } from './modules/hourBalance/hourBalance.module';
import { OvertimePolicyModule } from './modules/overtimePolicy/overtimePolicy.module';
import { RefreshTokenModule } from './modules/refreshToken/refreshToken.module';
import { ReportModule } from './modules/report/report.module';
import { TimeEntryModule } from './modules/timeEntry/timeEntry.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    RefreshTokenModule,
    TimeEntryModule,
    HourBalanceModule,
    OvertimePolicyModule,
    ReportModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    WinstonModule.forRoot(winstonConfig),
  ],
  controllers: [AppController],
  providers: [
    JwtStrategy,
    JwtRefreshStrategy,
    { provide: APP_INTERCEPTOR, useClass: WinstonInterceptor },
    CronService,
  ],
})
export class AppModule {}
