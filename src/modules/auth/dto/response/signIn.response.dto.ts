import { ApiProperty } from '@nestjs/swagger';

export class SignInResponseDto {
  @ApiProperty({ example: 'token' })
  accessToken: string;
  @ApiProperty({ example: 'token' })
  refreshToken: string;
}
