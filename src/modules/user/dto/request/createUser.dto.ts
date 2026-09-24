import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

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
  @ApiProperty({ example: Role.FUNCIONARIO, enum: Role })
  role: Role;
  @ApiProperty({ example: '01/31/2001' })
  birthDate: string;
  @ApiProperty({
    required: false,
    description: 'Id do gestor responsável pelo funcionário',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  managerId?: string;
  @ApiProperty({
    required: false,
    description: 'Jornada diária prevista, em minutos',
    default: 480,
  })
  dailyWorkMinutes?: number;
  @ApiProperty({
    required: false,
    description: 'Dias da semana trabalhados (1 = segunda ... 7 = domingo)',
    example: [1, 2, 3, 4, 5],
  })
  workWeekdays?: number[];
  @ApiProperty({ required: false, example: '12.345.678-9' })
  rg?: string;
  @ApiProperty({
    required: false,
    description: 'Nº de registro',
    example: '1234',
  })
  registrationNumber?: string;
  @ApiProperty({
    required: false,
    description: 'Data de admissão',
    example: '09/22/2023',
  })
  admissionDate?: string;
}
