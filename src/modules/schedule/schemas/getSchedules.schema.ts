import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { FindSchedulesQueryDto } from '../dto/request/getSchedulesQuery.dto';

export const validateGetSchedules = (body: FindSchedulesQueryDto) => {
  const schema = z.object({
    rangeStart: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Formato de Data Inválido. Use MM/DD/YYYY',
      ),
    rangeEnd: z
      .string()
      .trim()
      .regex(
        /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m,
        'Formato de Data Inválido. Use MM/DD/YYYY',
      ),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
