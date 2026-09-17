import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { DeleteTimeEntryDto } from '../dto/request/deleteTimeEntry.dto';

export const validateDeleteTimeEntry = (body: DeleteTimeEntryDto) => {
  const schema = z.object({
    reason: z.string().trim().min(3).max(500),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
