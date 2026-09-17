import { BadRequestException } from '@nestjs/common';
import { PunchType } from '@prisma/client';
import { z } from 'zod';
import { CreateTimeEntryDto } from '../dto/request/createTimeEntry.dto';

export const validateCreateTimeEntry = (body: CreateTimeEntryDto) => {
  const schema = z.object({
    type: z.nativeEnum(PunchType).optional(),
    deviceTimestamp: z.string().trim().datetime({ offset: true }).optional(),
    clientGeneratedId: z.string().trim().max(255).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationCapturedAt: z.string().trim().datetime({ offset: true }).optional(),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
