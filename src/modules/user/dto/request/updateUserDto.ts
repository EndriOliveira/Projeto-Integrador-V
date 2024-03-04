import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  // TODO: Apenas recursos humanos podem alterar o usuário
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
  @ApiProperty({ example: 'Password!123' })
  password: string;
}
