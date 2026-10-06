import { Logger } from '@nestjs/common';

// Variáveis exigidas pelo env.config: os testes não dependem de um .env local.
// NODE_ENV: o Jest define 'test', que o schema do env.config não aceita.
const testEnv: Record<string, string> = {
  NODE_ENV: 'homolog',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  FRONTEND_URL: 'http://localhost:5173',
  JWT_ACCESS_TOKEN_SECRET: 'test-access-secret',
  JWT_REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  HUMAN_RESOURCES_NAME: 'RH Teste',
  HUMAN_RESOURCES_EMAIL: 'rh@teste.com',
  HUMAN_RESOURCES_PASSWORD: 'Senha@123',
  HUMAN_RESOURCES_CPF: '52998224725',
  HUMAN_RESOURCES_PHONE: '11999999999',
  HUMAN_RESOURCES_BIRTH_DATE: '01/01/1990',
  HUMAN_RESOURCES_DEPARTMENT: 'RH',
};
for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}

// Os serviços logam cada passo; nos testes isso só polui a saída.
Logger.overrideLogger(false);
