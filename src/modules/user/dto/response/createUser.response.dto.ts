import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

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
  @ApiProperty({ example: Role.FUNCIONARIO, enum: Role })
  role: Role;
  @ApiProperty({ example: true })
  active: boolean;
  @ApiProperty({ example: 480 })
  dailyWorkMinutes: number;
  @ApiProperty({ example: [1, 2, 3, 4, 5] })
  workWeekdays: number[];
  @ApiProperty({ example: null, nullable: true })
  managerId: string | null;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
