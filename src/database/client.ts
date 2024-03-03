import { PrismaClient } from '@prisma/client';
import envConfig from '../config/env.config';

interface CustomNodeJsGlobal extends Global {
  prisma: PrismaClient;
}

declare const global: CustomNodeJsGlobal;
const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      envConfig.env === 'development' ? ['query', 'error', 'info', 'warn'] : [],
  });

if (envConfig.env === 'development') global.prisma = prisma;
export default prisma;
