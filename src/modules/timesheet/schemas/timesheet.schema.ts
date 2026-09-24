import { BadRequestException } from '@nestjs/common';
import { HazardType } from '@prisma/client';
import { z } from 'zod';
import { PaidHoursQueryDto } from '../dto/request/paidHoursQuery.dto';
import { UpsertPaidHoursDto } from '../dto/request/upsertPaidHours.dto';
import { UpsertWorkDayDto } from '../dto/request/upsertWorkDay.dto';
import { WorkDayQueryDto } from '../dto/request/workDayQuery.dto';

const dateRegex =
  /^(?:(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])\/(?:29|30)|(?:0[13578]|1[02])\/31)\/[1-9]\d{3}|02\/29(?:\/[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00))$/m;

const userId = z.string().trim().min(1).max(255);
const minutes = z.number().int().min(0).max(100000);

const parse = <T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> => {
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
  return validate['data'];
};

// Query strings chegam como texto: devolvem os valores já convertidos.
export const validateWorkDayQuery = (query: WorkDayQueryDto) =>
  parse(
    z.object({
      userId,
      year: z.coerce.number().int().min(2000).max(2100),
      month: z.coerce.number().int().min(1).max(12),
    }),
    query,
  );

export const validatePaidHoursQuery = (query: PaidHoursQueryDto) =>
  parse(
    z.object({ userId, year: z.coerce.number().int().min(2000).max(2100) }),
    query,
  );

export const validateUpsertWorkDay = (body: UpsertWorkDayDto) =>
  parse(
    z.object({
      userId,
      date: z
        .string()
        .trim()
        .regex(dateRegex, 'Formato de Data Inválido. Use MM/DD/YYYY'),
      client: z.string().trim().max(255).nullable().optional(),
      project: z.string().trim().max(255).nullable().optional(),
      hazardType: z.nativeEnum(HazardType).nullable().optional(),
      rdoPending: z.boolean().optional(),
    }),
    body,
  );

export const validateUpsertPaidHours = (body: UpsertPaidHoursDto) =>
  parse(
    z.object({
      userId,
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
      paid60Minutes: minutes,
      paid70Minutes: minutes,
      paid100Minutes: minutes,
      locked: z.boolean(),
    }),
    body,
  );
