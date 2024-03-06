import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'P@SSW0Rd' })
  password: string;
  @ApiProperty({ example: 'P@SSW0Rd2' })
  newPassword: string;
  @ApiProperty({ example: 'P@SSW0Rd2' })
  newPasswordConfirmation: string;
}
