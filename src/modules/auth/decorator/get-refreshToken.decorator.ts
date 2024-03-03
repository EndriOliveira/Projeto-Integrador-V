import { createParamDecorator } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';

export const GetRefreshToken = createParamDecorator((_, req): RefreshToken => {
  const refreshToken = req.args[0].user;
  return refreshToken;
});
