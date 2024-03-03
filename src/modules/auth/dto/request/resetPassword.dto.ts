import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  code: string;
  @ApiProperty()
  password: string;
  @ApiProperty()
  passwordConfirmation: string;
}
