import { ApiProperty } from '@nestjs/swagger';

export class PushTokenDto {
  @ApiProperty({
    description: 'Token do Expo Push do aparelho',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  token: string;
}
