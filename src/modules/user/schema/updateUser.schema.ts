import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { UpdateUserDto } from '../dto/request/updateUserDto';

export const validateUpdateUser = (body: UpdateUserDto) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(255).optional(),
    cpf: z.string().trim().min(11).max(255).optional(),
    phone: z.string().trim().min(9).max(255).optional(),
    department: z.string().trim().max(255).optional(),
    isHumanResources: z.boolean().optional(),
    birthDate: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Invalid date format. Use MM/DD/YYYY',
      )
      .optional(),
    password: z.string().trim().max(255),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
