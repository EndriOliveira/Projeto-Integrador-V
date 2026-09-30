import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ReviewTimeEntryDto } from '../dto/request/reviewTimeEntry.dto';

export const validateReviewTimeEntry = (body: ReviewTimeEntryDto) => {
  const schema = z
    .object({
      approved: z.boolean(),
      note: z.string().trim().max(500).optional(),
    })
    .refine((data) => data.approved || (data.note?.length ?? 0) >= 3, {
      message: 'Informe o motivo da recusa',
      path: ['note'],
    });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
