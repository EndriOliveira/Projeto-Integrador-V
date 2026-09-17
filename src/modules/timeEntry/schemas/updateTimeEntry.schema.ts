import { BadRequestException } from '@nestjs/common';
import { PunchType } from '@prisma/client';
import { z } from 'zod';
import { UpdateTimeEntryDto } from '../dto/request/updateTimeEntry.dto';

export const validateUpdateTimeEntry = (body: UpdateTimeEntryDto) => {
  const schema = z.object({
    type: z.nativeEnum(PunchType).optional(),
    deviceTimestamp: z.string().trim().datetime({ offset: true }).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    reason: z.string().trim().min(3).max(500),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
