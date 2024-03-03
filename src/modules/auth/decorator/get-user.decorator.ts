import { createParamDecorator } from '@nestjs/common';
import { User } from '@prisma/client';

export const GetUser = createParamDecorator((_, req): User => {
  const user = req.args[0].user;
  return user;
});
