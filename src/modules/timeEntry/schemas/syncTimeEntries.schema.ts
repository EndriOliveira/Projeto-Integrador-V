import { BadRequestException } from '@nestjs/common';
import { PunchType } from '@prisma/client';
import { z } from 'zod';
import { SyncTimeEntriesDto } from '../dto/request/syncTimeEntries.dto';

export const validateSyncTimeEntries = (body: SyncTimeEntriesDto) => {
  const schema = z.object({
    entries: z
      .array(
        z.object({
          clientGeneratedId: z.string().trim().min(1).max(255),
          type: z.nativeEnum(PunchType),
          deviceTimestamp: z.string().trim().datetime({ offset: true }),
          latitude: z.number().min(-90).max(90).optional(),
          longitude: z.number().min(-180).max(180).optional(),
          locationCapturedAt: z
            .string()
            .trim()
            .datetime({ offset: true })
            .optional(),
        }),
      )
      .min(1)
      .max(200),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
