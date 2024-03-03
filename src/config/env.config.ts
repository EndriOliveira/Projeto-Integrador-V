import * as dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

const envVarsSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'homolog', 'production'])
    .default('development'),
  PORT: z.string().default('3000'),
  JWT_ACCESS_TOKEN_SECRET: z.string().default('secret'),
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: z.string().default('30m'),
  JWT_REFRESH_TOKEN_SECRET: z.string().default('secret'),
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: z.string().default('1d'),
  DATABASE_URL: z.string(),
  SENDGRID_API_KEY: z.string(),
  SENDGRID_EMAIL: z.string().email(),
  FRONTEND_URL: z.string().url(),
});

const result = envVarsSchema.safeParse(process.env);
if (!result.success) throw new Error(result['error']);

export default {
  env: result.data.NODE_ENV,
  port: result.data.PORT,
  jwt: {
    accessSecret: result.data.JWT_ACCESS_TOKEN_SECRET,
    accessExpirationTime: result.data.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    refreshSecret: result.data.JWT_REFRESH_TOKEN_SECRET,
    refreshExpirationTime: result.data.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
  },
  databaseUrl: result.data.DATABASE_URL,
  sendGrid: {
    key: result.data.SENDGRID_API_KEY,
    email: result.data.SENDGRID_EMAIL,
  },
  frontendUrl: result.data.FRONTEND_URL,
};
