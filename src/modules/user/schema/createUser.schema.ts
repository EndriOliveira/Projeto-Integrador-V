import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { CreateUserDto } from '../dto/request/createUser.dto';

export const validateCreateUser = (body: CreateUserDto) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(255),
    cpf: z.string().trim().min(11).max(255),
    phone: z.string().trim().min(9).max(255),
    email: z.string().trim().email().max(255),
    department: z.string().trim().max(255),
    isHumanResources: z.boolean(),
    birthDate: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Invalid date format. Use MM/DD/YYYY',
      ),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
