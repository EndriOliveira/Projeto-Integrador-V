import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PushTokenDto } from '../dto/request/pushToken.dto';

export const validatePushToken = (body: PushTokenDto) => {
  const schema = z.object({
    token: z
      .string()
      .trim()
      .regex(/^Expo(nent)?PushToken\[.+\]$/, 'Token de push inválido'),
  });
  const validate = schema.safeParse(body);
  if (!validate['success'])
    throw new BadRequestException(validate['error'].issues);
};
