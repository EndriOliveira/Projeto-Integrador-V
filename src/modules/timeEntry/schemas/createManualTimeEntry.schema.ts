import { BadRequestException } from '@nestjs/common';
import { PunchType } from '@prisma/client';
import { z } from 'zod';
import { CreateManualTimeEntryDto } from '../dto/request/createManualTimeEntry.dto';

export const validateCreateManualTimeEntry = (
  body: CreateManualTimeEntryDto,
) => {
  const schema = z.object({
    type: z.nativeEnum(PunchType),
    deviceTimestamp: z.string().trim().datetime({ offset: true }),
    reason: z.string().trim().min(3).max(500),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
