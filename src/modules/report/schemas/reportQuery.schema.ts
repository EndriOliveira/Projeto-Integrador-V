import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { AllReportsQueryDto } from '../dto/request/allReportsQuery.dto';
import { ReportQueryDto } from '../dto/request/reportQuery.dto';

// Query strings chegam como texto: devolve year/month já convertidos.
export const validateReportQuery = (query: ReportQueryDto) => {
  const schema = z.object({
    userId: z.string().trim().min(1).max(255),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  });
  const validate = schema.safeParse(query);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
  return validate['data'];
};

export const validateAllReportsQuery = (query: AllReportsQueryDto) => {
  const schema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  });
  const validate = schema.safeParse(query);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
  return validate['data'];
};
