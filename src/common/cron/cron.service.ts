import { Injectable, Logger } from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as cron from 'node-cron';
import codeRepository from '../../modules/code/code.repository';
import refreshTokenRepository from '../../modules/refreshToken/refreshToken.repository';

@Injectable()
export class CronService {
  constructor() {
    this.initializeCronJobs();
  }

  private initializeCronJobs() {
    cron.schedule('0 0 * * *', async () => {
      Logger.log('Running cron job', 'initializeCronJobs');
      await refreshTokenRepository.deleteManyRefreshToken({
        createdAt: { lte: dayjs().subtract(8, 'hour').toDate() },
      });
      await codeRepository.deleteManyCode({
        createdAt: { lte: dayjs().subtract(60, 'minutes').toDate() },
      });
    });
  }
}
