import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { UpdateScheduleDto } from '../dto/request/updateSchedule.dto';

export const validateUpdateSchedule = (body: UpdateScheduleDto) => {
  const schema = z.object({
    entryTime: z
      .string()
      .trim()
      .regex(
        /((?:(?:0|1)\d|2[0-3])):([0-5]\d)/m,
        'Invalid time format. Use HH:MM',
      )
      .optional(),
    intervalEntryTime: z
      .string()
      .trim()
      .regex(
        /((?:(?:0|1)\d|2[0-3])):([0-5]\d)/m,
        'Invalid time format. Use HH:MM',
      )
      .optional(),
    intervalExitTime: z
      .string()
      .trim()
      .regex(
        /((?:(?:0|1)\d|2[0-3])):([0-5]\d)/m,
        'Invalid time format. Use HH:MM',
      )
      .optional(),
    exitTime: z
      .string()
      .trim()
      .regex(
        /((?:(?:0|1)\d|2[0-3])):([0-5]\d)/m,
        'Invalid time format. Use HH:MM',
      )
      .optional(),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
