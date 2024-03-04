import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { FindUsersQueryDto } from '../dto/request/findUsersQuery.dto';

export const validateGetUsers = (body: FindUsersQueryDto) => {
  const schema = z.object({
    active: z.string().max(255).optional(),
    limit: z.string().min(1).max(100),
    page: z.string().min(1),
    sortBy: z
      .enum(['cpf', 'email', 'name', 'createdAt', 'updatedAt'])
      .optional(),
    sortType: z.enum(['asc', 'desc']).optional(),
    cpf: z.string().max(255).optional(),
    email: z.string().email().max(255).optional(),
    name: z.string().max(255).optional(),
    phone: z.string().max(255).optional(),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
