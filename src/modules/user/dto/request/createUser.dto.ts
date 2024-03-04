import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;
  @ApiProperty({ example: '99999999999' })
  cpf: string;
  @ApiProperty({ example: '999999999' })
  phone: string;
  @ApiProperty({ example: 'john.doe@email.com' })
  email: string;
  password?: string;
  @ApiProperty({ example: 'Developer' })
  department: string;
  @ApiProperty({ example: false })
  isHumanResources: boolean;
  @ApiProperty({ example: '01/31/2001' })
  birthDate: string;
}
