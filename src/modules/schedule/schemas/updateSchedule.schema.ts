import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { UpdateScheduleDto } from '../dto/request/updateSchedule.dto';

export const validateUpdateSchedule = (body: UpdateScheduleDto) => {
  const schema = z.object({
    entryDate: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Invalid date format. Use MM/DD/YYYY',
      )
      .optional(),
    entryTime: z
      .string()
      .trim()
      .regex(
        /((?:(?:0|1)\d|2[0-3])):([0-5]\d)/m,
        'Invalid time format. Use HH:MM',
      )
      .optional(),
    exitDate: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Invalid date format. Use MM/DD/YYYY',
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
