import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { CredentialsDto } from '../dto/request/credentials.dto';

export const validateSignIn = (body: CredentialsDto) => {
  const schema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().trim().max(255),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
