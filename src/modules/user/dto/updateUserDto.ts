import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  cpf: string;
  @ApiProperty()
  phone: string;
  @ApiProperty()
  department: string;
  @ApiProperty()
  isHumanResources: boolean;
  @ApiProperty()
  birthDate: Date;
  @ApiProperty()
  password: string;
}
