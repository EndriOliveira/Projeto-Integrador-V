import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { UpdateOvertimePolicyDto } from '../dto/request/updateOvertimePolicy.dto';

export const validateUpdateOvertimePolicy = (body: UpdateOvertimePolicyDto) => {
  const schema = z.object({
    percentage: z.number().min(0).max(5).optional(),
    active: z.boolean().optional(),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
