import { ApiProperty } from '@nestjs/swagger';

export class NewAccessTokenResponseDto {
  @ApiProperty({ example: 'token' })
  accessToken: string;
}
