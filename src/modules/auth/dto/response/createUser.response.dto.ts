import { ApiProperty } from '@nestjs/swagger';

export class CreateUserResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: 'John Doe' })
  name: string;
  @ApiProperty({ example: '99999999999' })
  cpf: string;
  @ApiProperty({ example: '999999999' })
  phone: string;
  @ApiProperty({ example: 'john.doe@email.com' })
  email: string;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  birthDate: Date;
  @ApiProperty({ example: 'Developer' })
  department: string;
  @ApiProperty({ example: false })
  isHumanResources: boolean;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
