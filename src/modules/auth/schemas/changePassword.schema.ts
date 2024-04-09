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
        'A senha deve ter no mínimo 6 caracteres, pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial',
      )
      .max(255),
    newPasswordConfirmation: z.string().trim().max(255),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
