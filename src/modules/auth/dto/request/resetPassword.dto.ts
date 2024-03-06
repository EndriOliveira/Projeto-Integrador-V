import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'AbC!2024' })
  code: string;
  @ApiProperty({ example: 'P@SSW0Rd' })
  password: string;
  @ApiProperty({ example: 'P@SSW0Rd' })
  passwordConfirmation: string;
}
