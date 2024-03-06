import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import envConfig from './config/env.config';
import { winstonConfig } from './config/winston.config';
import prisma from './database/client';

async function bootstrap() {
  const logger = WinstonModule.createLogger(winstonConfig);
  const app = await NestFactory.create(AppModule, { logger, cors: true });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Projeto Integrador 5')
    .setDescription(
      `
        Documentação da API do Projeto Integrador 5 - SENAC/SP - 2024 - 5NC
        
        Autores:
        - Endrio Oliveira
        - Natalia Dinareli
        - Rael Souza
        - Raquel Aparecida
        - Vitor Manoel
      `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Refresh Token',
        in: 'header',
      },
      'JWT-refresh',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/', app, document, {
    swaggerOptions: {
      defaultModelsExpandDepth: -1,
    },
  });
  prisma
    .$connect()
    .then(async () => {
      logger.log('Connected to Database');
      await app.listen(envConfig.port);
    })
    .catch(() => {
      logger.error('Could not connect to Database');
    });
}
bootstrap();
