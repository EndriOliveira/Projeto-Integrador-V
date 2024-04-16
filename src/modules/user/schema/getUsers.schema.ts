import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { FindUsersQueryDto } from '../dto/request/findUsersQuery.dto';

export const validateGetUsers = (body: FindUsersQueryDto) => {
  const schema = z.object({
    limit: z.string().min(1).max(100),
    page: z.string().min(1),
    sortBy: z.enum(['email', 'name', 'createdAt']).optional(),
    sortType: z.enum(['asc', 'desc']).optional(),
    search: z.string().max(255).optional(),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
