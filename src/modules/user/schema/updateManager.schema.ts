import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { UpdateManagerDto } from '../dto/request/updateManager.dto';

export const validateUpdateManager = (body: UpdateManagerDto) => {
  const schema = z.object({
    managerId: z.string().trim().max(255).nullable(),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
