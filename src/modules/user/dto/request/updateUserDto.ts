import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe' })
  name?: string;
  @ApiProperty({ example: '99999999999' })
  cpf?: string;
  @ApiProperty({ example: '999999999' })
  phone?: string;
  @ApiProperty({ example: 'Developer' })
  department?: string;
  @ApiProperty({ example: Role.FUNCIONARIO, enum: Role })
  role?: Role;
  @ApiProperty({ example: true })
  active?: boolean;
  @ApiProperty({ example: '01/31/2001' })
  birthDate?: string;
  @ApiProperty({
    required: false,
    description: 'Jornada diária prevista, em minutos',
  })
  dailyWorkMinutes?: number;
  @ApiProperty({
    required: false,
    description: 'Dias da semana trabalhados (1 = segunda ... 7 = domingo)',
    example: [1, 2, 3, 4, 5],
  })
  workWeekdays?: number[];
}
