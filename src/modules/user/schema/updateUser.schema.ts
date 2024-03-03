import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';
import { UpdateUserDto } from '../dto/updateUserDto';

export const validateUpdateUser = (body: UpdateUserDto) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(255).optional(),
    cpf: z.string().trim().min(11).max(255).optional(),
    phone: z.string().trim().min(9).max(255).optional(),
    password: z.string().trim().max(255),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
