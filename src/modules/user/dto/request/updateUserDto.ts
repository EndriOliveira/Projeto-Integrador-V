import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe' })
  name?: string;
  @ApiProperty({ example: '99999999999' })
  cpf?: string;
  @ApiProperty({ example: '999999999' })
  phone?: string;
  @ApiProperty({ example: 'Developer' })
  department?: string;
  @ApiProperty({ example: false })
  isHumanResources?: boolean;
  @ApiProperty({ example: '01/31/2001' })
  birthDate?: string;
}
