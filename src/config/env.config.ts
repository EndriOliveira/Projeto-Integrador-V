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
  HUMAN_RESOURCES_NAME: z.string(),
  HUMAN_RESOURCES_EMAIL: z.string().email(),
  HUMAN_RESOURCES_PASSWORD: z.string(),
  HUMAN_RESOURCES_CPF: z.string(),
  HUMAN_RESOURCES_PHONE: z.string(),
  HUMAN_RESOURCES_BIRTH_DATE: z
    .string()
    .regex(
      /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
      'Invalid date format. Use MM/DD/YYYY',
    ),
  HUMAN_RESOURCES_DEPARTMENT: z.string(),
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
  humanResources: {
    name: result.data.HUMAN_RESOURCES_NAME,
    email: result.data.HUMAN_RESOURCES_EMAIL,
    password: result.data.HUMAN_RESOURCES_PASSWORD,
    cpf: result.data.HUMAN_RESOURCES_CPF,
    phone: result.data.HUMAN_RESOURCES_PHONE,
    birthDate: result.data.HUMAN_RESOURCES_BIRTH_DATE,
    department: result.data.HUMAN_RESOURCES_DEPARTMENT,
  },
};
