import { utilities, WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as dayjs from 'dayjs';

const currentDate = dayjs(new Date()).format('DD-MM-YYYY-HH-mm-ss');

export const winstonConfig: WinstonModuleOptions = {
  levels: winston.config.npm.levels,
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        utilities.format.nestLike(),
      ),
    }),
    new winston.transports.File({
      level: 'verbose',
      filename: `${currentDate}-app.log`,
      dirname: 'logs',
    }),
  ],
};
