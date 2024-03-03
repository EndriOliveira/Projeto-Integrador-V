import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ChangePasswordDto } from '../dto/request/changePassword.dto';

export const validateChangePassword = (body: ChangePasswordDto) => {
  const schema = z.object({
    password: z.string().trim().max(255),
    newPassword: z
      .string()
      .trim()
      .min(6)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
        'Password must have minimum 6 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character',
      )
      .max(255),
    newPasswordConfirmation: z.string().trim().max(255),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
