import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ResetPasswordDto } from '../dto/request/resetPassword.dto';

export const validateResetPassword = (body: ResetPasswordDto) => {
  const schema = z.object({
    code: z.string().trim().max(255),
    password: z
      .string()
      .trim()
      .min(6)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
        'Password must have minimum six characters, at least one uppercase letter, one lowercase letter, one number and one special character',
      )
      .max(255),
    passwordConfirmation: z.string().trim().max(255),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
