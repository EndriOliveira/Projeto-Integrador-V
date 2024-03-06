import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { CreateScheduleDto } from '../dto/request/createSchedule.dto';

export const validateCreateSchedule = (body: CreateScheduleDto) => {
  const schema = z.object({
    entryDate: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Invalid date format. Use MM/DD/YYYY',
      ),
    entryTime: z
      .string()
      .trim()
      .regex(
        /((?:(?:0|1)\d|2[0-3])):([0-5]\d)/m,
        'Invalid time format. Use HH:MM',
      ),
    exitDate: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Invalid date format. Use MM/DD/YYYY',
      ),
    exitTime: z
      .string()
      .trim()
      .regex(
        /((?:(?:0|1)\d|2[0-3])):([0-5]\d)/m,
        'Invalid time format. Use HH:MM',
      ),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
