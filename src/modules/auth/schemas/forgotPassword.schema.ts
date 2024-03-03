import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ForgotPasswordDto } from '../dto/request/forgotPassword.dto';

export const validateForgotPassword = (body: ForgotPasswordDto) => {
  const schema = z.object({
    email: z.string().trim().email().max(255),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
