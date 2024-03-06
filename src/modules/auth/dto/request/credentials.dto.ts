import { ApiProperty } from '@nestjs/swagger';

export class CredentialsDto {
  @ApiProperty({ example: 'john.doe@email.com' })
  email: string;
  @ApiProperty({ example: 'P@SSW0Rd' })
  password: string;
}
